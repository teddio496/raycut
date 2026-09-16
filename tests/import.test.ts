import { describe,it,expect } from 'vitest';
import { createCipheriv,createHash,randomBytes,scryptSync } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { decodeRayconfig,extractKeymap,importRayconfig,parseHotkey } from '../src/lib/raycast';
import { ASSIGNABLE_KEYS,KEYS,mask } from '../src/lib/keyboard';
import demo from '../src/data/demo.json';
const payload={raycast_version:'1.104.29',builtin_package_rootSearch:{rootSearch:[{key:'com.example.Editor',type:'systemApp',path:'/Applications/Editor.app',hotkey:'Option-0'},{key:'builtin_command_windowManagementTopLeftQuarter',type:'command',hotkey:'Shift-Option-13'},{key:'raycastQuicklink_test',type:'quicklink',hotkey:'Control-Command-12'}]},raycast_user_activity:{activityInfo:[{key:'raycastQuicklink_test',title:'Docs'}]},builtin_package_raycastPreferences:{preferencesGeneral:{raycastGlobalHotkey:'Command-49'}},secret:'must never reach the keymap'};
function classic(value:unknown=passwordPayload(),password='test-password') { const iv=randomBytes(16),key=createHash('sha256').update(password).digest(),cipher=createCipheriv('aes-256-cbc',key,iv);return Buffer.concat([iv,cipher.update(gzipSync(JSON.stringify(value))),cipher.final()]); }
function passwordPayload(){return payload;}
const modern={settings:{general:{globalHotkey:{kind:{shortcut:{key:{type:'LayoutIndependent',code:49},modifiers:[{modifier:'Meta'}]}}}},commands:[{id:'window-left',title:'Left Half',extensionId:'e:r:window-management',macosHotkey:{kind:{shortcut:{key:{type:'LayoutIndependent',code:0},modifiers:[{modifier:'Alt'}]}}}}]}};
function gcm(version:2|3) { const iv=randomBytes(16),salt=randomBytes(16),cipher=createCipheriv('aes-256-gcm',scryptSync('test-password',salt,32),iv);const ciphertext=Buffer.concat([cipher.update(gzipSync(JSON.stringify(modern))),cipher.final()]),tag=cipher.getAuthTag();if(version===2)return gzipSync(JSON.stringify({data:ciphertext.toString('hex'),encryption:{iv:iv.toString('hex'),salt:salt.toString('hex'),authTag:tag.toString('hex')}}));const header=gzipSync(JSON.stringify({schemaVersion:3,iv:iv.toString('hex'),salt:salt.toString('hex')}));const length=Buffer.alloc(4);length.writeUInt32LE(header.length);return Buffer.concat([Buffer.from('RAYCFG3\n'),length,header,ciphertext,tag]); }
describe('Raycast decoder',()=>{
 it('decrypts a classic export with Node-generated AES-CBC bytes',async()=>{expect(await decodeRayconfig(classic(),'test-password')).toEqual(payload);});
 it('reads a legacy unencrypted gzip export',async()=>{expect(await decodeRayconfig(gzipSync(JSON.stringify(payload)))).toEqual(payload);});
 it.each([2,3] as const)('decrypts authenticated format %i',async(version)=>{expect(await decodeRayconfig(gcm(version),'test-password')).toEqual(modern);});
 it('rejects missing and incorrect passwords',async()=>{const bytes=classic();await expect(decodeRayconfig(bytes)).rejects.toMatchObject({code:'password'});await expect(decodeRayconfig(bytes,'wrong')).rejects.toMatchObject({code:'password'});});
 it('rejects tampered authenticated ciphertext',async()=>{const bytes=gcm(3);bytes[bytes.length-1]^=1;await expect(decodeRayconfig(bytes,'test-password')).rejects.toMatchObject({code:'password'});});
 it('rejects truncated and unrecognized files',async()=>{await expect(importRayconfig(new Uint8Array([1,2,3]))).rejects.toMatchObject({code:'format'});await expect(importRayconfig(gzipSync('{"hello":"world"}'))).rejects.toMatchObject({code:'format'});});
 it('rejects corrupt v3 framing before decrypting',async()=>{const bytes=gcm(3);bytes.writeUInt32LE(0xffffffff,8);await expect(decodeRayconfig(bytes,'test-password')).rejects.toMatchObject({code:'format'});});
});
describe('shortcut extraction',()=>{
 it('extracts app, command, quicklink, and global bindings with no unrelated data',()=>{const map=extractKeymap(payload);expect(map.shortcuts).toHaveLength(4);expect(map.shortcuts.map(s=>s.title)).toEqual(['Editor','Top Left Quarter','Docs','Raycast']);expect(JSON.stringify(map)).not.toContain('secret');expect(JSON.stringify(map)).not.toContain('/Applications');});
 it('extracts modern commands and the global shortcut',()=>{expect(extractKeymap(modern).shortcuts.map(s=>s.title)).toEqual(['Left Half','Raycast']);});
 it('does not weaken unknown modifier combinations',()=>{expect(parseHotkey('Option-Hyper-0')).toBeNull();expect(parseHotkey({kind:{shortcut:{key:{type:'LayoutIndependent',code:0},modifiers:[{modifier:'Fn'}]}}})).toBeNull();});
 it('keeps exact modifier combinations separate',()=>{expect(mask(parseHotkey('Option-0')!.modifiers)).not.toBe(mask(parseHotkey('Shift-Option-0')!.modifiers));});
 it('reports unsupported bindings while preserving valid ones',()=>{const map=extractKeymap({...payload,builtin_package_rootSearch:{rootSearch:[{key:'test',hotkey:'Fn-0'}]}});expect(map.warnings).toHaveLength(1);expect(map.shortcuts).toHaveLength(1);});
 it('preserves conflicting assignments',()=>{const map=extractKeymap({raycast_version:'1',builtin_package_rootSearch:{rootSearch:[{key:'one',title:'One',hotkey:'Option-0'},{key:'two',title:'Two',hotkey:'Option-0'}]}});expect(map.shortcuts).toHaveLength(2);});
 it('handles exports with no hotkeys',()=>{expect(extractKeymap({raycast_version:'1'}).shortcuts).toEqual([]);});
 it('loads all 18 real demo shortcuts on supported keys',()=>{expect(demo.shortcuts).toHaveLength(18);expect(demo.shortcuts.every(s=>KEYS.some(k=>k.code===s.keyCode))).toBe(true);expect(new Set(ASSIGNABLE_KEYS.map(k=>k.code)).size).toBe(ASSIGNABLE_KEYS.length);});
});
