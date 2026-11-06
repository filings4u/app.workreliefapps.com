/* Shared authenticated WorkRelief CRM shell controls */
(()=>{
 const style=document.createElement('style');
 style.textContent='.wr-shell-workspace-select{max-width:100%;width:100%;min-height:39px;border:1px solid #d5e2f5;background:#fff;color:#18335e;border-radius:10px;padding:8px 10px;font-size:12px;font-weight:700}.wr-shell-notify{position:relative;display:inline-grid;place-items:center;width:40px;height:40px;min-width:40px;border:1px solid #d9e4f5;background:white;border-radius:11px;color:#1c427b;cursor:pointer;font-size:20px}.wr-shell-notify:hover{background:#edf4ff}.wr-shell-unread{position:absolute;right:-4px;top:-6px;min-width:18px;height:18px;border-radius:20px;background:#1768f5;color:white;font-size:10px;font-weight:800;line-height:18px;text-align:center;padding:0 4px}.wr-shell-unread[hidden]{display:none!important}.wr-shell-navlink{display:flex;align-items:center;gap:9px;text-decoration:none!important;border-radius:10px;padding:10px 12px;color:#31517f;font-weight:700;font-size:12px;background:#edf4ff}.wr-shell-navlink:hover{background:#e1edff}';
 document.head.append(style);
 let mounted=false;
 async function init(){
  const session=window.wrEnterpriseSession;if(mounted||!session?.sb||!session.workspaceId||!session.userId)return;
  mounted=true;
  const {sb,workspaceId,userId}=session;
  const workspaceArea=document.querySelector('.sidebar .workspace');
  if(workspaceArea){
   const select=document.createElement('select');select.className='wr-shell-workspace-select';select.setAttribute('aria-label','Select workspace');
   const initial=document.createElement('option');initial.value=workspaceId;initial.textContent=window.wrAuthenticatedProfile?.workspace||'Current workspace';select.append(initial);
   workspaceArea.replaceChildren(select);
   select.addEventListener('change',()=>{if(select.value&&select.value!==workspaceId){const url=new URL(location.href);url.searchParams.set('workspace',select.value);location.assign(url.href)}});
   try{
    const {data:members,error}=await sb.from('workspace_members').select('workspace_id').eq('user_id',userId);if(error)throw error;
    const ids=[...new Set((members||[]).map(m=>m.workspace_id))];if(!ids.includes(workspaceId))throw Error('Missing workspace membership');
    const {data:workspaces,error:workspaceError}=await sb.from('workspaces').select('id,name').in('id',ids);if(workspaceError)throw workspaceError;
    select.replaceChildren();
    for(const id of ids){const workspace=(workspaces||[]).find(w=>w.id===id);const option=document.createElement('option');option.value=id;option.textContent=workspace?.name||'Workspace';select.append(option)}
    select.value=workspaceId;
   }catch(err){console.warn('Workspace picker unavailable',err)}
  }
  const nav=document.querySelector('.sidebar .nav');
  if(nav&&!nav.querySelector('.wr-shell-navlink')){
   const row=document.createElement('a');row.className='wr-shell-navlink';row.href='index.html?workspace='+encodeURIComponent(workspaceId);row.textContent='▦  All my applications';nav.prepend(row);
  }
  const actions=document.querySelector('.top .right');
  if(actions){
   const button=document.createElement('button');button.className='wr-shell-notify';button.type='button';button.setAttribute('aria-label','Open notifications');button.title='Notifications';button.textContent='♧';
   const badge=document.createElement('span');badge.className='wr-shell-unread';badge.hidden=true;button.append(badge);
   button.addEventListener('click',()=>{if(typeof window.wrNotificationCenter==='function')window.wrNotificationCenter()});
   const userMenu=actions.querySelector('#wr-user-menu-wrap');if(userMenu)actions.insertBefore(button,userMenu);else actions.append(button);
   try{
    const {count,error}=await sb.from('crm_in_app_notifications').select('id',{head:true,count:'exact'}).eq('workspace_id',workspaceId).eq('recipient_id',userId).eq('is_read',false);
    if(error)throw error;if(count>0){badge.hidden=false;badge.textContent=count>99?'99+':String(count);button.setAttribute('aria-label',count+' unread notifications')}
   }catch(err){console.warn('Unread notifications unavailable',err)}
  }
 }
 window.addEventListener('wr-enterprise-authenticated',()=>void init());if(window.wrEnterpriseSession)void init();
})();