import {validData} from './finance.js';

export class CloudError extends Error {
  constructor(message,kind='network'){super(message);this.kind=kind;}
}
export class ConnectionSetupError extends Error {
  constructor(message,field){super(message);this.field=field;}
}
export function validateConfig(url,key){
  if(typeof url!=='string'||!url.trim())throw new ConnectionSetupError('Enter your Supabase project URL, starting with https://.','url');
  if(typeof key!=='string'||!key.trim())throw new ConnectionSetupError('Paste your public publishable or legacy anon key.','key');
  // Clipboard formatting is not part of a URL/key. Preserve case and actual key characters.
  url=url.replace(/[\u200B-\u200D\uFEFF]/g,'').trim();
  key=key.replace(/[\s\u200B-\u200D\uFEFF]/g,'');
  let parsed;try{parsed=new URL(url);}catch{throw new ConnectionSetupError('The project URL is not valid. Copy the HTTPS Project URL from Supabase, without quotes or brackets.','url');}
  if(parsed.protocol!=='https:'||! /^[a-z0-9-]+\.supabase\.co$/.test(parsed.hostname)||parsed.username||parsed.password||parsed.port||parsed.pathname!=='/'||parsed.search||parsed.hash)throw new ConnectionSetupError('Use only your HTTPS Supabase project URL (https://your-project.supabase.co), without extra paths or query text.','url');
  if(/^sb_secret_/i.test(key))throw new ConnectionSetupError('Secret/service-role keys are forbidden. Use a public publishable or anon key.','key');
  if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)){
    try{const part=key.split('.')[1];const claims=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')));if(key.split('.').length!==3||claims.role!=='anon')throw Error();}
    catch{throw new ConnectionSetupError('The public key is invalid or its capitalization changed. Keys are case-sensitive: paste the original sb_publishable_… or legacy anon key from Supabase. Never use a service-role key.','key');}
  }
  return {url:parsed.origin,key};
}
export const connectionStorageMessage='This browser could not confirm saving the connection setup. Website storage may be blocked or full. Open the preview directly in Safari or Chrome, allow website data, and try again. Your financial data was not changed.';
export function saveConnectionConfig(storage,url,key){
  const config=validateConfig(url,key);
  try{
    const serialized=JSON.stringify(config);storage.setItem('mmcc-supabase-public-config-v1',serialized);
    if(storage.getItem('mmcc-supabase-public-config-v1')!==serialized)throw Error('Storage did not retain the configuration');
  }catch{throw new ConnectionSetupError(connectionStorageMessage,'storage');}
  return config;
}
// Capture and remove credentials/errors before any account or financial requests.
export function consumeAuthCallback(location,history){
  const url=new URL(location.href);const hash=new URLSearchParams(url.hash.slice(1));
  const keys=['access_token','refresh_token','expires_in','expires_at','token_type','type','error','error_code','error_description','code'];
  const isCallback=['access_token','refresh_token','error','error_code'].some(k=>hash.has(k)||url.searchParams.has(k))||url.searchParams.has('code');
  if(!isCallback)return null;
  const values={};for(const k of keys){if(hash.has(k))values[k]=hash.get(k);else if(url.searchParams.has(k))values[k]=url.searchParams.get(k);url.searchParams.delete(k);}
  if(['access_token','refresh_token','error','error_code'].some(k=>hash.has(k)))url.hash='';
  history.replaceState(null,'',url.pathname+url.search+url.hash);
  return values;
}
export const expiredLinkMessage='This sign-in link has expired, was already used, or could not be verified. Your local data is safe. Request a fresh sign-in link below and use the newest email.';
export class SupabaseClient {
  constructor(config,{fetcher=globalThis.fetch.bind(globalThis),sessionStore=globalThis.sessionStorage,onSession=()=>{}}={}){
    this.config=validateConfig(config.url,config.key);this.fetcher=fetcher;this.sessionStore=sessionStore;this.onSession=onSession;this.session=null;this.refreshing=null;this.closed=false;
    this.sessionKey='mmcc-auth:'+this.config.url;
  }
  remember(session){
    if(this.closed)throw new CloudError('This session has ended. Sign in again.','auth');
    if(!session?.access_token||!session?.refresh_token||!session?.user?.id)throw new CloudError('Invalid sign-in response.','auth');
    this.session={...session,expires_at:session.expires_at||Math.floor(Date.now()/1000)+(session.expires_in||3600)};
    // Tokens never go into financial backups, source, build artifacts, or persistent localStorage.
    try{this.sessionStore.setItem(this.sessionKey,JSON.stringify(this.session));}catch{/* Session remains in memory; closing the tab requires login. */}
    this.onSession(this.session);
  }
  async request(path,{method='GET',body,auth=false,retry=true}={}){
    if(this.closed)throw new CloudError('Session ended.','auth');
    if(auth){if(!this.session)throw new CloudError('Sign in to synchronize.','auth');if(this.session.expires_at*1000<Date.now()+60000)await this.refresh();}
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
    let response;
    try{response=await this.fetcher(this.config.url+path,{method,headers:{apikey:this.config.key,...(auth?{Authorization:'Bearer '+this.session.access_token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...(path.startsWith('/rest/')?{Prefer:'return=representation'}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});}
    catch{throw new CloudError('Connection failed. Changes remain saved on this device. Check your connection and retry.');}finally{clearTimeout(timer);}
    if(response.status===401&&auth&&retry){await this.refresh();return this.request(path,{method,body,auth,retry:false});}
    if(!response.ok){if(response.status===401||response.status===403)throw new CloudError('Sign-in expired or access denied. Sign in again; local changes are kept.','auth');if(response.status===409)throw new CloudError('Another device changed this workspace. Review the conflict.','conflict');if(response.status===429)throw new CloudError('Too many requests. Wait a moment before trying again.','rate');throw new CloudError(path.includes('/auth/')?'Sign-in failed. Check the email address, allowed redirect URL, and Supabase email settings.':'Cloud request failed. Check the database setup and permissions.');}
    if(response.status===204)return null;
    return response.json();
  }
  async sendLink(email,returnUrl){
    const redirect=new URL(returnUrl);
    if((redirect.protocol!=='https:'&&!(redirect.protocol==='http:'&&['localhost','127.0.0.1'].includes(redirect.hostname)))||redirect.username||redirect.password)throw new CloudError('Open the app using HTTPS before requesting a sign-in link.','auth');
    redirect.hash='';redirect.search='';
    await this.request('/auth/v1/otp?redirect_to='+encodeURIComponent(redirect.href),{method:'POST',body:{email,create_user:true}});
  }
  async acceptMagicLink(values){
    if(values.error||values.error_code||values.code||!values.access_token||!values.refresh_token)throw new CloudError(expiredLinkMessage,'auth');
    this.session={access_token:values.access_token,refresh_token:values.refresh_token,expires_at:Math.floor(Date.now()/1000)+3600};
    try{
      const user=await this.request('/auth/v1/user',{auth:true,retry:false});
      if(!user?.id)throw new CloudError(expiredLinkMessage,'auth');
      const seconds=Number(values.expires_in);const expires_in=Number.isFinite(seconds)&&seconds>0&&seconds<=86400?seconds:3600;
      this.remember({...this.session,user,expires_at:Math.floor(Date.now()/1000)+expires_in});return user;
    }catch(error){this.session=null;throw new CloudError(error.kind==='network'?'Could not verify the sign-in link. Check your connection and request a fresh link. Your local data is safe.':expiredLinkMessage,'auth');}
  }
  async verify(email,token){const session=await this.request('/auth/v1/verify',{method:'POST',body:{email,token,type:'email'}});this.remember(session);return session.user;}
  async refresh(){
    if(this.refreshing)return this.refreshing;
    if(!this.session?.refresh_token)throw new CloudError('Sign in again.','auth');
    this.refreshing=(async()=>{const next=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:this.session.refresh_token}});this.remember(next);})();
    try{await this.refreshing;}finally{this.refreshing=null;}
  }
  async restore(){
    let saved;try{saved=JSON.parse(this.sessionStore.getItem(this.sessionKey));}catch{return null;}
    if(!saved)return null;
    this.remember(saved);
    try{const user=await this.request('/auth/v1/user',{auth:true});if(user.id!==this.session.user.id)throw new CloudError('Session identity mismatch. Sign in again.','auth');this.session.user=user;return user;}catch(error){this.session=null;throw error;}
  }
  async logout(){
    try{if(this.session)await this.request('/auth/v1/logout?scope=local',{method:'POST',auth:true});}finally{this.closed=true;this.session=null;this.sessionStore.removeItem(this.sessionKey);}
  }
  async read(){
    const rows=await this.request('/rest/v1/money_workspaces?select=data,revision&user_id=eq.'+encodeURIComponent(this.session.user.id),{auth:true});
    if(!Array.isArray(rows)||rows.length>1)throw new CloudError('Unexpected cloud response. No local data was replaced.');
    if(!rows.length)return null;
    if(!validData(rows[0].data)||!Number.isSafeInteger(rows[0].revision)||rows[0].revision<1)throw new CloudError('Cloud data is invalid. Your device copy has been kept.');
    return rows[0];
  }
  async write(data,revision){
    if(!validData(data)||new TextEncoder().encode(JSON.stringify(data)).length>1800000)throw new CloudError('Data is invalid or too large to synchronize. Export a local backup.','validation');
    const owner=this.session.user.id;
    const rows=revision===null?await this.request('/rest/v1/money_workspaces',{method:'POST',body:{user_id:owner,data},auth:true}):await this.request('/rest/v1/money_workspaces?user_id=eq.'+encodeURIComponent(owner)+'&revision=eq.'+revision,{method:'PATCH',body:{data},auth:true});
    if(!Array.isArray(rows)||rows.length!==1)throw new CloudError('Another device changed the workspace. No cloud records were overwritten.','conflict');
    if(!Number.isSafeInteger(rows[0].revision))throw new CloudError('Unexpected cloud revision. Reload before making more changes.','conflict');
    return rows[0].revision;
  }
}
export function emptyWorkspace(){return {version:1,sample:false,categories:['Groceries','Dining out','Shopping','Transport','Entertainment','Health','Income'],budgets:{},transactions:[],bills:[]};}
const stable=value=>JSON.stringify(value,Object.keys(value).sort());
export function mergeWorkspaces(local,cloud){
  if(!validData(local)||!validData(cloud))throw new Error('Invalid migration data.');
  const data=structuredClone(cloud);const conflicts=[];
  data.categories=[...new Set([...cloud.categories,...local.categories])];
  for(const type of ['transactions','bills'])for(const entry of local[type]){
    const existing=data[type].find(e=>e.id===entry.id);
    // IDs are global across both arrays. Never overwrite an existing record during migration.
    const elsewhere=data[type==='transactions'?'bills':'transactions'].some(e=>e.id===entry.id);
    if(elsewhere){conflicts.push(type);continue;}
    if(!existing)data[type].push(structuredClone(entry));else if(stable(existing)!==stable(entry))conflicts.push(type);
  }
  for(const [category,amount] of Object.entries(local.budgets)){
    if(Object.hasOwn(data.budgets,category)&&data.budgets[category]!==amount)conflicts.push('budget');else data.budgets[category]=amount;
  }
  data.sample=false;
  return {data,conflicts};
}

export class SyncEngine {
  constructor(client,{storage=localStorage,onData=()=>{},onStatus=()=>{}}={}){
    this.client=client;this.storage=storage;this.onData=onData;this.onStatus=onStatus;this.cacheKey='mmcc-cloud:'+client.config.url+':'+client.session.user.id;this.data=emptyWorkspace();this.revision=null;this.dirty=false;this.conflict=false;this.closed=false;this.generation=0;this.busy=false;this.ready=false;this.cacheFailed=false;this.lastReadOkay=false;
  }
  status(state,message){if(!this.closed)this.onStatus(this.cacheFailed&&state==='synced'?'error':state,this.cacheFailed?'Device cache unavailable: export a backup before closing. '+message:message);}
  persist(){try{this.storage.setItem(this.cacheKey,JSON.stringify({data:this.data,revision:this.revision,dirty:this.dirty}));this.cacheFailed=false;return true;}catch{this.cacheFailed=true;this.status('error','Browser storage is full/unavailable. Export a backup now; unsynced changes are in memory only.');return false;}}
  async start(){
    let cache;try{cache=JSON.parse(this.storage.getItem(this.cacheKey));}catch{throw new CloudError('This account’s device cache could not be read. Export/recover it before continuing.');}
    if(cache){if(!validData(cache.data)||(cache.revision!==null&&(!Number.isSafeInteger(cache.revision)||cache.revision<1))||typeof cache.dirty!=='boolean')throw new CloudError('Invalid account cache. No existing device data was overwritten.');this.data=cache.data;this.revision=cache.revision;this.dirty=cache.dirty;this.onData(structuredClone(this.data));}
    this.ready=true;await this.pull();
  }
  edit(data){if(!this.ready||this.closed)throw new CloudError('Wait for the account workspace to load.');this.data=structuredClone(data);this.generation++;this.dirty=true;this.persist();this.status(this.cacheFailed?'error':this.conflict?'conflict':'pending',this.conflict?'Conflict: your changes are kept on this device. Export them before loading the cloud copy.':'Saved on this device. Waiting to sync…');void this.flush();}
  async pull(){
    if(this.closed||this.busy)return;
    this.busy=true;this.lastReadOkay=false;const generation=this.generation;this.status('syncing','Checking cloud…');
    try{
      const remote=await this.client.read();if(this.closed)return;this.lastReadOkay=true;
      if(this.dirty){if((remote?.revision??null)!==this.revision){this.conflict=true;this.status('conflict','Both devices changed the workspace. Your device copy is preserved. Export it before loading the cloud copy.');return;}}
      else if(generation===this.generation){this.data=remote?.data??emptyWorkspace();this.revision=remote?.revision??null;this.persist();this.onData(structuredClone(this.data));this.status('synced',remote?'Up to date · '+new Date().toLocaleTimeString():'Empty cloud workspace. Import your local data when ready.');}
    }catch(e){this.status(e.kind==='auth'?'auth':'error',e.message);}finally{this.busy=false;}
    if(this.dirty&&!this.conflict&&!this.closed)await this.flush();
  }
  async flush(){
    if(this.closed||this.busy||!this.dirty||this.conflict)return;
    this.busy=true;
    try{while(this.dirty&&!this.closed&&!this.conflict){const generation=this.generation;const snapshot=structuredClone(this.data);this.status('syncing','Synchronizing…');const revision=await this.client.write(snapshot,this.revision);if(this.closed)return;this.revision=revision;this.dirty=generation!==this.generation;this.persist();}this.status('synced','Up to date · '+new Date().toLocaleTimeString());}
    catch(e){if(e.kind==='conflict')this.conflict=true;this.status(e.kind==='conflict'?'conflict':e.kind==='auth'?'auth':'error',e.message);}finally{this.busy=false;}
  }
  async useCloud(){
    if(this.busy)throw new CloudError('Wait for the current request to finish.');
    const generation=this.generation;this.busy=true;
    try{const remote=await this.client.read();if(this.closed)return;this.lastReadOkay=true;if(generation!==this.generation)throw new CloudError('New local changes arrived. Export them and try again.','conflict');this.data=remote?.data??emptyWorkspace();this.revision=remote?.revision??null;this.dirty=false;this.conflict=false;this.persist();this.onData(structuredClone(this.data));this.status('synced','Loaded cloud copy. Your downloaded backup preserves the previous device copy.');}finally{this.busy=false;}
  }
  stop(){this.closed=true;}
}
