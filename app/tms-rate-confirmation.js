import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
(async()=>{
const p=new URLSearchParams(location.search),root=document.getElementById('document');
const E=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
const fail=message=>root.replaceChildren(E('section','paper',message));
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
if(!p.get('load')){fail('Select a saved load first.');return}
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
try{
const auth=await sb.auth.getUser();if(auth.error||!auth.data?.user)throw Error('Sign in to view rate confirmations');
const uid=auth.data.user.id;
const [m,o]=await Promise.all([sb.from('workspace_members').select('workspace_id').eq('user_id',uid),sb.from('workspaces').select('id').eq('owner_id',uid)]);
if(m.error)throw m.error;if(o.error)throw o.error;
const allowed=new Set([...(m.data||[]).map(x=>x.workspace_id),...(o.data||[]).map(x=>x.id)]);
const ws=p.get('workspace')||(allowed.size===1?[...allowed][0]:null);
if(!ws||!allowed.has(ws))throw Error('Select an authorized workspace');
const result=await sb.from('tms_loads').select('*').eq('workspace_id',ws).eq('id',p.get('load')).eq('business_role','broker').single();
if(result.error)throw result.error;
const load=result.data,booking=load.booking_data||{};
if(!load.carrier_name?.trim())throw Error('Assign and save a carrier to this load before generating a Rate Confirmation.');
if(!(Number(load.carrier_rate)>0))throw Error('Save the agreed carrier rate before generating a Rate Confirmation.');
const stopResult=await sb.from('tms_stops').select('*').eq('workspace_id',ws).eq('load_id',load.id).order('stop_order');
if(stopResult.error)throw stopResult.error;
const settingsResponse=await sb.from('tms_document_settings').select('*').eq('workspace_id',ws).maybeSingle();if(settingsResponse.error)throw settingsResponse.error;const settings=settingsResponse.data||{};
const paper=E('section','paper');root.append(paper);const topBand=E('div','rate-brand-band');topBand.append(E('span','rate-brand-tag','TMS  /  TRANSPORTATION MANAGEMENT'),E('span','rate-brand-type','CARRIER RATE CONFIRMATION'));paper.append(topBand);
const head=E('div','dochead');paper.append(head);const logo=E('img','logo');logo.src='../assets/img/logo.png';logo.alt='WorkRelief';const meta=E('div','rate-doc-meta');meta.append(E('strong','','RATE CONFIRMATION'),E('span','','Load # '+load.load_number),E('span','','Issued '+new Date().toLocaleDateString()));head.append(logo,meta);if(settings.broker_name){const broker=E('div','rate-broker-identity');broker.append(E('strong','',settings.broker_name));for(const value of [settings.broker_address,settings.broker_phone,settings.broker_email,settings.broker_mc?'MC '+settings.broker_mc:'',settings.broker_dot?'USDOT '+settings.broker_dot:''])if(value)broker.append(E('span','',value));paper.append(broker)}paper.append(E('h1','','Carrier Rate Confirmation'));
const grid=E('div','grid');paper.append(grid);
function item(label,val){const box=E('div','item');box.append(E('span','',label),E('strong','',val||'—'));grid.append(box)}
item('Load Number',load.load_number);item('Customer',load.customer_name);item('Carrier',load.carrier_name);item('MC / DOT',booking.mc);item('Carrier Contact',booking.contact);item('Carrier Email',booking.email);item('Carrier Phone',booking.phone);
item('Pickup',[load.origin_city,load.origin_state,load.pickup_at?new Date(load.pickup_at).toLocaleString():''].filter(Boolean).join(' · '));
item('Delivery',[load.destination_city,load.destination_state,load.delivery_at?new Date(load.delivery_at).toLocaleString():''].filter(Boolean).join(' · '));
item('Equipment',load.equipment_type);item('Driver',booking.driver);item('Truck',booking.equipmentNumber);item('Trailer',booking.trailer);item('Agreed Carrier Rate',money(load.carrier_rate));
if(stopResult.data?.length){paper.append(E('h2','','Stops'));for(const s of stopResult.data)paper.append(E('p','',[s.stop_type,s.facility_name,s.address_line,s.city,s.region,s.postal_code,s.appointment_at?new Date(s.appointment_at).toLocaleString():''].filter(Boolean).join(' · ')))}
paper.append(E('h2','','Dispatch Instructions'),E('p','rate-instructions',booking.instructions||load.notes||'—'));const terms=E('section','rate-terms');terms.append(E('h2','','Carrier Terms & Acknowledgment'),E('p','','The carrier must confirm the load details, pickup and delivery appointments, and agreed all-in carrier rate before dispatch. Changes require broker approval. This document does not itself verify insurance, operating authority, or dispatch eligibility.'));if(settings.rate_confirmation_terms)terms.append(E('p','rate-custom-terms',settings.rate_confirmation_terms));if(settings.payment_terms)terms.append(E('p','rate-custom-terms','Payment Instructions: '+settings.payment_terms));paper.append(terms);const signatures=E('div','rate-signatures');for(const title of ['Authorized Broker Representative','Authorized Carrier Representative']){const box=E('div','rate-signature');box.append(E('div','rate-sign-line'),E('strong','',title),E('span','','Signature / Name / Date'));signatures.append(box)}paper.append(signatures);const footer=E('div','rate-footer');footer.append(E('strong','','WORKRELIEF  /  TMS'),E('span','','Carrier Rate Confirmation · Load '+load.load_number));if(settings.footer_text)footer.append(E('span','',settings.footer_text));paper.append(footer);
const actions=E('div','actions');root.append(actions);const back=E('a','email-link','Back to Load');back.href='tms-workflow-loads.html?portal=broker&workspace='+encodeURIComponent(ws)+'&id='+encodeURIComponent(load.id);actions.append(back);
const print=E('button','','Print / Save PDF');print.type='button';print.onclick=()=>window.print();actions.append(print);
}catch(error){fail(error?.message||'Unable to generate rate confirmation')}
})();