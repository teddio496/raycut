export type Modifier = 'control' | 'option' | 'shift' | 'command';
export const MODIFIERS: Modifier[] = ['control', 'option', 'shift', 'command'];
export const SYMBOLS: Record<Modifier, string> = { control: '⌃', option: '⌥', shift: '⇧', command: '⌘' };
export const mask = (mods: Modifier[]) => MODIFIERS.reduce((n, m, i) => n | (mods.includes(m) ? 1 << i : 0), 0);
export const fromMask = (n: number) => MODIFIERS.filter((_, i) => n & (1 << i));
export const comboLabel = (mods: Modifier[]) => MODIFIERS.filter(m => mods.includes(m)).map(m => SYMBOLS[m]).join('') || '—';
export interface KeySpec { code: number; label: string; width?: number; modifier?: Modifier; small?: boolean }
const k = (code: number, label: string, width = 1, modifier?: Modifier): KeySpec => ({ code, label, width, modifier });
export const ROWS: KeySpec[][] = [
  [k(53,'esc',1.55), ...[122,120,99,118,96,97,98,100,101,109,103,111].map((c,i)=>({...k(c,`F${i+1}`),small:true})), k(-1,'◉',1.1)],
  [k(50,'`'),k(18,'1'),k(19,'2'),k(20,'3'),k(21,'4'),k(23,'5'),k(22,'6'),k(26,'7'),k(28,'8'),k(25,'9'),k(29,'0'),k(27,'−'),k(24,'='),k(51,'delete',1.65)],
  [k(48,'tab',1.5),k(12,'Q'),k(13,'W'),k(14,'E'),k(15,'R'),k(17,'T'),k(16,'Y'),k(32,'U'),k(34,'I'),k(31,'O'),k(35,'P'),k(33,'['),k(30,']'),k(42,'\\',1.15)],
  [k(57,'caps lock',1.8),k(0,'A'),k(1,'S'),k(2,'D'),k(3,'F'),k(5,'G'),k(4,'H'),k(38,'J'),k(40,'K'),k(37,'L'),k(41,';'),k(39,"'"),k(36,'return',1.85)],
  [k(56,'shift',2.35,'shift'),k(6,'Z'),k(7,'X'),k(8,'C'),k(9,'V'),k(11,'B'),k(45,'N'),k(46,'M'),k(43,','),k(47,'.'),k(44,'/'),k(60,'shift',2.3,'shift')],
  [k(63,'fn'),k(59,'control',1,'control'),k(58,'option',1,'option'),k(55,'command',1.3,'command'),k(49,'space',5.05),k(54,'command',1.3,'command'),k(61,'option',1,'option'),k(123,'←'),k(126,'↑'),k(124,'→')],
];
export const KEYS = [...ROWS.flat(), k(125,'↓')];
export const ASSIGNABLE_KEYS = KEYS.filter(k => !k.modifier && k.code >= 0 && k.code !== 63);
export const keyLabel = (code: number) => KEYS.find(k => k.code === code)?.label ?? `Key ${code}`;
