const { chromium } = require('@playwright/test');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const { normalizePhoto } = require('../lib/product-photo.ts');
const base = 'http://127.0.0.1:3108';
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3108'], { env: { ...process.env, NEXT_BUILD_DIR: '.next-ui-test' }, windowsHide: true, stdio: 'ignore' });
(async () => {
  let browser;
  try {
    for (let i=0;i<90;i++) { try { if ((await fetch(base+'/api/admin/session')).ok) break; } catch {} await new Promise(r=>setTimeout(r,1000)); }
    assert.equal((await fetch(base+'/api/images', { method:'POST', body:'invalid' })).status,401);
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1200, height: 950 } });
    page.setDefaultTimeout(45000);
    const products=[]; let bytes; const imageUrl='/api/images/aaaaaaaaaaaaaaaaaaaaaaaa';
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()), method=route.request().method();
      if (url.pathname === '/api/admin/session') return route.fulfill({json:{authenticated:true}});
      if (url.pathname === '/api/orders' || url.pathname === '/api/payments') return route.fulfill({json:[]});
      if (url.pathname === '/api/images' && method === 'POST') {
        assert.deepEqual(route.request().postDataBuffer(),fs.readFileSync('public/logo-artech.jpeg'));
        bytes=await normalizePhoto(route.request().postDataBuffer()); return route.fulfill({status:201,json:{url:imageUrl}});
      }
      if (url.pathname === imageUrl) return route.fulfill({contentType:'image/webp',body:bytes});
      if (url.pathname === '/api/products') {
        if (method === 'POST') { const p=route.request().postDataJSON();assert.equal(p.image,imageUrl);products.push({...p,_id:'bbbbbbbbbbbbbbbbbbbbbbbb',__v:0});return route.fulfill({status:201,json:products[0]}); }
        return route.fulfill({json:products});
      }
      return route.abort();
    });
    await page.goto(base+'/admin');
    await page.getByRole('button',{name:'Articles & stock',exact:true}).click();
    await page.getByRole('button',{name:'Ajouter un article',exact:true}).click();
    await page.getByLabel('Nom de l’article').fill('Article avec photo locale');
    await page.getByLabel('Prix (FCFA)',{exact:true}).fill('10000');
    await page.getByLabel('Stock disponible',{exact:true}).fill('5');
    const picker=page.waitForEvent('filechooser');
    await page.getByRole('button',{name:'Choisir une photo dans mes fichiers',exact:true}).click();
    await (await picker).setFiles('public/logo-artech.jpeg');
    await page.waitForFunction(()=>document.querySelector('input[name="image"]')?.value.startsWith('/api/images/'));
    await page.getByAltText('Aperçu de la photo de l’article').evaluate(img=>img.decode());
    await page.screenshot({path:'test-results/photo-formulaire.png',fullPage:true});
    await page.getByRole('button',{name:'Enregistrer l’article',exact:true}).click();
    await page.getByText('Article enregistré.',{exact:true}).waitFor();
    await page.goto(base+'/boutique');
    const image=page.locator('.store-product img');await image.waitFor();
    assert.equal(await image.getAttribute('src'),imageUrl);await image.evaluate(img=>img.decode());
    await page.screenshot({path:'test-results/photo-boutique.png',fullPage:true});
    console.log('PASS UI with mocked database responses: native file picker, real photo conversion, preview, product payload and storefront display. Unauthenticated real upload rejected.');
  } finally { if(browser)await browser.close(); if(process.platform==='win32')spawnSync('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else child.kill(); }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
