import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),E=(tag,v)=>{const el=document.createElement(tag);if(v!==undefined)el.textContent=String(v);return el};
const status=(text,error=false)=>{const el=$('partnerStatus');el.textContent=text;el.style.color=error?'#b02d49':'#637f9a'};
const fmt=value=>value?new Date(value).toLocaleString():'Not scheduled';
let loading=false,shipments=[],exchange=[],submitting=false;
async function load(){
 if(loading)return;loading=true;$('partnerReload').disabled=true;status('Loading your authorized shipment records…');
 const host=$('partnerShipmentList');host.replaceChildren();
 try{
 const {data,error}=await sb.rpc('tms_my_partner_shipments');if(error)throw error;
 if(!Array.isArray(data))throw Error('Unexpected shipment response');shipments=data;
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
 await reloadExchange();
 }catch(error){const card=E('div','Unable to load authorized shipments.');card.className='partner-empty';host.append(card);status(error.message||'Shipment access unavailable',true)}
 finally{loading=false;$('partnerReload').disabled=false}
}
const exchangeState=(s,error=false)=>{const n=$('partnerExchangeState');n.textContent=s;n.style.color=error?'#b02d49':'#647d99'};
$('partnerExchangeKind').onchange=()=>{const files=$('partnerExchangeKind').value==='document';$('partnerExchangeDocKind').hidden=!files;$('partnerExchangeDocFile').hidden=!files;};
function renderExchange(){
 const select=$('partnerExchangeLoad'),selected=select.value;select.replaceChildren();
 const zero=E('option','Select Shipment');zero.value='';select.append(zero);
 for(const s of shipments){const opt=E('option',s.load_number||'Shipment');opt.value=s.workspace_id+'|'+s.load_id;select.append(opt)}
 if([...select.options].some(o=>o.value===selected))select.value=selected;
 const host=$('partnerExchangeRows');host.replaceChildren();
 for(const item of exchange){const row=E('article');row.className='partner-exchange-item';
 row.append(E('strong',item.submission_kind+' · '+(item.document_type||'operations message')),E('span',item.review_status+' · '+new Date(item.created_at).toLocaleString()));
 if(item.message)row.append(E('p',item.message));
 if(item.reviewer_note)row.append(E('p','Staff response: '+item.reviewer_note));
 if(item.storage_path){const view=E('button','View Private Document');view.type='button';view.onclick=()=>openExchangeFile(item);row.append(view)}host.append(row)}
 if(!exchange.length)host.append(E('p','No shipment messages or documents submitted yet.'));
}
async function reloadExchange(){
 const {data,error}=await sb.from('tms_partner_submissions').select('id,workspace_id,load_id,submission_kind,document_type,storage_path,message,review_status,reviewer_note,created_at').order('created_at',{ascending:false}).limit(150);
 if(error){exchangeState('Unable to load submission history: '+error.message,true);return}
 exchange=data||[];renderExchange();exchangeState('Private shipment communications loaded.');
}
async function openExchangeFile(item){
 const win=window.open('about:blank','_blank');
 try{const {data,error}=await sb.storage.from('tms-partner-exchange').createSignedUrl(item.storage_path,60);
 if(error)throw error;if(!data?.signedUrl)throw Error('Private document link unavailable');if(!win)throw Error('Enable popups to open documents');
 win.opener=null;win.location.replace(data.signedUrl)}
 catch(error){if(win)win.close();exchangeState(error.message,true)}
}
$('partnerExchangeForm').onsubmit=async event=>{
 event.preventDefault();if(submitting)return;
 const values=Object.fromEntries(new FormData(event.currentTarget)),[ws,load]=String(values.trip||'').split('|');
 if(!shipments.some(s=>s.workspace_id===ws&&s.load_id===load)){exchangeState('Select an authorized shipment.',true);return}
 const hasFile=values.kind==='document';
 if(!hasFile&&String(values.message||'').trim().length<5){exchangeState('Message needs at least five characters.',true);return}
 let path=null,mime=null,size=null,filename=null;
 if(hasFile){const file=values.file,extensions={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'};
 if(!(file instanceof File)||!extensions[file.type]||file.size<1||file.size>10485760||file.name.length>160){exchangeState('Choose a valid PDF, JPG, or PNG file under 10 MB.',true);return}
 const auth=await sb.auth.getUser();if(auth.error||!auth.data?.user){exchangeState('Sign in required.',true);return}
 path=ws+'/'+load+'/'+auth.data.user.id+'/'+crypto.randomUUID()+'.'+extensions[file.type];mime=file.type;size=file.size;filename=file.name}
 submitting=true;$('partnerExchangeSave').disabled=true;exchangeState('Saving private partner submission…');
 try{
 if(path){const upload=await sb.storage.from('tms-partner-exchange').upload(path,values.file,{upsert:false,contentType:mime,cacheControl:'0'});if(upload.error)throw upload.error}
 const {error}=await sb.rpc('tms_submit_partner_exchange',{p_workspace:ws,p_load:load,p_kind:values.kind,p_message:values.message||'',p_doc_type:hasFile?values.document_type:null,p_path:path,p_filename:filename,p_mime:mime,p_size:size});
 if(error)throw error;event.currentTarget.reset();$('partnerExchangeDocKind').hidden=true;$('partnerExchangeDocFile').hidden=true;
 await reloadExchange();exchangeState('Submission saved for operations staff. No official document status was changed.');
 }catch(error){exchangeState('Submission failed: '+(error.message||'Unknown error'),true)}
 finally{submitting=false;$('partnerExchangeSave').disabled=false}
};

$('partnerReload').onclick=load;
(async()=>{const{data:{user},error}=await sb.auth.getUser();if(error||!user){status('Sign in with your confirmed WorkRelief account to view partner shipments.',true);return}await load()})();