import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),E=(tag,value)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=String(value);return node};
let trips=[],selected=null,saving=false;const state=(message,error=false)=>{$('driverState').textContent=message;$('driverState').style.color=error?'#a92d48':'#5e7693'};
function date(value){return value?new Date(value).toLocaleString():'Not scheduled'}
function render(){const host=$('driverTrips');host.replaceChildren();
if(!trips.length){host.append(E('div','No active or recent trips are linked to your signed-in driver account. Ask your WorkRelief fleet administrator to link your account and assign a trip.')).className='tms-driver-empty';return}
for(const t of trips){const card=E('article');card.className='tms-driver-card';
const tag=E('span',t.assignment_status||'Assigned');tag.className='tms-driver-tag';card.append(tag,E('h2',t.load_number||'Shipment'));
const route=E('div',[(t.origin_city||'Pickup'),t.origin_state||''].filter(Boolean).join(', ')+' → '+[(t.destination_city||'Delivery'),t.destination_state||''].filter(Boolean).join(', '));route.className='tms-driver-route';card.append(route);
const details=E('dl');for(const [label,value]of [['Pickup',date(t.pickup_at)],['Delivery',date(t.delivery_at)],['Shipment Status',t.load_status||'—'],['Dispatch Notes',t.dispatch_notes||'None']]){details.append(E('dt',label),E('dd',value))}card.append(details);
if(t.assignment_status==='dispatched'&&['dispatched','in_transit'].includes(t.load_status)){const update=E('button','Report Trip Update');update.type='button';update.onclick=()=>openEditor(t);card.append(update)}
host.append(card)}
}
function openEditor(t){selected=t;$('driverMilestoneForm').reset();$('driverMilestoneTitle').textContent='Trip Update · '+(t.load_number||'Shipment');$('driverFormError').textContent='';
const d=new Date();$('driverMilestoneForm').elements.namedItem('happened_at').value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);$('driverMilestoneDialog').showModal()}
$('driverCancel').onclick=()=>$('driverMilestoneDialog').close();
$('driverRefresh').onclick=loadTrips;
async function loadTrips(){state('Loading assigned trips…');try{const {data,error}=await sb.rpc('tms_my_driver_trips');if(error)throw error;trips=Array.isArray(data)?data:[];render();state('Trips retrieved for your authenticated driver account.')}catch(error){state('Unable to load trips: '+(error.message||'Unknown error'),true)}}
$('driverMilestoneForm').onsubmit=async event=>{event.preventDefault();if(!selected||saving)return;
const fields=Object.fromEntries(new FormData(event.currentTarget)),time=new Date(fields.happened_at);
if(!Number.isFinite(time.getTime())){$('driverFormError').textContent='Enter a valid actual date and time.';return}
if(fields.event_type==='exception'&&String(fields.details||'').trim().length<5){$('driverFormError').textContent='Describe the exception in at least five characters.';return}
saving=true;$('driverSubmit').disabled=true;$('driverFormError').textContent='';
try{const {error}=await sb.rpc('tms_driver_record_milestone',{p_workspace:selected.workspace_id,p_load:selected.load_id,p_type:fields.event_type,p_details:fields.details||'',p_happened_at:time.toISOString()});if(error)throw error;$('driverMilestoneDialog').close();selected=null;await loadTrips();state('Trip update recorded. Dispatch can review it in Shipment Execution.')}catch(error){$('driverFormError').textContent=error.message||'Unable to submit trip update'}finally{saving=false;$('driverSubmit').disabled=false}};
(async()=>{const{data:{user},error}=await sb.auth.getUser();if(error||!user){state('Sign in to WorkRelief to view assigned trips.',true);return}await loadTrips()})();