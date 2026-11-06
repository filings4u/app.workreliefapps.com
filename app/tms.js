import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
let workspaceId,userId,loads=[],partners=[],editing=null,canEdit=false;
const allowed=['load_number','business_role','status','customer_name','carrier_name','customer_partner_id','carrier_partner_id','equipment_type','origin_city','origin_state','destination_city','destination_state','pickup_at','delivery_at','customer_rate','carrier_rate','notes'];
function msg(v,bad=false){$('message').textContent=v;$('message').style.color=bad?'#a12540':'#425d80'}
function cell(tr,value,strong=false){const td=document.createElement('td');if(strong){const b=document.createElement('strong');b.textContent=value;td.append(b)}else td.textContent=value;tr.append(td);return td}
function view(){
 const search=$('search').value.trim().toLowerCase(),status=$('filter').value,role=$('role').value;
 const filtered=loads.filter(x=>(!status||x.status===status)&&(!role||x.business_role===role)&&(!search||[x.load_number,x.customer_name,x.carrier_name,x.origin_city,x.destination_city].join(' ').toLowerCase().includes(search)));
 const body=$('rows');body.replaceChildren();
 for(const x of filtered){
 const tr=document.createElement('tr');cell(tr,x.load_number,true);cell(tr,[x.origin_city,x.origin_state].filter(Boolean).join(', ')+' → '+[x.destination_city,x.destination_state].filter(Boolean).join(', '));
 cell(tr,[x.customer_name,x.carrier_name].filter(Boolean).join(' / ')||'—');cell(tr,x.pickup_at?new Date(x.pickup_at).toLocaleDateString():'—');cell(tr,fmt(x.customer_rate));cell(tr,fmt(Number(x.customer_rate)-Number(x.carrier_rate)));
 const td=cell(tr,'');const badge=document.createElement('span');badge.className='pill';badge.textContent=x.status.replaceAll('_',' ');td.append(badge);const control=cell(tr,'');if(canEdit){const b=document.createElement('button');b.className='btn secondary';b.textContent='Edit';b.addEventListener('click',()=>open(x));control.append(b)}
 const a=document.createElement('a');a.href='tms-load.html?'+new URLSearchParams({id:x.id,workspace:workspaceId});a.textContent='Stops & History';const links=cell(tr,'');links.append(a);body.append(tr)}
 if(!filtered.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=9;td.className='quiet';td.textContent='No loads match this workspace and filter.';tr.append(td);body.append(tr)}
 $('total').textContent=loads.length;$('active').textContent=loads.filter(x=>!['closed','cancelled','delivered','invoiced'].includes(x.status)).length;
 $('delivered').textContent=loads.filter(x=>['delivered','invoiced','closed'].includes(x.status)).length;
 $('margin').textContent=fmt(loads.reduce((n,x)=>n+Number(x.customer_rate)-Number(x.carrier_rate),0))
}
function populatePartners(){for(const [id,type] of [['customerPartner','customer'],['carrierPartner','carrier']]){const select=$(id);select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent=type==='carrier'?'Unassigned':'Select customer';select.append(empty);for(const p of partners.filter(x=>type==='carrier'?x.partner_type==='carrier':x.partner_type!=='carrier')){const option=document.createElement('option');option.value=p.id;option.textContent=p.name;select.append(option)}}}
function open(record=null){editing=record;$('loadForm').reset();populatePartners();$('formError').textContent='';$('editorTitle').textContent=record?'Edit Load '+record.load_number:'Create Load';if(record)for(const k of allowed){const input=$('loadForm').elements.namedItem(k);if(input){let v=record[k]??'';if((k==='pickup_at'||k==='delivery_at')&&v)v=new Date(v).toISOString().slice(0,16);input.value=v}}$('editor').showModal()}
async function reload(){const{data,error}=await sb.from('tms_loads').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false}).limit(500);if(error)throw error;loads=data||[];view()}
$('close').onclick=$('cancel').onclick=()=>$('editor').close();$('newLoad').onclick=()=>open();['search','role','filter'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',view));
$('loadForm').addEventListener('submit',async e=>{e.preventDefault();if(!canEdit)return;const btn=$('save');btn.disabled=true;$('formError').textContent='';try{
const values=Object.fromEntries(new FormData(e.currentTarget));const record={};
for(const k of allowed){let v=values[k];if(k==='customer_rate'||k==='carrier_rate')v=Number(v||0);if(k==='pickup_at'||k==='delivery_at')v=v?new Date(v).toISOString():null;if(k==='customer_partner_id'||k==='carrier_partner_id')v=v||null;record[k]=v}
record.customer_name=partners.find(x=>x.id===record.customer_partner_id)?.name||'';record.carrier_name=partners.find(x=>x.id===record.carrier_partner_id)?.name||'';
let query;if(editing)query=sb.from('tms_loads').update(record).eq('id',editing.id).eq('workspace_id',workspaceId);else query=sb.from('tms_loads').insert({...record,status:'draft',workspace_id:workspaceId,created_by:userId});
const{error}=await query;if(error)throw error;$('editor').close();await reload();msg('Load saved successfully.');
}catch(err){$('formError').textContent=err.message||'Unable to save load'}finally{btn.disabled=false}});
async function start(){try{const{data:{user},error:ue}=await sb.auth.getUser();if(ue||!user){location.replace('login.html?next=app/tms.html');return}
userId=user.id;const{data:members,error:me}=await sb.from('workspace_members').select('workspace_id,role,workspaces(name)').eq('user_id',userId).limit(100);if(me)throw me;if(!members?.length)throw Error('You do not belong to a WorkRelief workspace.');
const requested=new URLSearchParams(location.search).get('workspace');const membership=members.find(x=>x.workspace_id===requested)||members[0];workspaceId=membership.workspace_id;canEdit=['owner','admin','member'].includes(membership.role);
$('workspaceName').textContent=membership.workspaces?.name||'Workspace';$('newLoad').disabled=!canEdit;window.wrEnterpriseSession={sb,workspaceId,userId};window.dispatchEvent(new Event('wr-enterprise-authenticated'));const pr=await sb.from('tms_partners').select('*').eq('workspace_id',workspaceId).eq('status','active').order('name');if(pr.error)throw pr.error;partners=pr.data||[];await reload();msg('');
}catch(err){msg(err.message||'Unable to load TMS',true);$('rows').textContent='Unable to load workspace';}}
start();