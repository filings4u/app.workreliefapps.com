import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),E=(tag,t)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=String(t);return n};
const bucket='tms-driver-trip-submissions',loadId=new URLSearchParams(location.search).get('id');let ws='',canReview=false,items=[],busy=false;
function report(t,error=false){const n=$('driverSubmissionState');n.textContent=t;n.style.color=error?'#b22a45':'#647c95'}
async function preview(item){const tab=window.open('about:blank','_blank');try{
const{data,error}=await sb.storage.from(bucket).createSignedUrl(item.storage_path,60);if(error)throw error;if(!data?.signedUrl)throw Error('Private document access unavailable');if(!tab)throw Error('Allow document popups for WorkRelief');tab.opener=null;tab.location.replace(data.signedUrl)
}catch(error){if(tab)tab.close();report('Unable to view: '+(error.message||'Access denied'),true)}}
async function review(item,status){if(busy||!canReview||item.review_status!=='pending')return;
const message=window.prompt(status==='accepted'?'Review notes (optional):':'Reason for rejection:','');
if(message===null)return;if(message.length>1000){report('Notes cannot exceed 1,000 characters.',true);return}
if(status==='rejected'&&message.trim().length<5){report('Provide a rejection reason of at least five characters.',true);return}
if(!window.confirm((status==='accepted'?'Accept':'Reject')+' this driver submission? Acceptance will not create an official POD.'))return;
busy=true;try{const{error}=await sb.rpc('tms_review_driver_trip_document',{p_workspace:ws,p_document:item.id,p_status:status,p_note:message.trim()});if(error)throw error;await load();report('Driver submission '+status+'. This review does not automatically satisfy the official POD requirement.')}
catch(error){report('Unable to save review: '+(error.message||'Unknown error'),true)}
finally{busy=false}}
function render(){const host=$('driverSubmissionRows');host.replaceChildren();
for(const item of items){const row=E('div');row.className='tms-driver-submission';
const info=E('div');info.append(E('strong',(item.document_type||'document').replaceAll('_',' ')),E('span',(item.filename||'File')+' · '+new Date(item.created_at).toLocaleString()),E('span','Review: '+item.review_status));
if(item.note)info.append(E('p',item.note));if(item.review_note)info.append(E('p','Staff review: '+item.review_note));row.append(info);
const actions=E('div');actions.className='tms-driver-submission-actions';const view=E('button','View Private File');view.type='button';view.onclick=()=>preview(item);actions.append(view);
if(canReview&&item.review_status==='pending'){for(const [label,status] of [['Accept Submission','accepted'],['Reject','rejected']]){const b=E('button',label);b.type='button';b.onclick=()=>review(item,status);actions.append(b)}}
row.append(actions);host.append(row)}
if(!items.length)host.append(E('p','No driver trip documents submitted for this load.'))}
async function load(){const{data,error}=await sb.from('tms_driver_trip_documents').select('id,document_type,storage_path,filename,note,review_note,review_status,created_at').eq('workspace_id',ws).eq('load_id',loadId).order('created_at',{ascending:false}).limit(150);
if(error)throw error;items=data||[];render();report('Reviewing '+items.length+' driver submissions. Official POD documents must be handled through Transportation Documents.')}
async function loadPartnerExchange(){
 const status=$('partnerExchangeStaffState'),host=$('partnerExchangeStaffRows');host.replaceChildren();
 const{data,error}=await sb.from('tms_partner_submissions').select('id,partner_id,submission_kind,document_type,storage_path,filename,message,review_status,reviewer_note,created_at').eq('workspace_id',ws).eq('load_id',loadId).order('created_at',{ascending:false}).limit(150);
 if(error){status.textContent='Partner submissions unavailable: '+error.message;return}
 for(const entry of data||[]){
 const row=E('div');row.className='tms-driver-submission';
 const copy=E('div');copy.append(E('strong',(entry.submission_kind==='document'?entry.document_type||'document':'Operations Message').replaceAll('_',' ')),E('span','From linked partner · '+new Date(entry.created_at).toLocaleString()+' · '+entry.review_status));
 if(entry.filename)copy.append(E('span',entry.filename));if(entry.message)copy.append(E('p',entry.message));if(entry.reviewer_note)copy.append(E('p','Staff response: '+entry.reviewer_note));row.append(copy);
 const buttons=E('div');buttons.className='tms-driver-submission-actions';
 if(entry.storage_path){const b=E('button','View Private File');b.type='button';b.onclick=()=>viewPartnerDocument(entry);buttons.append(b)}
 if(canReview&&entry.review_status==='pending'){
  const options=entry.submission_kind==='message'?[['Respond','responded'],['Reject','rejected']]:[['Accept','accepted'],['Reject','rejected']];
  for(const [label,decision]of options){const b=E('button',label);b.type='button';b.onclick=()=>reviewPartner(entry,decision);buttons.append(b)}
 }
 row.append(buttons);host.append(row);
 }
 if(!(data||[]).length)host.append(E('p','No customer or carrier messages or documents for this shipment.'));
 status.textContent=(data||[]).length+' linked partner submission(s) available for review.';
}
async function viewPartnerDocument(entry){
 const tab=window.open('about:blank','_blank');
 try{const{data,error}=await sb.storage.from('tms-partner-exchange').createSignedUrl(entry.storage_path,60);if(error)throw error;if(!data?.signedUrl)throw Error('No private document URL');if(!tab)throw Error('Allow popups for document access');tab.opener=null;tab.location.replace(data.signedUrl)}
 catch(error){if(tab)tab.close();$('partnerExchangeStaffState').textContent='Private document unavailable: '+error.message}
}
async function reviewPartner(entry,decision){
 if(!canReview)return;
 const note=window.prompt(decision==='responded'?'Response to the customer or carrier:':'Review notes:','');
 if(note===null)return;
 if(decision==='responded'&&note.trim().length<5){$('partnerExchangeStaffState').textContent='Reply needs at least five characters.';return}
 if(!window.confirm('Record '+decision+' for this submission? It does not publish an official POD.'))return;
 const{error}=await sb.rpc('tms_review_partner_exchange',{p_workspace:ws,p_submission:entry.id,p_decision:decision,p_note:note.trim()});
 if(error){$('partnerExchangeStaffState').textContent='Unable to review: '+error.message;return}
 await loadPartnerExchange();
}
(async()=>{try{if(!loadId){report('Select a load before reviewing driver submissions.');return}
const{data:{user},error}=await sb.auth.getUser();if(error||!user){report('Sign in to view driver submissions.',true);return}
const [members,owned]=await Promise.all([sb.from('workspace_members').select('workspace_id,role').eq('user_id',user.id),sb.from('workspaces').select('id').eq('owner_id',user.id)]);
if(members.error)throw members.error;if(owned.error)throw owned.error;
const allowed=[...new Set([...(members.data||[]).map(x=>x.workspace_id),...(owned.data||[]).map(x=>x.id)])],requested=new URLSearchParams(location.search).get('workspace');
if(requested&&!allowed.includes(requested))throw Error('Access denied to this workspace');
ws=requested||allowed[0];if(!ws)throw Error('No authorized workspace available');
canReview=(owned.data||[]).some(x=>x.id===ws)||(members.data||[]).some(x=>x.workspace_id===ws&&['owner','admin','member'].includes(x.role));
await load();await loadPartnerExchange();
}catch(error){report('Driver submissions unavailable: '+(error.message||'Unknown error'),true)}})();