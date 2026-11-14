import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),E=(tag,v)=>{const x=document.createElement(tag);if(v!==undefined)x.textContent=String(v);return x};
const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v)||0);
let ws='',assignments=[],drivers=[],loads=[],settlements=[],active=null,busy=false;
const message=(t,err=false)=>{const n=$('driverPayState');n.textContent=t;n.style.color=err?'#a82d47':'#617d98'};
async function reload(){
 const [a,d,l,s]=await Promise.all([
 sb.from('tms_dispatch_assignments').select('id,driver_id,load_id,status').eq('workspace_id',ws).eq('status','completed').limit(1000),
 sb.from('tms_drivers').select('id,full_name').eq('workspace_id',ws).limit(1000),
 sb.from('tms_loads').select('id,load_number').eq('workspace_id',ws).limit(1000),
 sb.rpc('tms_driver_pay_summary',{p_workspace:ws})
 ]);
 for(const r of [a,d,l,s])if(r.error)throw r.error;
 assignments=a.data||[];drivers=d.data||[];loads=l.data||[];settlements=Array.isArray(s.data)?s.data:[];
 const sel=$('driverPayAssignment'),current=sel.value;sel.replaceChildren();const none=E('option','Select Completed Dispatch');none.value='';sel.append(none);
 for(const x of assignments){if(!x.driver_id)continue;const d=drivers.find(p=>p.id===x.driver_id),load=loads.find(p=>p.id===x.load_id);const opt=E('option',(d?.full_name||'Driver')+' · '+(load?.load_number||'Load'));opt.value=x.id;sel.append(opt)}if(assignments.some(a=>a.id===current))sel.value=current;
 const host=$('driverPayRows');host.replaceChildren();
 for(const s of settlements){
  const row=E('article');row.className='driver-pay-row';const info=E('div');info.append(E('strong',s.driver_name+' · '+s.load_number),E('span',s.status.toUpperCase()+' · Net '+money(s.net_pay)+' · Paid '+money(s.paid_amount)+' · Balance '+money(Math.max(0,Number(s.net_pay)-Number(s.paid_amount)))));
  if(s.explanation)info.append(E('span',s.explanation));row.append(info);
  const actions=E('div');actions.className='driver-pay-row-actions';
  if(s.status==='draft'){const b=E('button','Approve Statement');b.type='button';b.onclick=()=>approve(s);actions.append(b)}
  if(s.status==='approved'){const b=E('button','Record External Payment');b.type='button';b.onclick=()=>openPayment(s);actions.append(b)}
  row.append(actions);host.append(row);
 }
 if(!settlements.length)host.append(E('p','No driver settlements have been prepared for this workspace.'));
 message('Driver pay records loaded. No transfers are initiated by WorkRelief.');
}
async function approve(s){if(busy)return;if(!window.confirm('Confirm driver compensation review and approve '+money(s.net_pay)+' for '+s.driver_name+'?'))return;busy=true;try{const r=await sb.rpc('tms_approve_driver_settlement',{p_workspace:ws,p_settlement:s.id});if(r.error)throw r.error;await reload()}catch(e){message(e.message,true)}finally{busy=false}}
function openPayment(s){active=s;const form=$('driverPayPaymentForm');form.reset();const balance=Math.max(0,Number(s.net_pay)-Number(s.paid_amount));form.elements.namedItem('amount').value=balance.toFixed(2);form.elements.namedItem('amount').max=balance.toFixed(2);const t=new Date();form.elements.namedItem('date').value=new Date(t.getTime()-t.getTimezoneOffset()*60000).toISOString().slice(0,16);$('driverPayPaymentLabel').textContent=s.driver_name+' · '+s.load_number+' · Remaining '+money(balance);$('driverPayPaymentError').textContent='';$('driverPayDialog').showModal()}
$('driverPayCancel').onclick=()=>$('driverPayDialog').close();
$('driverPayPaymentForm').onsubmit=async e=>{e.preventDefault();if(!active||busy)return;const v=Object.fromEntries(new FormData(e.currentTarget)),date=new Date(v.date);if(Number.isNaN(date.getTime())){$('driverPayPaymentError').textContent='Enter a valid date';return}if(!window.confirm('Confirm this payment was completed outside WorkRelief?'))return;
busy=true;try{const result=await sb.rpc('tms_record_driver_settlement_payment',{p_workspace:ws,p_settlement:active.id,p_amount:Number(v.amount),p_method:v.method,p_reference:v.reference,p_paid:date.toISOString()});if(result.error)throw result.error;$('driverPayDialog').close();active=null;await reload()}catch(error){$('driverPayPaymentError').textContent=error.message||'Unable to record payment'}finally{busy=false}};
$('driverPayForm').onsubmit=async e=>{e.preventDefault();if(busy)return;const v=Object.fromEntries(new FormData(e.currentTarget));if(!assignments.some(a=>a.id===v.assignment_id)){message('Select an eligible completed dispatch',true);return}busy=true;try{const r=await sb.rpc('tms_prepare_driver_settlement',{p_workspace:ws,p_assignment:v.assignment_id,p_gross:Number(v.gross),p_expenses:Number(v.expenses),p_deductions:Number(v.deductions),p_description:v.notes||''});if(r.error)throw r.error;e.currentTarget.reset();await reload()}catch(error){message(error.message||'Unable to prepare statement',true)}finally{busy=false}};
$('driverPayRefresh').onclick=reload;
(async()=>{try{const{data:{user},error}=await sb.auth.getUser();if(error||!user)throw Error('Sign in to WorkRelief');const[m,o]=await Promise.all([sb.from('workspace_members').select('workspace_id,role').eq('user_id',user.id),sb.from('workspaces').select('id').eq('owner_id',user.id)]);if(m.error)throw m.error;if(o.error)throw o.error;const ids=[...new Set([...(m.data||[]).map(x=>x.workspace_id),...(o.data||[]).map(x=>x.id)])],requested=new URLSearchParams(location.search).get('workspace');if(requested&&!ids.includes(requested))throw Error('Unauthorized workspace');ws=requested||(ids.length===1?ids[0]:'');if(!ws)throw Error('Choose an authorized workspace');const admin=(o.data||[]).some(x=>x.id===ws)||(m.data||[]).some(x=>x.workspace_id===ws&&['owner','admin'].includes(x.role));if(!admin)throw Error('Finance owner or administrator access required');$('driverPayArea').hidden=false;await reload()}catch(error){message(error.message||'Unable to access driver pay',true)}})();