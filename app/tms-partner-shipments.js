import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),E=(tag,v)=>{const el=document.createElement(tag);if(v!==undefined)el.textContent=String(v);return el};
const status=(text,error=false)=>{const el=$('partnerStatus');el.textContent=text;el.style.color=error?'#b02d49':'#637f9a'};
const fmt=value=>value?new Date(value).toLocaleString():'Not scheduled';
let loading=false;
async function load(){
 if(loading)return;loading=true;$('partnerReload').disabled=true;status('Loading your authorized shipment records…');
 const host=$('partnerShipmentList');host.replaceChildren();
 try{
 const {data,error}=await sb.rpc('tms_my_partner_shipments');if(error)throw error;
 if(!Array.isArray(data))throw Error('Unexpected shipment response');
 for(const s of data){
 const card=E('article');card.className='partner-shipment';
 const tag=E('span',s.partner_type==='carrier'?'Carrier shipment':'Customer shipment');tag.className='tag';card.append(tag,E('h2',s.load_number||'Shipment'));
 const route=E('div',[s.origin_city,s.origin_state].filter(Boolean).join(', ')+' → '+[s.destination_city,s.destination_state].filter(Boolean).join(', '));route.className='partner-route';card.append(route);
 const list=E('dl');
 for(const [key,value] of [['Company',s.partner_name||'—'],['Status',s.status||'—'],['Pickup',fmt(s.pickup_at)],['Delivery',fmt(s.delivery_at)],['Equipment',s.equipment_type||'Not specified']])list.append(E('dt',key),E('dd',value));
 card.append(list);host.append(card)
 }
 if(!data.length){const empty=E('div','No eligible shipments are currently linked to your confirmed WorkRelief partner account. Contact your transportation administrator if you expected to see a load.');empty.className='partner-empty';host.append(empty)}
 status('Showing '+data.length+' shipment'+(data.length===1?'':'s')+' assigned to your linked partner accounts. This view is read-only.');
 }catch(error){const card=E('div','Unable to load authorized shipments.');card.className='partner-empty';host.append(card);status(error.message||'Shipment access unavailable',true)}
 finally{loading=false;$('partnerReload').disabled=false}
}
$('partnerReload').onclick=load;
(async()=>{const{data:{user},error}=await sb.auth.getUser();if(error||!user){status('Sign in with your confirmed WorkRelief account to view partner shipments.',true);return}await load()})();