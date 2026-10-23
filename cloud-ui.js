import {SupabaseClient,SyncEngine,validateConfig,mergeWorkspaces,emptyWorkspace,consumeAuthCallback,expiredLinkMessage,saveConnectionConfig,connectionStorageMessage} from './cloud.js';
import {validData} from './finance.js';

export function mountCloud({getData,setData,getLocalData,onMode,notify}){
  const callback=consumeAuthCallback(window.location,window.history);
  const $=s=>document.querySelector(s);const configKey='mmcc-supabase-public-config-v1';
  let configDirty=false;let config=null,client=null,engine=null,busy=false,migration=null,backupStarted=false,conflictBackup=null;
  const status=(state,text)=>{if(!['local','synced','syncing','pending','auth','conflict','error'].includes(state))state='error'; $('#sync-status').dataset.state=state;$('#sync-status').textContent=text;$('#resolve-cloud').hidden=state!=='conflict'; };
  const lock=value=>{$('#finance-workspace').inert=value;};
  const authBusy=value=>{busy=value;for(const id of ['send-code','save-cloud-config'])$('#'+id).disabled=value;$('#save-cloud-config').textContent=value?'Please wait…':'Save connection setup';$('#connection-busy').hidden=!value;};
  function download(data,label){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`my-money-backup-${label}-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function mode(cloud){$('#auth-form').hidden=cloud;$('#cloud-controls').hidden=!cloud;$('#cloud-settings').hidden=cloud;$('#workspace-mode').textContent=cloud?'Signed-in cloud workspace':'Local browser workspace';$('#reset').disabled=cloud;onMode(cloud);}
  async function connect(user){
    lock(true);setData(emptyWorkspace());mode(true);$('#signed-in-email').textContent=user.email||'Signed in';
    engine=new SyncEngine(client,{onData:setData,onStatus:status});
    try{await engine.start();}catch(e){status('error',e.message);}finally{lock(!engine?.ready);}
  }
  async function run(task){if(busy)return;authBusy(true);try{await task();}catch(e){status(e.kind||'error',e.message);}finally{authBusy(false);}}
  function setupFeedback(text,state='error',field=null){
    const feedback=$('#connection-feedback');feedback.textContent=text;feedback.dataset.state=state;feedback.hidden=false;
    $('#project-url').setAttribute('aria-invalid',String(field==='url'));$('#publishable-key').setAttribute('aria-invalid',String(field==='key'));
    $('#cloud-settings').open=true;
    if(state==='error'){
      const input=field==='url'?$('#project-url'):field==='key'?$('#publishable-key'):null;
      input?.focus();feedback.scrollIntoView({block:'nearest'});
    }
  }
  try{const saved=JSON.parse(localStorage.getItem(configKey));if(saved){config=validateConfig(saved.url,saved.key);$('#project-url').value=config.url;$('#publishable-key').value=config.key;}}catch{setupFeedback('Saved connection setup could not be read. Re-enter the public project details. Existing financial data was not changed.');status('error','Connection setup needs attention below.');}
  for(const input of [$('#project-url'),$('#publishable-key')])input.addEventListener('input',()=>{
    configDirty=true;input.setAttribute('aria-invalid','false');$('#connection-feedback').hidden=false;$('#connection-feedback').dataset.state='pending';$('#connection-feedback').textContent='Connection details changed. Tap Save connection setup to apply them.';
  });
  $('#connection-form').addEventListener('submit',event=>{
    event.preventDefault();if(busy)return;
    try{
      const candidate=saveConnectionConfig(window.localStorage,$('#project-url').value,$('#publishable-key').value);
      config=candidate;configDirty=false;client=null;
      $('#project-url').value=config.url;$('#publishable-key').value=config.key;
      setupFeedback('Connection setup saved and verified in this browser. You can now request a sign-in link.','success');
      status('local','Connection setup saved on this browser. Sign in below. No financial records have been uploaded.');
    }catch(error){setupFeedback(error.field?error.message:connectionStorageMessage,'error',error.field);status('error','Connection setup was not saved. See the message next to Save connection setup.');}
  });
  $('#auth-form').onsubmit=e=>{e.preventDefault();void run(async()=>{
    if(!config||configDirty){setupFeedback('Save your Supabase project URL and public key here before requesting a sign-in link.');throw Error('Save your Supabase project URL and public key first. See Connection setup below.');}
    if(!$('#email').reportValidity())return;
    if(client&&!client.session)client.closed=true;client=new SupabaseClient(config);
    await client.sendLink($('#email').value.trim(),window.location.origin+window.location.pathname);
    status('auth','Sign-in email sent. Open the newest email link in this same browser. If it expired or was already used, request a fresh link here. Your local data has not been uploaded.');
    $('#send-code').textContent='Send a fresh sign-in link';
  });};
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
  function finishLink(values){
    $('#send-code').textContent='Send a fresh sign-in link';
    if(values.error||values.error_code||values.code||!values.access_token||!values.refresh_token){status('auth',expiredLinkMessage);return;}
    if(!config){status('auth','Sign-in details were removed from the address for privacy. Set up this browser’s Supabase connection, then request a fresh link here.');return;}
    client=new SupabaseClient(config);void run(async()=>{status('auth','Verifying your sign-in link…');const user=await client.acceptMagicLink(values);await connect(user);});
  }
  window.addEventListener('hashchange',()=>{
    const values=consumeAuthCallback(window.location,window.history);if(!values)return;
    if(engine||busy){status('auth','You already have an active sign-in or workspace. Your current records are kept. Sign out before requesting a new link for another account.');return;}
    finishLink(values);
  });
  if(callback)finishLink(callback);
  else if(config){client=new SupabaseClient(config);void run(async()=>{status('auth','Checking sign-in…');const user=await client.restore();if(user)await connect(user);else status('local','Local mode. Sign in to use your cloud workspace.');});}
  return {
    get active(){return !!engine;},
    save(data){if(!engine)return false;engine.edit(data);return true;},
    stop(){clearInterval(poll);engine?.stop();}
  };
}
