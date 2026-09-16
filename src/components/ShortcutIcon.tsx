import { AppWindow, ArrowUpRight, Command, FileText, Link, Terminal } from 'lucide-react';
import type { Shortcut } from '../lib/raycast';
export function ShortcutIcon({ shortcut, size = 20 }: { shortcut: Shortcut; size?: number }) {
  if (shortcut.category === 'window') {
    const title = shortcut.title.toLowerCase();
    const left = title.includes('left'), right = title.includes('right');
    const top = title.includes('top'), bottom = title.includes('bottom');
    const center = title.includes('center');
    const x = center ? 7 : right ? 12 : 3;
    const y = center ? 7 : bottom ? 12 : 4;
    const width = center ? 10 : left || right ? 9 : 18;
    const height = center ? 10 : top || bottom ? 8 : 16;
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><rect x={x} y={y} width={width} height={height} rx="1" fill="currentColor" opacity=".4"/></svg>;
  }
  const Icon = shortcut.category === 'link' ? (shortcut.title === 'Quicklink' ? Link : ArrowUpRight) : /terminal/i.test(shortcut.title) ? Terminal : /notes/i.test(shortcut.title) ? FileText : shortcut.category === 'app' ? AppWindow : Command;
  return <Icon size={size} strokeWidth={1.6} aria-hidden="true"/>;
}
