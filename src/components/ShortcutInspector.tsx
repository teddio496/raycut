import { ArrowUpRight, X } from 'lucide-react';
import { comboLabel, keyLabel, mask, type Modifier } from '../lib/keyboard';
import type { Keymap, Shortcut } from '../lib/raycast';
import { ShortcutIcon } from './ShortcutIcon';

interface Props {
  keymap: Keymap;
  modifiers: Modifier[];
  selected: number | null;
  onSelect: (shortcut: Shortcut) => void;
  onClear: () => void;
}

function webDestination(value?: string): string | undefined {
  if (!value || /\{[^}]*\}/.test(value)) return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
  } catch { /* Other destinations remain readable without being executable links. */ }
}

export function ShortcutInspector({ keymap, modifiers, selected, onSelect, onClear }: Props) {
  const layer = mask(modifiers);
  const assigned = keymap.shortcuts.filter(s => mask(s.modifiers) === layer);
  const matches = assigned.filter(s => s.keyCode === selected);
  const elsewhere = selected === null ? [] : keymap.shortcuts.filter(s => s.keyCode === selected && mask(s.modifiers) !== layer);
  const list = selected === null ? assigned : elsewhere;
  return <section className="shortcut-inspector" aria-label="Shortcut inspector">
    <div className="overview-heading">
      <h2>{selected === null ? 'Assigned shortcuts' : 'Shortcut details'}</h2>
      <div className="inspector-heading-actions">
        <kbd>{comboLabel(modifiers)}{selected === null ? '' : ` ${keyLabel(selected)}`}</kbd>
        {selected !== null && <button className="icon-button" aria-label="Clear selected key" onClick={onClear}><X size={14}/></button>}
      </div>
    </div>
    <div className="inspector-body" aria-live="polite">
      {selected !== null && matches.length > 0 ? <>
        {matches.length > 1 && <p className="inspector-note">{matches.length} assignments share this combination.</p>}
        {matches.map(shortcut => {
          const href = webDestination(shortcut.destination);
          return <article className="inspector-card" key={shortcut.id}>
            <div className="inspector-title"><span className={`detail-icon ${shortcut.category}`}><ShortcutIcon shortcut={shortcut} size={22}/></span><div><h3>{shortcut.title}</h3><span>{shortcut.source}{shortcut.nameInferred ? ' · Inferred name' : ''}</span></div></div>
            {shortcut.destination ? <div className="inspector-destination"><span className="destination-label">Destination</span><code>{shortcut.destination}</code>{href && <a className="open-destination" href={href} target="_blank" rel="noopener noreferrer">Open link<ArrowUpRight size={14}/></a>}</div> : shortcut.category === 'link' && <p className="inspector-note">Destination not included in this export.</p>}
          </article>;
        })}
      </> : <>
        {selected !== null && <p className="inspector-note">Unassigned here.{elsewhere.length > 0 ? ' This key is used in:' : ' No other combinations use this key.'}</p>}
        {selected === null && list.length === 0 && <p className="inspector-note">No shortcuts in this combination.</p>}
        <div className="inspector-list">{list.map(shortcut => <button key={shortcut.id} onClick={() => onSelect(shortcut)}><ShortcutIcon shortcut={shortcut} size={16}/><span>{shortcut.title}</span><kbd>{comboLabel(shortcut.modifiers)} {keyLabel(shortcut.keyCode)}</kbd></button>)}</div>
      </>}
    </div>
  </section>;
}
