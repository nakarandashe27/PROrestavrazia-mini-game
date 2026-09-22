import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Use the production bundle. No development-only engine hooks are needed.
const port = 4178;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe', windowsHide: true });
let browser;
const origin = process.env.GAME_TEST_URL || `http://127.0.0.1:${port}/`;
const sdk = `(() => {
  const handlers = {}, calls = [];
  const version = new URLSearchParams(location.search).get('api') || '8.0';
  const app = { platform: 'android', version, viewportStableHeight: innerHeight,
    safeAreaInset: {top:24,right:0,bottom:24,left:0}, contentSafeAreaInset: {top:46,right:0,bottom:0,left:0},
    isVersionAtLeast(v) { const a=version.split('.').map(Number),b=v.split('.').map(Number); return a[0]>b[0] || a[0]===b[0] && a[1]>=b[1]; },
    onEvent(event, fn) { (handlers[event] ||= new Set()).add(fn); },
    offEvent(event, fn) { handlers[event]?.delete(fn); },
    BackButton: { visible:false, show(){this.visible=true}, hide(){this.visible=false}, onClick(fn){app.onEvent('back',fn)}, offClick(fn){app.offEvent('back',fn)} }
  };
  for (const method of ['ready','expand','setHeaderColor','setBackgroundColor','setBottomBarColor','enableClosingConfirmation','disableClosingConfirmation','enableVerticalSwipes','disableVerticalSwipes','requestFullscreen','exitFullscreen','openLink']) app[method] = (...args) => calls.push([method,...args]);
  window.Telegram={WebApp:app};
  window.tgTest={app,calls,emit(event){for(const fn of handlers[event]||[])fn()},listenerCount(event){return handlers[event]?.size||0}};
})();`;

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) break; } catch {}
    if (i > 60 || server.exitCode !== null) throw new Error('Preview server failed to start');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
  await mkdir('tests/telegram-artifacts', { recursive: true });
  const results = [];
  for (const size of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]) {
    const context = await browser.newContext({ viewport:size, hasTouch:true, isMobile:true });
    const page = await context.newPage();
    const errors=[]; page.on('pageerror', error=>errors.push(error.message));
    await page.route('https://telegram.org/js/telegram-web-app.js?63', route=>route.fulfill({contentType:'text/javascript',body:sdk}));
    await page.goto(`${origin}?telegram=1`);
    await page.waitForFunction(()=>document.documentElement.classList.contains('in-telegram'));
    const screen = name=>page.waitForFunction(name=>document.querySelector('.app')?.getAttribute('data-screen')===name,name);
    const back = ()=>page.evaluate(()=>window.tgTest.emit('back'));
    assert.equal(await page.evaluate(()=>window.tgTest.app.BackButton.visible),false);
    await page.getByRole('button',{name:'Создать своего героя'}).click();
    await screen('studio');
    await page.getByRole('textbox',{name:'Ваше имя'}).fill('Хранитель');
    await back(); await screen('start');
    await page.getByRole('button',{name:'О проекте ↗',exact:true}).click();
    await screen('about'); await back(); await screen('start');
    await page.getByRole('button',{name:'Начать путешествие'}).click();
    await screen('intro'); await back(); await screen('start');
    await page.getByRole('button',{name:'Начать путешествие'}).click();
    await page.getByRole('button',{name:'В путь'}).click(); await screen('play');
    const right=page.getByRole('button',{name:'Идти вправо',exact:true});
    const bounds=await right.boundingBox(); assert.ok(bounds);
    assert.ok(bounds.y>=70 && bounds.y+bounds.height<=size.height-24, 'touch button outside safe area');
    const layout=await page.evaluate(()=>{
      const world=document.querySelector('.world').getBoundingClientRect();
      const footer=document.querySelector('.play-footer').getBoundingClientRect();
      const hud=document.querySelector('.hud').getBoundingClientRect();
      return {worldHeight:world.height,worldBottom:world.bottom,footerTop:footer.top,worldTop:world.top,hudBottom:hud.bottom,overflow:document.querySelector('.app').scrollWidth>document.querySelector('.app').clientWidth};
    });
    assert.ok(layout.worldHeight>100); assert.ok(layout.worldBottom<=layout.footerTop+1); assert.ok(layout.worldTop>=layout.hudBottom-1); assert.equal(layout.overflow,false);
    await right.dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch'});
    await page.evaluate(()=>window.tgTest.emit('deactivated')); await screen('pause');
    await back(); await screen('play'); await back(); await screen('pause');
    await page.getByRole('button',{name:'Изменить образ героя'}).click(); await screen('studio');
    await back(); await screen('pause');
    await page.getByRole('button',{name:'Продолжить',exact:false}).click(); await screen('play');
    await page.getByRole('button',{name:'Полный экран',exact:true}).click();
    assert.ok(await page.evaluate(()=>window.tgTest.calls.some(([name])=>name==='requestFullscreen')));
    await page.evaluate(()=>window.tgTest.emit('fullscreenFailed'));
    await page.getByRole('status').filter({hasText:'Полный экран недоступен'}).waitFor();
    // Telegram can change its stable viewport and safe areas independently of window.resize.
    await page.evaluate(()=>{window.tgTest.app.viewportStableHeight=innerHeight-35;window.tgTest.emit('viewportChanged')});
    assert.equal(await page.locator('#root').evaluate(el=>Math.round(el.getBoundingClientRect().height)),size.height-129);
    await page.evaluate(()=>{window.tgTest.app.safeAreaInset.left=12;window.tgTest.app.safeAreaInset.right=12;window.tgTest.emit('safeAreaChanged')});
    assert.equal(await page.locator('#root').evaluate(el=>Math.round(el.getBoundingClientRect().width)),size.width-24);
    await page.evaluate(()=>{window.tgTest.app.safeAreaInset.left=0;window.tgTest.app.safeAreaInset.right=0;window.tgTest.emit('safeAreaChanged')});
    await page.evaluate(()=>{window.tgTest.app.viewportStableHeight=innerHeight;window.tgTest.emit('viewportChanged')});
    await page.waitForFunction(()=>{
      const canvas=document.querySelector('.world canvas'),ctx=canvas.getContext('2d');
      const bytes=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      const colors=new Set(); for(let i=0;i<bytes.length;i+=400)colors.add(bytes.slice(i,i+3).join(','));
      return colors.size>30;
    });
    await page.getByRole('status').filter({hasText:'Полный экран недоступен'}).waitFor({state:'hidden'});
    await page.screenshot({path:`tests/telegram-artifacts/play-${size.width}.png`});
    await back(); await page.getByRole('button',{name:'Завершить прогулку'}).click(); await screen('start');
    assert.equal(await page.evaluate(()=>window.tgTest.calls.filter(([name])=>name.includes('ClosingConfirmation')).at(-1)[0]),'disableClosingConfirmation');
    assert.equal(await page.evaluate(()=>window.tgTest.listenerCount('back')),1);
    assert.deepEqual(errors,[]);
    results.push({viewport:size,...layout,errors});
    await context.close();
  }
  const page=await browser.newPage();
  let requests=0;
  await page.route('https://telegram.org/**',route=>{requests++;return route.abort()});
  await page.goto(origin);
  await page.getByRole('button',{name:'Начать путешествие'}).waitFor();
  assert.equal(requests,0,'ordinary website must not depend on Telegram');
  await page.goto(`${origin}?telegram=1`);
  await page.getByRole('button',{name:'Начать путешествие'}).click();
  await page.getByRole('button',{name:'В путь'}).click();
  assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('in-telegram')),false);
  assert.ok(requests>0,'SDK failure fallback was exercised');
  await page.context().setOffline(true);
  await page.goto(pathToFileURL(path.resolve('dist/index.html')).href);
  await page.getByRole('button',{name:'Начать путешествие'}).click();
  await page.getByRole('button',{name:'В путь'}).click();
  await page.context().setOffline(false);
  await page.unroute('https://telegram.org/**');
  await page.route('https://telegram.org/js/telegram-web-app.js?63',route=>route.fulfill({contentType:'text/javascript',body:sdk}));
  await page.goto(`${origin}?telegram=1&api=6.0`);
  await page.waitForFunction(()=>!!window.tgTest);
  await page.getByRole('button',{name:'Полный экран',exact:true}).click();
  await page.getByRole('status').filter({hasText:'обновите Telegram'}).waitFor();
  assert.deepEqual(await page.evaluate(()=>window.tgTest.calls.map(call=>call[0]).filter(name=>!['ready','expand'].includes(name))),[]);
  console.log(JSON.stringify({passed:true,results,website:true,blockedSdk:true,offline:true,legacyClient:true},null,2));
} finally {
  await browser?.close();
  if (server.exitCode === null) { server.kill(); await once(server,'exit'); }
}
