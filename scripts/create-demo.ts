import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { importRayconfig, extractKeymap } from '../src/lib/raycast.ts';
const file=process.argv[2];
if(!file) throw new Error('Usage: npm run demo -- path/to/export.rayconfig');
let keymap;
if(file.endsWith('.json')) keymap=extractKeymap(JSON.parse(await readFile(file,'utf8')),"Teddio’s shortcuts");
else {
 const rl=createInterface({input:process.stdin,output:process.stdout});
 const password=process.env.RAYCAST_EXPORT_PASSWORD || await rl.question('Export password (visible in this terminal): ');rl.close();
 keymap=await importRayconfig(new Uint8Array(await readFile(file)),password,"Teddio’s shortcuts");
}
await writeFile(new URL('../src/data/demo.json',import.meta.url),JSON.stringify(keymap,null,2)+'\n');
console.log(`Saved ${keymap.shortcuts.length} shortcuts. Only labels, bindings, and categories are included. Review src/data/demo.json before publishing.`);
