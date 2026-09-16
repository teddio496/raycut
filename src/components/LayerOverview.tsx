import { comboLabel, fromMask, mask, type Modifier } from '../lib/keyboard';
import type { Keymap, Shortcut } from '../lib/raycast';
import { ShortcutInspector } from './ShortcutInspector';
const PREFERENCE = [2, 8, 1, 4, 6, 3, 10, 9, 12, 5, 7, 11, 14, 13, 15, 0];

interface Props {
  keymap: Keymap;
  modifiers: Modifier[];
  selected: number | null;
  onLayer: (modifiers: Modifier[]) => void;
  onSelect: (shortcut: Shortcut) => void;
  onClear: () => void;
}

export function LayerOverview({ keymap, modifiers, selected, onLayer, onSelect, onClear }: Props) {
  const active = mask(modifiers);
  const counts = Array.from({ length: 16 }, (_, layer) =>
    keymap.shortcuts.filter(shortcut => mask(shortcut.modifiers) === layer).length);
  // Favor easy chords, then the user's actual assignments within each group.
  const layers = [...PREFERENCE].filter(layer => {
    const mods = fromMask(layer);
    return mods.length > 0 && !(mods.length === 1 && mods[0] === 'shift');
  }).sort((a, b) => {
    if (a === 0 || b === 0) return a === 0 ? 1 : -1;
    return fromMask(a).length - fromMask(b).length || counts[b] - counts[a] || PREFERENCE.indexOf(a) - PREFERENCE.indexOf(b);
  });

  return <section className="overview" aria-label="Combinations and shortcut details">
    <div className="combination-section">
      <div className="overview-heading"><h2>Combinations</h2><span>Shortcut counts below</span></div>
      <div className="combination-buttons">
        {layers.map(layer => <button key={layer} className={`combination-key ${active === layer ? 'is-active' : ''}`} aria-pressed={active === layer} aria-label={`${layer ? fromMask(layer).join(' + ') : 'No modifiers'}: ${counts[layer]} shortcuts`} onClick={() => onLayer(fromMask(layer))}>
          <span className="combination-symbols">{layer ? comboLabel(fromMask(layer)) : '—'}</span>
          <span className="combination-count">{counts[layer]}</span>
        </button>)}
      </div>
    </div>
    <ShortcutInspector keymap={keymap} modifiers={modifiers} selected={selected} onSelect={onSelect} onClear={onClear}/>
  </section>;
}
