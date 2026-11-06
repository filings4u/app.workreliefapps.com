import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
let records=[],workspace='';
const active=x=>!['delivered','invoiced','closed','cancelled'].includes(x.status);
const pickup=x=>x.pickup_at?new Date(x.pickup_at).getTime():NaN;
const exceptions=x=>{const problems=[];if(active(x)&&!x.carrier_partner_id)problems.push('Carrier unassigned');if(active(x)&&Number.isFinite(pickup(x))&&pickup(x)<Date.now())problems.push('Pickup date passed');if(active(x)&&Number(x.customer_rate)<Number(x.carrier_rate))problems.push('Negative margin');return problems};
function td(row,value){const el=document.createElement('td');el.textContent=value;row.append(el);return el}
function draw(){
const watch=records.filter(x=>(!$('stage').value||x.status===$('stage').value)&&(!$('search').value.trim()||[x.load_number,x.origin_city,x.destination_city,x.customer_name,x.carrier_name].join(' ').toLowerCase().includes($('search').value.trim().toLowerCase()))).sort((a,b)=>exceptions(b).length-exceptions(a).length);
$('active').textContent=records.filter(active).length;
const now=Date.now();$('pickups').textContent=records.filter(x=>active(x)&&pickup(x)>=now&&pickup(x)<=now+172800000).length;
$('attention').textContent=records.filter(x=>exceptions(x).length).length;
$('margin').textContent=money(records.reduce((sum,x)=>sum+Number(x.customer_rate||0)-Number(x.carrier_rate||0),0));
const tbody=$('loads');tbody.replaceChildren();
for(const x of watch.slice(0,40)){const row=document.createElement('tr');td(row,x.load_number||'—');td(row,[x.origin_city,x.origin_state].filter(Boolean).join(', ')+' → '+[x.destination_city,x.destination_state].filter(Boolean).join(', '));td(row,x.pickup_at?new Date(x.pickup_at).toLocaleDateString():'Not set');td(row,(x.status||'draft').replaceAll('_',' '));td(row,money(Number(x.customer_rate||0)-Number(x.carrier_rate||0)));const link=td(row,'');const a=document.createElement('a');a.href='tms-load.html?'+new URLSearchParams({workspace,id:x.id});a.textContent='View →';link.append(a);tbody.append(row)}
if(!watch.length){const tr=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=6;cell.className='empty';cell.textContent='No matching shipments. Create a load to start managing freight.';tr.append(cell);tbody.append(tr)}
const queue=$('queue');queue.replaceChildren();const flagged=records.flatMap(x=>exceptions(x).map(problem=>({x,problem}))).slice(0,8);
if(!flagged.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='No exceptions found in the current shipment list.';queue.append(empty)}
for(const {x,problem} of flagged){const row=document.createElement('div');row.className='queue-item';const box=document.createElement('div');const strong=document.createElement('strong');strong.textContent=x.load_number||'Load';const small=document.createElement('small');small.textContent=problem;box.append(strong,small);const a=document.createElement('a');a.href='tms-load.html?'+new URLSearchParams({workspace,id:x.id});a.textContent='Review →';row.append(box,a);queue.append(row)}
}
$('search').addEventListener('input',draw);$('stage').addEventListener('change',draw);
async function start(){try{
const {data:{user},error:authError}=await sb.auth.getUser();if(authError||!user){location.replace('login.html?next=app/tms-command.html');return}
const {data:members,error:memberError}=await sb.from('workspace_members').select('workspace_id,role').eq('user_id',user.id);
if(memberError)throw memberError;if(!members?.length)throw Error('No WorkRelief workspace access.');
const requested=new URLSearchParams(location.search).get('workspace');workspace=members.find(m=>m.workspace_id===requested)?.workspace_id||members[0].workspace_id;
for(const id of ['create','allLoads','dispatch','partners']){const a=$(id);a.href+=('?workspace='+encodeURIComponent(workspace))}
const {data,error}=await sb.from('tms_loads').select('id,load_number,status,origin_city,origin_state,destination_city,destination_state,pickup_at,customer_name,carrier_name,carrier_partner_id,customer_rate,carrier_rate').eq('workspace_id',workspace).order('created_at',{ascending:false}).limit(500);
if(error)throw error;records=data||[];$('status').textContent='Showing up to 500 recent loads from your authorized workspace. Operational alerts are calculated from saved shipment data.';draw();
}catch(error){$('status').textContent=error.message||'Unable to open TMS.';$('loads').replaceChildren()}}
start();