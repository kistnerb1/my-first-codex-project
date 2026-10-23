// Synthetic setup tests: no real keys, login emails, or financial uploads.
import {chromium,webkit} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const files=['index.html','style.css','app.js','finance.js','cloud.js','cloud-ui.js'];
const server=createServer(async(req,res)=>{const name=new URL(req.url,'http://test').pathname.slice(1)||'index.html';if(!files.includes(name)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(await readFile(new URL('../dist/'+name,import.meta.url)));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const type=process.env.MMCC_BROWSER==='webkit'?webkit:chromium;const browser=await type.launch({executablePath:type===chromium?process.env.MMCC_CHROMIUM_PATH||undefined:undefined});
const configKey='mmcc-supabase-public-config-v1',project='https://exampleproject.supabase.co',publicKey='sb_publishable_CaseSensitive_testonly';
let checks=0;
async function scenario(mode,action){
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const errors=[],requests=[];
 await context.addInitScript(({mode,configKey})=>{
  if(!['http:','https:'].includes(location.protocol))return;
  if(mode==='corrupt'&&!sessionStorage.getItem('seeded')){localStorage.setItem(configKey,'{corrupt');sessionStorage.setItem('seeded','yes');}
  const set=Storage.prototype.setItem,get=Storage.prototype.getItem;
  Storage.prototype.setItem=function(k,v){if(k===configKey&&(mode==='denied'||mode==='full'))throw new DOMException('Synthetic failure',mode==='full'?'QuotaExceededError':'SecurityError');if(k===configKey&&mode==='silent')return;return set.call(this,k,v);};
  if(mode==='readback')Storage.prototype.getItem=function(k){if(k===configKey)throw new DOMException('Synthetic blocked read','SecurityError');return get.call(this,k);};
 },{mode,configKey});
 await context.route(project+'/**',route=>{requests.push(route.request().url());return route.fulfill({json:{},headers:{'access-control-allow-origin':origin}});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 try{await page.goto(origin);await page.locator('#metrics .metric').first().waitFor();const localBefore=await page.evaluate(()=>localStorage.getItem('my-money-command-center-v1'));await page.locator('#cloud-settings').evaluate(e=>e.open=true);await action(page,requests);assert.equal(await page.evaluate(()=>localStorage.getItem('my-money-command-center-v1')),localBefore);assert.deepEqual(errors,[]);checks++;}finally{await context.close();}
}
async function fill(page,url=project,key=publicKey){await page.locator('#project-url').fill(url);await page.locator('#publishable-key').fill(key);}
async function feedback(page,text){await page.locator('#connection-feedback').getByText(text,{exact:false}).waitFor();assert.equal(await page.locator('#cloud-settings').getAttribute('open'),'');}
try{
 await scenario('normal',async(page,requests)=>{
  await fill(page);await page.locator('#publishable-key').focus();await page.getByRole('button',{name:'Save connection setup',exact:true}).tap();await feedback(page,'saved and verified');assert.equal(requests.length,0);
  assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),configKey),{url:project,key:publicKey});
  for(const id of ['project-url','publishable-key']){assert.equal(await page.locator('#'+id).getAttribute('autocapitalize'),'none');assert.equal(await page.locator('#'+id).getAttribute('autocorrect'),'off');}
  assert.ok((await page.locator('#save-cloud-config').boundingBox()).height>=44);
  await page.reload();await page.locator('#cloud-settings').evaluate(e=>e.open=true);assert.equal(await page.locator('#publishable-key').inputValue(),publicKey);
  await page.getByLabel('Email',{exact:true}).fill('synthetic@example.invalid');await page.locator('#send-code').tap();await page.waitForFunction(()=>document.querySelector('#sync-status').textContent.includes('Sign-in email sent'));assert.equal(requests.length,1);
 });
 await scenario('normal',async page=>{await fill(page,' '+project+'/\u200b ',' \u200b'+publicKey.slice(0,20)+'\n'+publicKey.slice(20)+' ');await page.locator('#save-cloud-config').tap();await feedback(page,'saved and verified');assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),configKey),{url:project,key:publicKey});});
 await scenario('normal',async page=>{await fill(page);await page.locator('#publishable-key').press('Enter');await feedback(page,'saved and verified');});
 for(const [url,key,message,field] of [['not a URL',publicKey,'project URL is not valid','project-url'],[project,'Sb_publishable_testonly','case-sensitive','publishable-key'],[project,'sb_secret_forbidden','forbidden','publishable-key'],['',publicKey,'Enter your Supabase project URL','project-url']])await scenario('normal',async(page,requests)=>{await fill(page,url,key);await page.locator('#save-cloud-config').tap();await feedback(page,message);assert.equal(await page.locator('#'+field).getAttribute('aria-invalid'),'true');assert.equal(requests.length,0);await fill(page);await page.locator('#save-cloud-config').tap();await feedback(page,'saved and verified');});
 for(const mode of ['denied','full','silent','readback'])await scenario(mode,async(page,requests)=>{await fill(page);await page.locator('#save-cloud-config').tap();await feedback(page,'could not confirm saving');await page.getByLabel('Email',{exact:true}).fill('synthetic@example.invalid');await page.locator('#send-code').tap();await feedback(page,'Save your Supabase project URL');assert.equal(requests.length,0,'Failed persistence must not set an in-memory active config');});
 await scenario('corrupt',async page=>{await feedback(page,'could not be read');await fill(page);await page.locator('#save-cloud-config').tap();await feedback(page,'saved and verified');});
 await scenario('normal',async(page,requests)=>{await fill(page);await page.locator('#save-cloud-config').tap();await feedback(page,'saved and verified');await page.locator('#publishable-key').fill('sb_publishable_new');await page.getByLabel('Email',{exact:true}).fill('synthetic@example.invalid');await page.locator('#send-code').tap();await feedback(page,'Save your Supabase project URL');assert.equal(requests.length,0);});
 console.log(`PASS: ${checks} mobile setup scenarios (${type===webkit?'WebKit':'Chromium'}): touch, focused-input tap, keyboard submit, save/reload/login, clipboard cleanup, invalid input, denied/full/silent/readback storage failures, corrupt setup recovery, unsaved changes, original financial data preserved, no runtime errors.`);
}finally{await browser.close();server.close();}
