import { scryptAsync } from '@noble/hashes/scrypt';
import { MODIFIERS, type Modifier } from './keyboard.ts';
export type Category = 'window' | 'app' | 'link' | 'command';
export interface Shortcut { id: string; keyCode: number; modifiers: Modifier[]; title: string; category: Category; source: string; nameInferred?: boolean; destination?: string }
export interface Keymap { name: string; shortcuts: Shortcut[]; warnings: string[]; version?: string }
type Obj = Record<string, unknown>;
const object = (v: unknown): Obj => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Obj : {};
const array = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const str = (v: unknown): string => typeof v === 'string' ? v : '';
export const MAX_FILE_SIZE = 64 * 1024 * 1024;
const MAX_EXPANDED_SIZE = 256 * 1024 * 1024;
const utf8 = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const buffer = (bytes: Uint8Array) => new Uint8Array(bytes).buffer;
const isGzip = (b: Uint8Array) => b[0] === 31 && b[1] === 139 && b[2] === 8;
export class ImportError extends Error { code: 'password' | 'format' | 'size'; constructor(message: string, code: 'password' | 'format' | 'size' = 'format') { super(message); this.name = 'ImportError'; this.code = code; } }
async function gunzip(bytes: Uint8Array, limit = MAX_EXPANDED_SIZE): Promise<Uint8Array> {
  const reader = new Blob([buffer(bytes)]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) { const {done,value} = await reader.read(); if (done) break; length += value.length;
      if (length > limit) { await reader.cancel(); throw new ImportError('This export expands beyond the 256 MB limit. Export settings only.', 'size'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const out = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { out.set(chunk,offset); offset += chunk.length; } return out;
}
function json(bytes: Uint8Array): Obj {
  try { const value: unknown = JSON.parse(decoder.decode(bytes)); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(); return object(value); }
  catch { throw new ImportError('The export contains unreadable data. Try exporting it again.'); }
}
function hex(v: unknown, size?: number): Uint8Array {
  if (typeof v !== 'string' || !/^(?:[a-f\d]{2})+$/i.test(v) || (size && v.length !== size * 2)) throw new ImportError('The encrypted export header is invalid.');
  return Uint8Array.from(v.match(/../g)!, b=>parseInt(b,16));
}
async function decryptGcm(ciphertext: Uint8Array, iv: Uint8Array, salt: Uint8Array, password: string) {
  if (!password) throw new ImportError('Enter the export password to unlock this file.', 'password');
  const derived = await scryptAsync(utf8.encode(password), salt, {N:16384,r:8,p:1,dkLen:32});
  try {
    const key = await crypto.subtle.importKey('raw',buffer(derived),'AES-GCM',false,['decrypt']);
    return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:buffer(iv)},key,buffer(ciphertext)));
  } catch { throw new ImportError('Couldn’t unlock this export. Check the password or choose a fresh export.', 'password'); }
  finally { derived.fill(0); }
}
export async function decodeRayconfig(bytes: Uint8Array, password = ''): Promise<Obj> {
  if (bytes.length > MAX_FILE_SIZE) throw new ImportError('Choose an export smaller than 64 MB. Export settings only to reduce its size.', 'size');
  if (new TextDecoder().decode(bytes.subarray(0,8)) === 'RAYCFG3\n') {
    if (bytes.length < 32) throw new ImportError('This export is incomplete.');
    const headerLength = new DataView(buffer(bytes)).getUint32(8,true);
    if (headerLength < 1 || headerLength > 1024*1024 || 12+headerLength+16 >= bytes.length) throw new ImportError('The export header is invalid.');
    const header = json(await gunzip(bytes.subarray(12,12+headerLength),1024*1024));
    if (header.schemaVersion !== 3) throw new ImportError('This export version is not supported yet.');
    const plain = await decryptGcm(bytes.subarray(12+headerLength),hex(header.iv,16),hex(header.salt,16),password);
    return json(await gunzip(plain));
  }
  if (isGzip(bytes)) {
    const envelope = json(await gunzip(bytes));
    if (envelope.encryption) {
      const enc = object(envelope.encryption); const ciphertext = hex(envelope.data); const tag = hex(enc.authTag,16);
      const combined = new Uint8Array(ciphertext.length+tag.length); combined.set(ciphertext); combined.set(tag,ciphertext.length);
      return json(await gunzip(await decryptGcm(combined,hex(enc.iv),hex(enc.salt),password)));
    }
    return envelope;
  }
  if (bytes.length < 32 || bytes.length % 16 !== 0) throw new ImportError('This isn’t a supported .rayconfig file. Choose a Raycast settings export.');
  if (!password) throw new ImportError('Enter the export password to unlock this file.', 'password');
  let decrypted: Uint8Array;
  try {
    const digest = await crypto.subtle.digest('SHA-256',utf8.encode(password));
    const key = await crypto.subtle.importKey('raw',digest,'AES-CBC',false,['decrypt']);
    decrypted = new Uint8Array(await crypto.subtle.decrypt({name:'AES-CBC',iv:buffer(bytes.subarray(0,16))},key,buffer(bytes.subarray(16))));
    if (!isGzip(decrypted)) throw new Error();
  } catch { throw new ImportError('Couldn’t unlock this export. Check the password or choose a fresh export.', 'password'); }
  return json(await gunzip(decrypted));
}
const modifierNames: Record<string,Modifier> = {command:'command',cmd:'command',meta:'command',option:'option',alt:'option',control:'control',ctrl:'control',shift:'shift'};
export function parseHotkey(raw: unknown): {keyCode:number;modifiers:Modifier[]} | null {
  let code: unknown; let names: unknown[];
  if (typeof raw === 'string') { const parts = raw.split('-'); code=Number(parts.pop()); names=parts; if (!raw || !/\d+$/.test(raw)) return null; }
  else { const shortcut=object(object(object(raw).kind).shortcut); const key=object(shortcut.key); if (key.type!=='LayoutIndependent') return null; code=key.code; names=array(shortcut.modifiers).map(v=>object(v).modifier); }
  if (!Number.isInteger(code) || Number(code)<0) return null;
  const mods = names.map(n=>modifierNames[str(n).toLowerCase()]);
  if (mods.some(m=>!m)) return null;
  return {keyCode:Number(code),modifiers:MODIFIERS.filter(m=>mods.includes(m))};
}
const humanize = (s: string) => s.replace(/([a-z\d])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim().replace(/^./,c=>c.toUpperCase());
function fallbackName(id: string, type: string, path: string): string {
  if (type==='quicklink' || /raycastQuicklink/.test(id)) return 'Quicklink';
  if (type==='systemApp' || id.includes('::=::')) { if (id==='com.openai.codex') return 'Codex'; const p=path || id.split('::=::')[1] || ''; return p.split('/').pop()?.replace(/\.app$/,'') || humanize(id.split('.').pop() || 'Application'); }
  return humanize(id.replace(/^builtin_command_/, '').replace(/^windowManagement/,'').replace(/^e:r:/,'').split('::=::')[0]) || 'Command';
}
export function extractKeymap(payload: unknown, name = 'Your shortcuts'): Keymap {
  const root=object(payload); const settings=object(root.settings);
  if (!('raycast_version' in root) && !('builtin_package_rootSearch' in root) && !('builtin_package_raycastPreferences' in root) && !('settings' in root)) throw new ImportError('No Raycast settings were found in this file.');
  const shortcuts: Shortcut[]=[]; const warnings: string[]=[];
  const names=new Map<string,string>();
  for (const entry of array(object(root.raycast_user_activity).activityInfo)) { const e=object(entry); if (str(e.key)&&str(e.title)) names.set(str(e.key),str(e.title)); }
  for (const entry of array(object(root.builtin_package_quicklinks).quicklinks)) { const e=object(entry); if(str(e.id)&&str(e.name)) names.set(`raycastQuicklink_${e.id}`,str(e.name)); }
  const add=(e:Obj,raw:unknown,id:string,type:string,index:number)=>{
    if (raw===undefined || raw===null || raw==='') return;
    const hotkey=parseHotkey(raw);
    if(!hotkey){warnings.push(`An unsupported shortcut for ${fallbackName(id,type,'')} was not mapped.`);return;}
    const storedName=str(e.title)||str(e.name)||names.get(id);
    const title=(storedName || fallbackName(id,type,str(e.path))).slice(0,160);
    const category:Category=/windowManagement|window-management/.test(id+str(e.extensionId))?'window':type==='systemApp'||str(e.extensionId)==='e:r:applications'?'app':type==='quicklink'||/quicklink/i.test(id+str(e.extensionId))?'link':'command';
    const source=category==='window'?'Window Management':category==='app'?'Applications':category==='link'?'Quicklinks':'Raycast';
    const destination=category==='link'?(str(e.url)||str(e.link)||str(e.path)):'';
    let resolvedTitle=title;
    if(destination&&!storedName&&title==='Quicklink') {
      try { const host=new URL(destination).hostname;resolvedTitle=host==='q.utoronto.ca'?'Quercus':host.replace(/^www\./,'')||title; } catch { /* Keep the neutral name for non-URL quicklinks. */ }
    }
    shortcuts.push({id:`shortcut-${index}-${shortcuts.length}`, ...hotkey,title:resolvedTitle,category,source,...(destination?{destination}:{}),...(!storedName&&category!=='app'?{nameInferred:true}:{})});
  };
  for (const [i,entry] of array(object(root.builtin_package_rootSearch).rootSearch).entries()) { const e=object(entry);add(e,e.hotkey,str(e.key),str(e.type),i); }
  for (const [i,entry] of array(settings.commands).entries()) { const e=object(entry);add(e,e.macosHotkey,str(e.id),str(e.extensionId)==='e:r:applications'?'systemApp':'command',i); }
  const prefs=object(root.builtin_package_raycastPreferences);
  const global=object(prefs.preferencesGeneral).raycastGlobalHotkey ?? object(settings.general).globalHotkey;
  add({title:'Raycast'},global,'global','command',-1);
  return {name,shortcuts,warnings,version:str(root.raycast_version)||str(root.appVersion)||undefined};
}
export async function importRayconfig(bytes:Uint8Array,password='',name='Your shortcuts') { try{return extractKeymap(await decodeRayconfig(bytes,password),name);}catch(error){if(error instanceof ImportError)throw error;throw new ImportError('This export couldn’t be read. Try exporting your settings again.');} }
