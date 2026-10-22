import {SupabaseClient,SyncEngine,validateConfig,mergeWorkspaces,emptyWorkspace} from './cloud.js';
import {validData} from './finance.js';

export function mountCloud({getData,setData,getLocalData,onMode,notify}){
  const $=s=>document.querySelector(s);const configKey='mmcc-supabase-public-config-v1';
  let config=null,client=null,engine=null,busy=false,migration=null,backupStarted=false,conflictBackup=null;
  const status=(state,text)=>{if(!['local','synced','syncing','pending','auth','conflict','error'].includes(state))state='error'; $('#sync-status').dataset.state=state;$('#sync-status').textContent=text;$('#resolve-cloud').hidden=state!=='conflict'; };
  const lock=value=>{$('#finance-workspace').inert=value;};
  const authBusy=value=>{busy=value;for(const id of ['send-code','verify-code','save-cloud-config'])$('#'+id).disabled=value;};
  function download(data,label){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`my-money-backup-${label}-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function mode(cloud){$('#auth-form').hidden=cloud;$('#cloud-controls').hidden=!cloud;$('#cloud-settings').hidden=cloud;$('#workspace-mode').textContent=cloud?'Signed-in cloud workspace':'Local browser workspace';$('#reset').disabled=cloud;onMode(cloud);}
  async function connect(user){
    lock(true);setData(emptyWorkspace());mode(true);$('#signed-in-email').textContent=user.email||'Signed in';
    engine=new SyncEngine(client,{onData:setData,onStatus:status});
    try{await engine.start();}catch(e){status('error',e.message);}finally{lock(!engine?.ready);}
  }
  async function run(task){if(busy)return;authBusy(true);try{await task();}catch(e){status(e.kind||'error',e.message);}finally{authBusy(false);}}
  try{const saved=JSON.parse(localStorage.getItem(configKey));if(saved){config=validateConfig(saved.url,saved.key);$('#project-url').value=config.url;$('#publishable-key').value=config.key;}}catch{status('error','Saved connection setup could not be read. Local data was not changed.');}
  $('#save-cloud-config').onclick=()=>{try{config=validateConfig($('#project-url').value.trim(),$('#publishable-key').value.trim());localStorage.setItem(configKey,JSON.stringify(config));client=null;$('#cloud-settings').open=false;status('local','Connection setup saved on this browser. Sign in below. No financial records have been uploaded.');}catch(e){status('error',e.message);}};
  $('#send-code').onclick=()=>run(async()=>{if(!config)throw Error('Save your Supabase project URL and public key first.');if(!$('#email').reportValidity())return;const email=$('#email').value.trim();if(client&&!client.session)client.closed=true;client=new SupabaseClient(config);await client.sendCode(email);$('#code').value='';$('#code').focus();status('auth','Check your email for the code. Email delivery may take a moment.');});
  $('#auth-form').onsubmit=e=>{e.preventDefault();void run(async()=>{if(!client||!config)throw Error('Request an email code first.');const user=await client.verify($('#email').value.trim(),$('#code').value.trim());$('#code').value='';await connect(user);});};
  $('#sync-now').onclick=()=>{if(engine)void engine.pull();};
  $('#sign-out').onclick=()=>run(async()=>{
    if(engine?.dirty&&!confirm('Some changes are not synced. They will remain in this account’s cache on this device. Sign out?'))return;
    lock(true);engine?.stop();engine=null;let failure=false;
    try{await client?.logout();}catch{failure=true;}
    client=null;mode(false);setData(getLocalData());lock(false);
    status(failure?'error':'local',failure?'Signed out on this device, but server revocation could not be confirmed. Reconnect and sign out again to revoke the session.':'Signed out. Original local browser workspace restored; cloud records remain in Supabase.');
  });
  $('#migrate-local').onclick=()=>{
    try{const local=getLocalData();if(!validData(local))throw Error('Local data is invalid. Recover your backup before migrating.');if(!engine?.ready||engine.dirty||engine.conflict||engine.busy)throw Error('Finish syncing or resolve the conflict before migrating.');migration=structuredClone(local);backupStarted=false;$('#migration-saved').checked=false;$('#confirm-migration').disabled=true;$('#migration-summary').textContent=`Original local workspace: ${local.transactions.length} income/expense entries, ${local.bills.length} bills, ${Object.keys(local.budgets).length} budgets. This may include fictional samples. Existing cloud records and conflicting cloud values will be kept. Original browser data will remain unchanged.`;$('#migration-dialog').showModal();}catch(e){status('error',e.message);}
  };
  $('#backup-migration').onclick=()=>{if(!migration)return;download(migration,'before-cloud');backupStarted=true;$('#migration-saved').disabled=false;notify('Backup download started. Check your Downloads and open the JSON file before confirming migration.');};
  $('#migration-saved').onchange=()=>{$('#confirm-migration').disabled=!(backupStarted&&$('#migration-saved').checked);};
  $('#cancel-migration').onclick=()=>{$('#migration-dialog').close();migration=null;};
  $('#migration-dialog').addEventListener('close',()=>{migration=null;});
  $('#migration-form').onsubmit=e=>{e.preventDefault();void run(async()=>{
    if(!migration||!backupStarted||!$('#migration-saved').checked||!engine?.ready)throw Error('Download and confirm your local backup first.');
    if(engine.dirty||engine.conflict||engine.busy)throw Error('Finish syncing before importing.');
    await engine.pull();if(!engine.lastReadOkay)throw Error('Could not verify the latest cloud copy. No migration was uploaded. Check the connection and retry.');if(engine.dirty||engine.conflict||engine.busy)throw Error('Resolve pending changes before importing.');
    const merged=mergeWorkspaces(migration,engine.data);
    if(!confirm(`Upload this local backup into the cloud account ${client.session.user.email}? ${merged.conflicts.length} conflicting records/budgets will keep their CLOUD values; originals remain in your local workspace and backup. Nothing will be removed from the local workspace.`))return;
    engine.edit(merged.data);setData(merged.data);$('#migration-dialog').close();notify('Migration queued. Wait for “Up to date” before closing. Your original local workspace and downloaded backup are unchanged.');
  });};
  $('#resolve-cloud').onclick=()=>{
    if(!engine||engine.busy){status('error','Wait for the current request to finish.');return;}
    conflictBackup=JSON.stringify(engine.data);$('#conflict-saved').checked=false;$('#conflict-saved').disabled=true;$('#confirm-cloud-copy').disabled=true;$('#conflict-dialog').showModal();
  };
  $('#backup-conflict').onclick=()=>{if(!engine)return;conflictBackup=JSON.stringify(engine.data);download(engine.data,'conflict-device-copy');$('#conflict-saved').disabled=false;};
  $('#conflict-saved').onchange=()=>{$('#confirm-cloud-copy').disabled=!$('#conflict-saved').checked;};
  $('#cancel-conflict').onclick=()=>$('#conflict-dialog').close();
  $('#conflict-form').onsubmit=e=>{e.preventDefault();void run(async()=>{
    if(!engine||!$('#conflict-saved').checked||conflictBackup!==JSON.stringify(engine.data))throw Error('Device changes arrived. Download and check a new backup first.');
    if(!confirm('Load the cloud version? Your unsynced device edits will remain in your downloaded backup.'))return;
    await engine.useCloud();$('#conflict-dialog').close();
  });};
  const poll=setInterval(()=>{if(engine&&!document.hidden)void engine.pull();},15000);
  window.addEventListener('online',()=>{if(engine)void engine.pull();});
  document.addEventListener('visibilitychange',()=>{if(engine&&!document.hidden)void engine.pull();});
  window.addEventListener('beforeunload',event=>{if(engine?.dirty){event.preventDefault();event.returnValue='';}});
  window.addEventListener('pagehide',()=>{if(engine?.dirty)engine.persist();});
  if(config){client=new SupabaseClient(config);void run(async()=>{status('auth','Checking sign-in…');const user=await client.restore();if(user)await connect(user);else status('local','Local mode. Sign in to use your cloud workspace.');});}
  return {
    get active(){return !!engine;},
    save(data){if(!engine)return false;engine.edit(data);return true;},
    stop(){clearInterval(poll);engine?.stop();}
  };
}
