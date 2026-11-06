/* Workspace-scoped WorkRelief branding. Never apply another workspace's identity. */
(async function(){
 const script=document.currentScript;
 const url=new URL(location.href);
 const id=url.searchParams.get('workspace');
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 try{
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
  const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
  const {data:{user}}=await sb.auth.getUser();
  if(!user)return;
  let wid=uuid.test(id||'')?id:null;
  if(wid){
   const {data:membership}=await sb.from('workspace_members').select('workspace_id').eq('workspace_id',wid).eq('user_id',user.id).maybeSingle();
   if(!membership)return;
  }else{
   const {data:members}=await sb.from('workspace_members').select('workspace_id').eq('user_id',user.id).limit(2);
   if(members?.length!==1)return; // Do not guess a workspace for multi-workspace users.
   wid=members[0].workspace_id;
  }
  const {data:grant}=await sb.from('wr_application_entitlements').select('white_label_enabled,billing_state').eq('workspace_id',wid).eq('application_code','crm').maybeSingle();
  if(!grant?.white_label_enabled||!['active','trialing'].includes(grant.billing_state))return;
  const {data:record}=await sb.from('wr_workspace_branding').select('brand_name,logo_url,primary_color').eq('workspace_id',wid).eq('application_code','crm').maybeSingle();
  if(!record)return;
  const color=/^#[a-f0-9]{6}$/i.test(record.primary_color||'')?record.primary_color:'#1768f5';
  const name=String(record.brand_name||'').trim().slice(0,120);
  const logo=String(record.logo_url||'');
  document.documentElement.style.setProperty('--blue',color);
  document.documentElement.style.setProperty('--crm',color);
  document.documentElement.style.setProperty('--wr-crm-accent',color);
  document.documentElement.style.setProperty('--accent',color);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',color);
  const style=document.createElement('style');style.id='wr-workspace-branding';
  style.textContent=':root{--blue:'+color+';--crm:'+color+';--wr-crm-accent:'+color+';--accent:'+color+'}a:not(.pill),.eyebrow,.kicker,.brand-overline{color:var(--accent)}.button:not(.secondary),.btn.primary,.action:not(:disabled),.app.selected:before{background-color:var(--accent);border-color:var(--accent)}input:focus,select:focus{border-color:var(--accent)}';
  document.head.append(style);
  if(logo.startsWith('https://')){
   document.querySelectorAll('.head img,.topin .brand img,.top-brand img,header .top-inner img').forEach(img=>{img.src=logo;img.alt=name||'Workspace logo';img.style.objectFit='contain';img.style.clipPath='none'});
  }else if(name){
   const brand=document.querySelector('.top-brand,.topin .brand,.head');
   if(brand){const image=brand.querySelector('img');if(image){const replacement=document.createElement('strong');replacement.textContent=name;image.replaceWith(replacement)}}
  }
  window.wrWorkspaceBrand={workspaceId:wid,name,logo,color};
 }catch(error){console.warn('Unable to load workspace branding');}
})();
