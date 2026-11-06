/* WorkRelief shared app launcher for authenticated app shells. */
(() => {
  const apps=[['crm','CRM','#1768f5'],['scheduling','Scheduling','#12b8b1'],['forms','Forms','#ff8419'],['desk','Desk','#ed3192'],['hr','HR','#8839ec'],['training','Training','#247bff'],['compliance','Compliance','#10c66e'],['time','Time','#8a3cf6'],['tasks','Tasks','#e59a32'],['projects','Projects','#4c77d9'],['chat','Chat','#7a4fdd'],['docs','Docs','#5b77a6'],['sign','Sign','#e68c45'],['billing','Billing','#3f94cc'],['field','Field','#8a69d4'],['inventory','Inventory','#c77842'],['assets','Assets','#3b81ac'],['workflow','Workflow','#8467d0'],['ai','AI','#9457e8'],['tms','TMS','#1768f5']];
  const style=document.createElement('style');style.textContent='.wr-switcher{position:relative;display:inline-flex;align-items:center}.wr-switcher-button{border:1px solid #d7e3f5;background:#fff;color:#183765;border-radius:10px;padding:10px 14px;font:700 12px inherit;white-space:nowrap;cursor:pointer}.wr-switcher-button:focus-visible{outline:3px solid #1768f54d}.wr-switcher-pop{position:fixed;left:0;top:0;width:min(375px,calc(100vw - 28px));max-height:min(570px,75dvh);overflow-y:auto;background:#fff;box-shadow:0 20px 65px #102a5260;border:1px solid #dbe5f4;border-radius:16px;padding:14px;z-index:10010}.wr-switcher-pop[hidden]{display:none!important}.wr-switcher-pop>strong{display:block;font-size:15px;margin:3px 4px 5px}.wr-switcher-sub{color:#6b7f9f;font-size:12px;margin:0 4px 12px}.wr-switcher-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.wr-switcher-item{display:flex;flex-direction:column;align-items:center;gap:7px;text-decoration:none;text-align:center;padding:12px 5px;border:1px solid #e6edf7;border-radius:12px;color:#16345e;font-weight:700;font-size:11px}.wr-switcher-item:hover{background:#f2f7ff}.wr-switcher-dot{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:color-mix(in srgb,var(--wr-item-color) 12%,white);color:var(--wr-item-color);font-size:19px}.wr-switcher-footer{display:block;text-align:center;margin-top:12px;padding:11px;border-radius:10px;background:#edf4ff;color:#075cf5;font-size:12px;font-weight:800;text-decoration:none}@media(max-width:700px){.wr-switcher-button{padding:9px}}';document.head.append(style);
  const host=document.createElement('div');host.className='wr-switcher';const trigger=document.createElement('button');trigger.type='button';trigger.className='wr-switcher-button';trigger.textContent='▦ Apps';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-haspopup','true');const panel=document.createElement('div');panel.className='wr-switcher-pop';panel.hidden=true;host.append(trigger,panel);
  let installed=false;
  const positionPanel=()=>{const rect=trigger.getBoundingClientRect();const width=panel.getBoundingClientRect().width||Math.min(375,innerWidth-28);const left=Math.max(14,Math.min(rect.left,innerWidth-width-14));panel.style.left=left+'px';const availableBelow=innerHeight-rect.bottom-18;const showAbove=availableBelow<220&&rect.top>availableBelow;panel.style.maxHeight=Math.max(150,Math.min(570,showAbove?rect.top-18:availableBelow))+'px';panel.style.top=(showAbove?Math.max(8,rect.top-panel.offsetHeight-10):rect.bottom+10)+'px'};
  const close=()=>{panel.hidden=true;trigger.setAttribute('aria-expanded','false')};
  const link=(name,id)=>name+'?workspace='+encodeURIComponent(id);
  function render(session,rows){
    const entitled=new Set((rows||[]).filter(x=>['active','trialing'].includes(x.billing_state)).map(x=>x.application_code));
    panel.replaceChildren();
    const title=document.createElement('strong');title.textContent='Switch applications';const subtitle=document.createElement('p');subtitle.className='wr-switcher-sub';subtitle.textContent='Your subscribed workspace software';const grid=document.createElement('div');grid.className='wr-switcher-grid';
    for(const [code,name,color] of apps.filter(([code])=>entitled.has(code))){const a=document.createElement('a');a.className='wr-switcher-item';a.href=link(['crm','scheduling','tms'].includes(code)?code+'.html':'index.html',session.workspaceId);a.title=['crm','scheduling','tms'].includes(code)?'Open '+name:'View subscription (app under development)';const icon=document.createElement('span');icon.className='wr-switcher-dot';icon.style.setProperty('--wr-item-color',color);icon.textContent=name.charAt(0);const text=document.createElement('span');text.textContent=name;a.append(icon,text);grid.append(a)}
    if(!grid.children.length){const empty=document.createElement('p');empty.className='wr-switcher-sub';empty.textContent='No active app subscriptions in this workspace.';grid.append(empty)}
    const all=document.createElement('a');all.href=link('index.html',session.workspaceId);all.className='wr-switcher-footer';all.textContent='View all my applications →';const market=document.createElement('a');market.href=link('purchase-apps.html',session.workspaceId);market.className='wr-switcher-footer';market.textContent='Explore marketplace →';panel.append(title,subtitle,grid,all,market);
  }
  async function mount(){
    if(installed)return;
    const session=window.wrEnterpriseSession;if(!session?.sb||!session.workspaceId)return;
    const target=document.querySelector('.top .right');if(!target)return;
    installed=true;target.prepend(host);
    trigger.onclick=()=>{panel.hidden=!panel.hidden;trigger.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)positionPanel()};
    window.addEventListener('resize',()=>{if(!panel.hidden)positionPanel()});window.addEventListener('scroll',()=>{if(!panel.hidden)positionPanel()},true);
    document.addEventListener('click',e=>{if(!host.contains(e.target))close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    try{
      const {data,error}=await session.sb.from('wr_application_entitlements').select('application_code,billing_state').eq('workspace_id',session.workspaceId);
      if(error)throw error;render(session,data);
    }catch(error){panel.textContent='Unable to load subscriptions';console.warn('App switcher:',error)}
  }
  window.addEventListener('wr-enterprise-authenticated',mount);
  if(window.wrEnterpriseSession)void mount();
})();