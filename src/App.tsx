import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Check, CircleHelp, Command, RotateCcw, Search, X } from 'lucide-react';
import { Keyboard, type Filter } from './components/Keyboard';
import { ShortcutIcon } from './components/ShortcutIcon';
import { ImportDialog } from './components/ImportDialog';
import { LayerOverview } from './components/LayerOverview';
import { ASSIGNABLE_KEYS, KEYS, comboLabel, fromMask, keyLabel, mask, type Modifier } from './lib/keyboard';
import type { Keymap, Shortcut } from './lib/raycast';
import demoData from './data/demo.json';
const demo = demoData as Keymap;
const defaultShortcut = demo.shortcuts.find(s => s.category === 'link' && s.title.toLowerCase() === 'chatgpt');
const MAC_DEFAULTS: Array<[number,string]> = [[0,'Select all'],[8,'Copy'],[7,'Cut'],[9,'Paste'],[3,'Find'],[4,'Hide app'],[6,'Minimize'],[45,'New'],[31,'Open'],[35,'Print'],[12,'Quit'],[1,'Save'],[17,'New tab'],[13,'Close'],[6,'Undo'],[15,'Reload'],[37,'Address bar'],[40,'Link / command'],[18,'Tab 1'],[19,'Tab 2'],[20,'Tab 3'],[21,'Tab 4'],[23,'Tab 5'],[22,'Tab 6'],[26,'Tab 7'],[28,'Tab 8'],[25,'Tab 9']];
const demoWithMacDefaults: Keymap = { ...demo, shortcuts: [...demo.shortcuts, ...MAC_DEFAULTS.filter(([key]) => !demo.shortcuts.some(s => s.keyCode === key && mask(s.modifiers) === mask(['command']))).map(([key,title],i) => ({ id:`mac-default-${i}`, keyCode:key, modifiers:['command' as Modifier], title, category:'command' as const, source:'Mac default' }))] };
const CATEGORY_LABELS = { window:'Windows',app:'Apps',link:'Links',command:'Raycast' };
function fullestLayer(map:Keymap):Modifier[] { const counts=new Map<number,number>();for(const s of map.shortcuts){const m=mask(s.modifiers);counts.set(m,(counts.get(m)||0)+1);}return fromMask([...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]??0); }
export default function App() {
  const [finish,setFinish]=useState('silver');
  const [personal,setPersonal]=useState<Keymap|null>(null);
  const [view,setView]=useState<'demo'|'personal'>('demo');
  const keymap=view==='personal'&&personal?personal:demoWithMacDefaults;
  const [modifiers,setModifiers]=useState<Modifier[]>(defaultShortcut?.modifiers ?? fullestLayer(demoWithMacDefaults));
  const [filter,setFilter]=useState<Filter>('all');
  const [selected,setSelected]=useState<number|null>(defaultShortcut?.keyCode ?? null);
  const [importOpen,setImportOpen]=useState(location.pathname==='/import');
  const [searchOpen,setSearchOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [help,setHelp]=useState(false);
  const [notice,setNotice]=useState('');
  const searchInput=useRef<HTMLInputElement>(null);
  const importTrigger=useRef<HTMLButtonElement>(null);
  const activeMask=mask(modifiers);
  const bindings=useMemo(()=>{const result=new Map<number,Shortcut[]>();for(const s of keymap.shortcuts){if(mask(s.modifiers)===activeMask)result.set(s.keyCode,[...(result.get(s.keyCode)||[]),s]);}return result;},[keymap,activeMask]);
  const availableCodes=new Set(ASSIGNABLE_KEYS.map(k=>k.code));
  const assigned=[...bindings.keys()].filter(c=>availableCodes.has(c)).length;
  const outside=keymap.shortcuts.filter(s=>!KEYS.some(k=>k.code===s.keyCode&&!k.modifier&&k.code!==63));
  const results=useMemo(()=>query.trim()?keymap.shortcuts.filter(s=>`${s.title} ${s.source} ${keyLabel(s.keyCode)}`.toLowerCase().includes(query.trim().toLowerCase())):[],[keymap,query]);
  useEffect(()=>{const pop=()=>setImportOpen(location.pathname==='/import');window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
  useEffect(()=>{if(searchOpen)searchInput.current?.focus();},[searchOpen]);
  useEffect(()=>{function keydown(e:KeyboardEvent){if(e.key==='Escape'&&!importOpen){setSearchOpen(false);setSelected(null);setHelp(false);}}window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown);},[importOpen]);
  function openImport(){history.pushState({},'','/import');setImportOpen(true);}
  function closeImport(){history.replaceState({},'','/');setImportOpen(false);requestAnimationFrame(()=>importTrigger.current?.focus());}
  function changeLayer(next:Modifier[]){setModifiers(next);setSelected(null);}
  function toggle(m:Modifier){changeLayer(modifiers.includes(m)?modifiers.filter(v=>v!==m):[...modifiers,m]);}
  useEffect(()=>{
    const observed=new Set<Modifier>();
    const modifierForKey=(event:KeyboardEvent):Modifier|undefined=>{
      switch(event.code){
        case 'MetaLeft': case 'MetaRight': return 'command';
        case 'AltLeft': case 'AltRight': return 'option';
        case 'ControlLeft': case 'ControlRight': return 'control';
        case 'ShiftLeft': case 'ShiftRight': return 'shift';
      }
      switch(event.key){
        case 'Meta': return 'command';
        case 'Alt': case 'AltGraph': return 'option';
        case 'Control': return 'control';
        case 'Shift': return 'shift';
        default: return undefined;
      }
    };
    const sync=(event:KeyboardEvent)=>{
      const target=event.target;
      if(importOpen || event.isComposing || (target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'))) {
        observed.clear();
        return;
      }
      if(event.repeat) return;
      const pressed=modifierForKey(event);
      if(!pressed) return;
      const next:Modifier[]=[];
      if(event.ctrlKey) next.push('control');
      if(event.altKey) next.push('option');
      if(event.shiftKey) next.push('shift');
      if(event.metaKey) next.push('command');
      if(event.type==='keydown') {
        if(!next.includes(pressed)) next.push(pressed);
        for(const modifier of next) observed.add(modifier);
        changeLayer(next);
        // Keep a lone Alt press from transferring focus to browser menu UI.
        if(pressed==='option' && next.length===1) event.preventDefault();
      } else {
        // A host may deliver keyup without keydown. Recover that press once;
        // ordinary releases must never replace the user's latched combination.
        const missedPress=!observed.has(pressed) || next.some(modifier=>!observed.has(modifier));
        if(missedPress) changeLayer(next.includes(pressed)?next:[...next,pressed]);
        observed.clear();
        for(const modifier of next) observed.add(modifier);
      }
    };
    const reset=()=>observed.clear();
    window.addEventListener('keydown',sync,true);
    window.addEventListener('keyup',sync,true);
    window.addEventListener('blur',reset);
    return()=>{
      window.removeEventListener('keydown',sync,true);
      window.removeEventListener('keyup',sync,true);
      window.removeEventListener('blur',reset);
    };
  },[importOpen]);
  function changeView(next:'demo'|'personal'){setView(next);changeLayer(next==='demo'&&defaultShortcut?defaultShortcut.modifiers:fullestLayer(next==='personal'&&personal?personal:demoWithMacDefaults));setSelected(next==='demo'?(defaultShortcut?.keyCode??null):null);setQuery('');setFilter('all');setNotice('');}
  function jump(s:Shortcut){setModifiers(s.modifiers);setSelected(s.keyCode);setFilter('all');setSearchOpen(false);setQuery('');}
  function imported(map:Keymap){setPersonal(map);setView('personal');changeLayer(fullestLayer(map));setQuery('');setFilter('all');setNotice(map.shortcuts.length?`${map.shortcuts.length} shortcuts imported`:'No assigned shortcuts in this export.');closeImport();}
  return <div className="app-shell" data-finish={finish}>
    <header className="topbar"><a href="/" className="brand" onClick={e=>{e.preventDefault();changeView('demo');if(importOpen)closeImport();}}><span className="brand-icon"><Command size={21} strokeWidth={1.8}/></span>RayCut</a>
      <div className="top-actions"><div className="finish-picker" aria-label="MacBook finish">{[['silver','Silver'],['space-black','Space Black'],['midnight','Midnight'],['starlight','Starlight']].map(([value,label])=><button key={value} className={`finish-swatch finish-${value}`} title={label} aria-label={`${label} finish`} aria-pressed={finish===value} onClick={()=>setFinish(value)}/>)}</div><button ref={importTrigger} className="import-button" onClick={openImport}><ArrowDownToLine size={15}/>Import yours<ArrowRight className="import-arrow" size={15}/></button></div>
    </header>
    <main>
      <LayerOverview keymap={keymap} modifiers={modifiers} selected={selected} onLayer={changeLayer} onSelect={jump} onClear={()=>setSelected(null)}/>
      <section className="workspace" aria-label="Shortcut explorer">
        <div className="workspace-toolbar"><div className="view-controls"><div className="segmented view-switch"><button className={view==='demo'?'chosen':''} onClick={()=>changeView('demo')}>Teddio’s keys</button><button className={view==='personal'?'chosen':''} onClick={()=>personal?changeView('personal'):openImport()}>Your keys{!personal&&<span>↗</span>}</button></div><span className="layout-label">MacBook · US</span></div>
          <div className="utility-actions"><span className="shortcut-total">{keymap.shortcuts.length} shortcuts</span><button className={`icon-button ${searchOpen?'engaged':''}`} aria-label="Search shortcuts" aria-expanded={searchOpen} onClick={()=>setSearchOpen(!searchOpen)}><Search size={18}/></button><button className={`icon-button ${help?'engaged':''}`} aria-label="How to use RayCut" aria-expanded={help} onClick={()=>setHelp(!help)}><CircleHelp size={18}/></button></div>
        </div>
        {help&&<div className="help-panel"><div><strong>Click a modifier. Find your space.</strong><p>Combine ⌃ ⌥ ⇧ ⌘ to see exact matches. Click any key for details.</p><p>Empty means unassigned in this Raycast export. macOS and other apps may still use it.</p></div><button className="icon-button" aria-label="Close help" onClick={()=>setHelp(false)}><X size={17}/></button></div>}
        {searchOpen&&<div className="search-panel"><div className="search-field"><Search size={18}/><input ref={searchInput} placeholder="Find a shortcut…" aria-label="Find a shortcut" value={query} onChange={e=>setQuery(e.target.value)}/><button className="icon-button" aria-label="Close search" onClick={()=>setSearchOpen(false)}><X size={17}/></button></div>{query.trim()&&<div className="search-results">{results.length?results.map(s=><button key={s.id} onClick={()=>jump(s)}><span className={`result-icon ${s.category}`}><ShortcutIcon shortcut={s}/></span><span>{s.title}<small>{s.source}</small></span><kbd>{comboLabel(s.modifiers)} {keyLabel(s.keyCode)}</kbd></button>):<p>No shortcuts found.</p>}</div>}</div>}
        <div className="layer-toolbar"><div className="active-layer"><kbd className="current-combo" aria-label="Active modifiers">{comboLabel(modifiers)}</kbd><button className="reset-button" aria-label="Clear modifiers" title="Clear modifiers" onClick={()=>changeLayer([])} disabled={!modifiers.length}><RotateCcw size={15}/></button></div><div className="layer-stats" aria-live="polite"><span><i className="dot assigned-dot"/><b>{assigned}</b> assigned</span><span><i className="dot empty-dot"/><b>{ASSIGNABLE_KEYS.length-assigned}</b> open</span></div></div>
        <Keyboard modifiers={modifiers} bindings={bindings} filter={filter} selected={selected} onToggle={toggle} onSelect={code=>setSelected(selected===code?null:code)}/>
        <div className="keyboard-bottom"><div className="category-legend">{Object.entries(CATEGORY_LABELS).map(([c,label])=><span key={c}><i className={`dot ${c}`}/>{label}</span>)}</div><div className="filter-controls" aria-label="Filter keys">{(['all','assigned','unassigned'] as Filter[]).map(f=><button key={f} className={filter===f?'selected-filter':''} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='all'?'All keys':f==='assigned'?'Assigned':'Open'}</button>)}</div></div>
      </section>
      {notice&&<div className="notice" role="status"><Check size={15}/>{notice}<button aria-label="Dismiss notification" className="icon-button" onClick={()=>setNotice('')}><X size={14}/></button></div>}
      {(keymap.warnings.length>0||outside.length>0)&&<details className="import-notes"><summary>{keymap.warnings.length+outside.length} import notes</summary>{keymap.warnings.map((w,i)=><p key={i}>{w}</p>)}{outside.map(s=><p key={s.id}>{comboLabel(s.modifiers)} {keyLabel(s.keyCode)} — {s.title} (outside this layout)</p>)}</details>}
      {!keymap.shortcuts.length&&<p className="empty-state">This export has no assigned shortcuts. <button onClick={openImport}>Try another export</button></p>}
    </main>
    {importOpen&&<ImportDialog onClose={closeImport} onImport={imported}/>}
  </div>;
}
