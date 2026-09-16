import {test,expect} from '@playwright/test';
import {createCipheriv,createHash,randomBytes} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const synthetic={raycast_version:'1.104.29',builtin_package_rootSearch:{rootSearch:[{key:'com.example.Editor',path:'/Applications/Editor.app',type:'systemApp',hotkey:'Control-Option-0'},{key:'another',title:'Another action',type:'command',hotkey:'Control-Option-0'}]}};
function encrypted(){const iv=randomBytes(16);const cipher=createCipheriv('aes-256-cbc',createHash('sha256').update('test-password').digest(),iv);return Buffer.concat([iv,cipher.update(gzipSync(JSON.stringify(synthetic))),cipher.final()]);}
test('demo, exact layers, key details, and filters',async({page})=>{
 await page.goto('/');await expect(page.getByText('18 shortcuts',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'A: Left Half',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Toggle shift',exact:true}).click();
 await expect(page.getByRole('button',{name:'W: Top Left Quarter',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'A: unassigned in Raycast',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'W: Top Left Quarter',exact:true}).click();await expect(page.locator('.key-detail')).toContainText('Top Left Quarter');
 await page.getByRole('button',{name:'Open',exact:true}).click();await expect(page.getByRole('button',{name:'W: Top Left Quarter',exact:true})).toHaveClass(/dim/);
 await page.getByRole('button',{name:'Clear modifiers'}).click();await expect(page.locator('.current-combo')).toContainText('—');
});
test('search jumps to the matching modifier layer',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Search shortcuts',exact:true}).click();await page.getByRole('textbox',{name:'Find a shortcut'}).fill('Top Left');
 await page.locator('.search-results button').click();await expect(page.getByRole('button',{name:'Toggle shift',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.key-detail')).toContainText('Top Left Quarter');
});
test('private import, password retry, conflicts, and demo switching',async({page})=>{
 const unexpectedRequests:string[]=[];page.on('request',r=>{if(new URL(r.url()).hostname!=='127.0.0.1')unexpectedRequests.push(r.url());});
 await page.goto('/import');await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByLabel('Raycast config file').setInputFiles({name:'sample.rayconfig',mimeType:'application/octet-stream',buffer:encrypted()});
 await page.getByPlaceholder('Your Raycast export password').fill('wrong');await page.getByRole('button',{name:'Explore my shortcuts'}).click();await expect(page.getByRole('alert')).toContainText('Couldn’t unlock');
 await page.getByPlaceholder('Your Raycast export password').fill('test-password');await page.getByRole('button',{name:'Explore my shortcuts'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.shortcut-total')).toContainText('2 shortcuts');
 await page.getByRole('button',{name:'A: Editor, Another action'}).click();await expect(page.locator('.key-detail')).toContainText('2 assignments share this combination');
 await page.getByRole('button',{name:'Teddio’s keys',exact:true}).click();await expect(page.locator('.shortcut-total')).toContainText('18 shortcuts');
 await page.getByRole('button',{name:'Your keys',exact:true}).click();await expect(page.locator('.shortcut-total')).toContainText('2 shortcuts');
 expect(unexpectedRequests).toEqual([]);expect(await page.evaluate(()=>localStorage.length+sessionStorage.length)).toBe(0);
 await page.reload();await expect(page.locator('.shortcut-total')).toContainText('18 shortcuts');
});
test('import modal supports cancel and empty exports',async({page})=>{
 await page.goto('/import');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page).toHaveURL('/');
 await page.getByRole('button',{name:'Import yours'}).click();await page.getByLabel('Raycast config file').setInputFiles({name:'empty.rayconfig',mimeType:'application/octet-stream',buffer:gzipSync(JSON.stringify({raycast_version:'1'}))});
 await page.getByRole('button',{name:'Explore my shortcuts'}).click();await expect(page.locator('.empty-state')).toContainText('no assigned shortcuts');
});
test('mobile layout contains the keyboard in a scroll region',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 const scroll=page.locator('.keyboard-scroll');expect(await scroll.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);
 await page.screenshot({path:'test-results/mobile.png',fullPage:true});
});
test('desktop view has no runtime errors and produces a visual review image',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.screenshot({path:'test-results/desktop.png',fullPage:true});expect(errors).toEqual([]);
});
test('private export and working data are not served',async({request})=>{
 expect((await request.get('/Raycast%202026-09-14%2016.14.52.rayconfig')).status()).toBe(403);
 expect((await request.get('/.local/config.json')).status()).toBe(403);
});
