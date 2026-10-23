// Opt-in destructive FIXTURE test: target Supabase project + two new empty disposable test users only.
// Runtime env credentials are never printed or written to files.
import assert from 'node:assert/strict';
import {SupabaseClient,validateConfig,emptyWorkspace} from '../cloud.js';
const names=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','MMCC_TEST_USER_A_ACCESS_TOKEN','MMCC_TEST_USER_B_ACCESS_TOKEN'];
if(process.env.MMCC_ALLOW_TEST_WRITES!=='yes'||names.some(name=>!process.env[name])){
 console.error('Not run: requires the target test project, two empty disposable test users, public connection config, two runtime access tokens, and MMCC_ALLOW_TEST_WRITES=yes. Read SUPABASE_SETUP.md.');process.exit(1);
}
const config=validateConfig(process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY);
const storage={getItem:()=>null,setItem(){},removeItem(){}};
const fixtures=[];const marker=crypto.randomUUID();
async function account(token){
 const client=new SupabaseClient(config,{sessionStore:storage});client.session={access_token:token,expires_at:9999999999,user:{id:'pending'}};
 const user=await client.request('/auth/v1/user',{auth:true,retry:false});assert.ok(user.id,'Invalid test user');client.session.user=user;return client;
}
async function mustDeny(task){let denied=false;try{await task();}catch(e){denied=e.kind==='auth';}assert.ok(denied,'Expected database permission/RLS denial');}
try{
 const a=await account(process.env.MMCC_TEST_USER_A_ACCESS_TOKEN),b=await account(process.env.MMCC_TEST_USER_B_ACCESS_TOKEN);assert.notEqual(a.session.user.id,b.session.user.id,'Use two distinct test users');
 for(const c of [a,b])assert.equal((await c.request('/rest/v1/money_workspaces?select=user_id',{auth:true})).length,0,'Test user already has data: refusing all writes');
 const anon=new SupabaseClient(config,{sessionStore:storage});await mustDeny(()=>anon.request('/rest/v1/money_workspaces?select=user_id'));
 for(const c of [a,b]){fixtures.push(c);await c.write({...emptyWorkspace(),testFixture:marker},null);}
 for(const [owner,other] of [[a,b],[b,a]]){
  const all=await owner.request('/rest/v1/money_workspaces?select=user_id',{auth:true});assert.deepEqual(all.map(r=>r.user_id),[owner.session.user.id]);
  const target='user_id=eq.'+encodeURIComponent(other.session.user.id);
  assert.deepEqual(await owner.request('/rest/v1/money_workspaces?select=user_id&'+target,{auth:true}),[]);
  assert.deepEqual(await owner.request('/rest/v1/money_workspaces?'+target,{method:'PATCH',body:{data:{...emptyWorkspace(),testFixture:marker}},auth:true}),[]);
  assert.deepEqual(await owner.request('/rest/v1/money_workspaces?'+target,{method:'DELETE',auth:true}),[]);
  await mustDeny(()=>owner.request('/rest/v1/money_workspaces',{method:'POST',body:{user_id:other.session.user.id,data:emptyWorkspace()},auth:true}));
 }
 const own=await a.read();assert.equal(own.revision,1);assert.equal(await a.write({...own.data,budgets:{Groceries:123}},1),2);
 await assert.rejects(()=>a.write(own.data,1),e=>e.kind==='conflict');
 console.log('PASS: hosted JWT-authenticated identities, anonymous denial, own-only reads without app filters, cross-user insert/update/delete restrictions, own update and stale-revision rejection.');
 console.log('Email delivery, physical two-device UX and migration still require the manual checklist.');
}catch(error){console.error('LIVE TEST FAILED:',error.message);process.exitCode=1;}
finally{
 for(const c of fixtures){try{const current=await c.read();if(!current)continue;if(current.data?.testFixture===marker){const removed=await c.request('/rest/v1/money_workspaces?user_id=eq.'+encodeURIComponent(c.session.user.id)+'&revision=eq.'+current.revision,{method:'DELETE',auth:true});assert.equal(removed.length,1);}else throw Error('Fixture changed');}catch{console.error('Fixture cleanup could not be confirmed. Inspect the disposable project manually. No other data was removed.');process.exitCode=1;}}
}
