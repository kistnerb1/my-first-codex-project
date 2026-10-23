// Entirely synthetic Supabase HTTP simulation. No live credentials or real records.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {emptyWorkspace} from '../cloud.js';
const prefix='/my-first-codex-project/';
const files=['index.html','style.css','app.js','finance.js','cloud.js','cloud-ui.js'];
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://test').pathname;const name=pathname===prefix?'index.html':pathname.slice(prefix.length);if(!pathname.startsWith(prefix)||!files.includes(name)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(await readFile(new URL('../dist/'+name,import.meta.url)));}catch{res.writeHead(500);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.MMCC_CHROMIUM_PATH||undefined});
const project='https://exampleproject.supabase.co';const config={url:project,key:'sb_publishable_testonly'};const key='my-money-command-center-v1';
const ids={alice:'11111111-1111-4111-8111-111111111111',bob:'22222222-2222-4222-8222-222222222222'};
const rows=new Map();const calls=[];let offline=false,forceConflict=false;
const day=new Date().toISOString().slice(0,7)+'-01';
const local={...emptyWorkspace(),transactions:[{id:'local-income',name:'Fictional local income',amount:1000,date:day,type:'income',category:'Income'}],bills:[{id:'local-bill',name:'Fictional local bill',amount:50,date:day,paid:false}],budgets:{Groceries:300}};
const errors=[];
async function context(){
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
 await c.addInitScript(({key,local,config})=>{if(!['http:','https:'].includes(location.protocol))return;if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(local));localStorage.setItem('mmcc-supabase-public-config-v1',JSON.stringify(config));},{key,local,config});
 await c.route(project+'/**',async route=>{
  const r=route.request(),url=new URL(r.url()),method=r.method();
  const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,prefer','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','content-type':'application/json'};
  const reply=(body,status=200)=>route.fulfill({status,headers,body:status===204?'':JSON.stringify(body)});
  if(method==='OPTIONS')return reply(null,204);
  const body=r.postData()?r.postDataJSON():null;calls.push({path:url.pathname,method,body});
  const name=r.headers().authorization?.replace('Bearer fake-','');
  if(url.pathname==='/auth/v1/otp')return reply({});
  if(url.pathname==='/auth/v1/verify'){
   if(body.token!=='123456')return reply({},403);
   const who=body.email.startsWith('alice')?'alice':'bob';return reply({access_token:'fake-'+who,refresh_token:'fake-refresh-'+who,user:{id:ids[who],email:who+'@example.invalid'},expires_in:3600});
  }
  if(url.pathname==='/auth/v1/user')return ids[name]?reply({id:ids[name],email:name+'@example.invalid'}):reply({},401);
  if(url.pathname==='/auth/v1/logout')return reply(null,204);
  if(url.pathname.startsWith('/rest/')){
   if(offline)return route.abort('failed');
   if(!ids[name])return reply({},401);
   const id=ids[name],existing=rows.get(id);
   if(method==='GET')return reply(existing?[existing]:[]);
   if(forceConflict){forceConflict=false;rows.set(id,{data:existing.data,revision:existing.revision+1});return reply({},409);}
   if(method==='POST'){if(existing)return reply({},409);const row={data:body.data,revision:1};rows.set(id,row);return reply([row]);}
   if(method==='PATCH'){if(!existing||url.searchParams.get('revision')!=='eq.'+existing.revision)return reply([]);const row={data:body.data,revision:existing.revision+1};rows.set(id,row);return reply([row]);}
  }
  return reply({},404);
 });
 return c;
}
async function open(c){const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+prefix);await p.locator('#sync-status').getByText('Local mode.',{exact:false}).waitFor();return p;}
async function login(p,name){await p.getByLabel('Email',{exact:true}).fill(name+'@example.invalid');await p.locator('#send-code').tap();await p.waitForFunction(()=>document.querySelector('#sync-status').textContent.includes('Sign-in email sent'));const otp=calls.filter(c=>c.path==='/auth/v1/otp').at(-1);assert.equal(otp.body.email,name+'@example.invalid');await p.goto(origin+prefix+'#access_token=fake-'+name+'&refresh_token=fake-refresh-'+name+'&expires_in=3600&type=magiclink');await p.locator('#cloud-controls').waitFor();await p.waitForFunction(()=>['synced','error'].includes(document.querySelector('#sync-status').dataset.state));assert.equal(new URL(p.url()).hash,'');}
async function confirmAction(p,button,accept){const handled=new Promise(resolve=>p.once('dialog',async d=>{await (accept?d.accept():d.dismiss());resolve();}));await button.tap();await handled;await p.waitForFunction(()=>!document.querySelector('#send-code').disabled);}
async function synced(p){await p.waitForFunction(()=>document.querySelector('#sync-status').dataset.state==='synced');}
try{
 const a=await context(),b=await context();const p=await open(a),q=await open(b);
 const original=await p.evaluate(key=>localStorage.getItem(key),key);
 await login(p,'alice');assert.equal(await p.locator('[data-transaction]').count(),0);assert.equal(await p.evaluate(key=>localStorage.getItem(key),key),original);
 assert.equal(calls.filter(c=>c.path.startsWith('/rest/')&&c.method!=='GET').length,0,'Login must not upload local data');
 await p.getByRole('button',{name:'Import local data'}).tap();assert.ok(await p.getByRole('button',{name:'Review & import into cloud'}).isDisabled());await p.getByRole('button',{name:'Cancel',exact:true}).tap();assert.equal(rows.size,0);
 await p.getByRole('button',{name:'Import local data'}).tap();const downloaded=p.waitForEvent('download');await p.getByRole('button',{name:'Download local backup'}).tap();const file=await (await downloaded).path();assert.deepEqual(JSON.parse(await readFile(file,'utf8')),local);
 await p.locator('#migration-saved').check();await confirmAction(p,p.getByRole('button',{name:'Review & import into cloud'}),false);assert.equal(rows.size,0);
 await confirmAction(p,p.getByRole('button',{name:'Review & import into cloud'}),true);await synced(p);assert.deepEqual(rows.get(ids.alice).data.transactions,local.transactions);assert.equal(await p.evaluate(key=>localStorage.getItem(key),key),original);
 await login(q,'alice');assert.equal(await q.getByRole('button',{name:'Fictional local income',exact:true}).count(),1);assert.equal(rows.get(ids.alice).data.budgets.Groceries,300);assert.equal(rows.get(ids.alice).data.bills[0].paid,false);
 await q.getByRole('button',{name:'+ Add income',exact:true}).tap();await q.getByLabel('Description').fill('Fictional cloud income');await q.getByLabel('Amount (USD)').fill('200');await q.getByRole('button',{name:'Save changes'}).tap();await synced(q);await p.getByRole('button',{name:'Sync now'}).tap();await synced(p);assert.equal(await p.getByRole('button',{name:'Fictional cloud income',exact:true}).count(),1);
 await q.locator('.status:not(.paid)').tap();await synced(q);await p.getByRole('button',{name:'Sync now'}).tap();await synced(p);assert.equal(await p.locator('.status.paid').count(),1);
 await q.getByRole('button',{name:'Edit budgets'}).tap();await q.getByLabel('Groceries',{exact:true}).fill('350');await q.getByRole('button',{name:'Save changes'}).tap();await synced(q);await p.getByRole('button',{name:'Sync now'}).tap();await synced(p);assert.ok((await p.locator('#budget-list').textContent()).includes('350'));
 // Offline writes are kept under the current account, then replayed conditionally.
 offline=true;await p.getByRole('button',{name:'Fictional local income',exact:true}).tap();await p.getByLabel('Amount (USD)').fill('1200');await p.getByRole('button',{name:'Save changes'}).tap();await p.waitForFunction(()=>document.querySelector('#sync-status').dataset.state==='error');assert.equal(rows.get(ids.alice).data.transactions[0].amount,1000);offline=false;await p.getByRole('button',{name:'Sync now'}).tap();await synced(p);assert.equal(rows.get(ids.alice).data.transactions[0].amount,1200);
 forceConflict=true;await p.getByRole('button',{name:'Fictional local income',exact:true}).tap();await p.getByLabel('Amount (USD)').fill('1300');await p.getByRole('button',{name:'Save changes'}).tap();await p.waitForFunction(()=>document.querySelector('#sync-status').dataset.state==='conflict');assert.equal(rows.get(ids.alice).data.transactions[0].amount,1200);
 await p.getByRole('button',{name:'Back up & load cloud copy'}).tap();assert.ok(await p.getByRole('button',{name:'Load cloud copy',exact:true}).isDisabled());const conflictDownload=p.waitForEvent('download');await p.getByRole('button',{name:'Download this device’s backup'}).tap();const conflictFile=await (await conflictDownload).path();assert.equal(JSON.parse(await readFile(conflictFile,'utf8')).transactions[0].amount,1300);await p.locator('#conflict-saved').check();await confirmAction(p,p.getByRole('button',{name:'Load cloud copy',exact:true}),true);await synced(p);assert.equal(rows.get(ids.alice).data.transactions[0].amount,1200);
 await p.getByRole('button',{name:'Sign out',exact:true}).tap();await p.locator('#auth-form').waitFor();assert.equal(await p.evaluate(key=>localStorage.getItem(key),key),original);assert.equal(await p.getByRole('button',{name:'Fictional local income',exact:true}).count(),1);
 await login(p,'bob');assert.equal(await p.locator('[data-transaction]').count(),0);assert.equal(await p.locator('.bill-row').count(),0);assert.equal(rows.has(ids.bob),false);
 const returning=await a.newPage();await returning.goto(origin+prefix+'#access_token=fake-bob&refresh_token=fake-refresh-bob&expires_in=3600&type=magiclink');await returning.locator('#cloud-controls').waitFor();assert.equal(new URL(returning.url()).hash,'');await returning.close();
 await p.reload();await p.locator('#cloud-controls').waitFor();await synced(p);assert.ok((await p.locator('#signed-in-email').textContent()).includes('bob@'));
 await p.goto('about:blank');await p.goto(origin+prefix+'#error=access_denied&error_code=otp_expired&error_description=untrusted');await p.getByText('This sign-in link has expired, was already used, or could not be verified.',{exact:false}).waitFor();assert.equal(new URL(p.url()).hash,'');assert.ok(await p.getByRole('button',{name:'Send a fresh sign-in link'}).isVisible());assert.equal(await p.evaluate(key=>localStorage.getItem(key),key),original);await login(p,'bob');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);assert.ok(calls.every(c=>!JSON.stringify(c.body).includes(config.key)));
 console.log('PASS: simulated magic-link return, session reload, expired-link recovery, two-device sync, income/bills/budgets/payment status, account isolation in UI, mandatory backup + cancel/confirm migration, original local data preserved, offline retry, conflict backup resolution, sign-out isolation and mobile layout.');
 console.log('NOT TESTED here: hosted Supabase email delivery, actual JWT verification, hosted RLS/deployment. Run the live checklist before approval.');
}finally{await browser.close();server.close();}
