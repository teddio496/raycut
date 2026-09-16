import type { CSSProperties } from 'react';
import { ROWS, SYMBOLS, keyLabel, type KeySpec, type Modifier } from '../lib/keyboard';
import type { Shortcut } from '../lib/raycast';
import { ShortcutIcon } from './ShortcutIcon';
export type Filter = 'all' | 'assigned' | 'unassigned';
interface Props { modifiers: Modifier[]; bindings: Map<number,Shortcut[]>; filter: Filter; selected: number|null; onToggle: (m:Modifier)=>void; onSelect:(code:number)=>void }
export function Keyboard({ modifiers, bindings, filter, selected, onToggle, onSelect }:Props) {
  function renderKey(key:KeySpec) {
    const entries = bindings.get(key.code) || [];
    const active = key.modifier && modifiers.includes(key.modifier);
    const dim = !key.modifier && ((filter === 'assigned' && !entries.length) || (filter === 'unassigned' && entries.length > 0));
    const isTouch = key.code === -1;
    const name = key.modifier ? `${key.label}${key.code===54||key.code===60||key.code===61?' right':''}` : keyLabel(key.code);
    return <button key={key.code} type="button" className={['key',key.small?'function-key':'',key.modifier?'modifier':'',active?'active':'',entries.length?`assigned ${entries[0].category}`:'',dim?'dim':'',selected===key.code?'selected':'',key.code===49?'space-key':''].join(' ')} style={{'--key-units':key.width ?? 1} as CSSProperties} disabled={isTouch || key.code===63} aria-label={key.modifier?`Select ${name}`:`${name}: ${entries.length?entries.map(e=>e.title).join(', '):isTouch?'Touch ID':'unassigned in Raycast'}`} aria-pressed={key.modifier?Boolean(active):selected===key.code} title={key.modifier?`Select ${key.label} state`:entries.map(e=>e.title).join(' · ') || (isTouch?'Touch ID':key.code===63?'Function key':'Unassigned in Raycast')} onClick={()=>key.modifier?onToggle(key.modifier):onSelect(key.code)}>
      <span className="key-legend">{key.modifier?<><span className="modifier-symbol">{SYMBOLS[key.modifier]}</span><span className="modifier-name">{key.label}</span></>:key.label}</span>
      {entries.length>0 && <span className="key-binding"><ShortcutIcon shortcut={entries[0]} size={19}/><span>{entries[0].title}</span></span>}
      {entries.length>1 && <span className="duplicate">{entries.length}</span>}
      {(key.code===3||key.code===38)&&<span className="home-mark"/>}
    </button>;
  }
  return <div className="keyboard-scroll" tabIndex={0} role="region" aria-label="MacBook US keyboard. Scroll horizontally on smaller screens."><div className="keyboard" data-testid="keyboard">
    {ROWS.map((row,index)=><div className={`key-row row-${index}`} key={index}>{row.map(key=>key.code===126?<div className="arrow-stack" key="arrows">{renderKey(key)}{renderKey({code:125,label:'↓'})}</div>:renderKey(key))}</div>)}
  </div></div>;
}
