import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),el=(tag,value)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=String(value);return node};
const BUCKET='tms-driver-qualifications',MAX=10485760,UUID=/^[0-9a-f-]{36}$/i;
const documentLabels={license:'Driver License',medical_certificate:'Medical Examiner Certificate',mvr:'Motor Vehicle Record',employment_application:'Employment Application',road_test:'Road Test',annual_review:'Annual Review',other:'Other Qualification Record'};
let ws='',drivers=[],documents=[],history=[],activeReview=null,ready=false;
const status=(message,error=false)=>{const node=$('docRegisterStatus');node.textContent=message;node.style.color=error?'#b22a43':'#637b97'};
function date(x){return x?new Date(x).toLocaleDateString():'Not specified'}
function name(id){return drivers.find(x=>x.id===id)?.full_name||'Driver record'}
function selectOption(parent,value,text){const option=el('option',text);option.value=value;parent.append(option)}
function render(){
 const filter=$('documentFilter'),selected=filter.value;filter.replaceChildren();selectOption(filter,'','All Drivers');for(const driver of drivers)selectOption(filter,driver.id,driver.full_name);filter.value=selected;
 const rows=$('driverDocumentRows');rows.replaceChildren();
 const visible=documents.filter(d=>!filter.value||d.driver_id===filter.value);
 for(const doc of visible){
  const row=el('tr');
  for(const value of [name(doc.driver_id),documentLabels[doc.document_type]||doc.document_type,date(doc.document_expires_on),doc.review_status,date(doc.uploaded_at)])row.append(el('td',value));
  const actions=el('td');actions.className='qualification-doc-actions';
  const view=el('button','View Securely');view.type='button';view.onclick=()=>openDocument(doc);actions.append(view);
  const review=el('button','Review');review.type='button';review.onclick=()=>openReview(doc);actions.append(review);
  row.append(actions);rows.append(row);
 }
 if(!visible.length){const row=el('tr'),cell=el('td','No qualification documents recorded for this selection.');cell.colSpan=6;row.append(cell);rows.append(row)}
 const audit=$('driverQualificationHistory');audit.replaceChildren();
 for(const event of history.filter(x=>!filter.value||x.driver_id===filter.value).slice(0,100)){
  const item=el('div');item.className='qualification-audit-event';
  const heading=el('strong',name(event.driver_id)+' · '+event.activity.replaceAll('_',' '));item.append(heading);
  item.append(el('span',date(event.happened_at)+' · '+(event.new_status||'Recorded')));
  if(event.note)item.append(el('p',event.note));
  audit.append(item);
 }
 if(!audit.children.length)audit.append(el('p','No driver qualification review activity has been recorded.'));
}
async function reload(){
 const [people,docs,events]=await Promise.all([
 sb.from('tms_drivers').select('id,full_name').eq('workspace_id',ws).order('full_name').limit(1000),
 sb.from('tms_driver_qualification_documents').select('*').eq('workspace_id',ws).order('uploaded_at',{ascending:false}).limit(1000),
 sb.from('tms_driver_qualification_audit').select('*').eq('workspace_id',ws).order('happened_at',{ascending:false}).limit(1000)
 ]);
 for(const item of [people,docs,events])if(item.error)throw item.error;
 drivers=people.data||[];documents=docs.data||[];history=events.data||[];
 const dropdown=$('documentDriver'),selected=dropdown.value;dropdown.replaceChildren();selectOption(dropdown,'','Select driver');for(const driver of drivers)selectOption(dropdown,driver.id,driver.full_name);dropdown.value=drivers.some(d=>d.id===selected)?selected:'';
 render();status('Private qualification documents and review history loaded. Displaying up to 1,000 records per category.');
}
async function openDocument(doc){
 try{
  status('Preparing private file access…');
  const {data,error}=await sb.storage.from(BUCKET).createSignedUrl(doc.storage_path,60);
  if(error)throw error;
  if(!data?.signedUrl)throw Error('No secure document URL returned');
  window.open(data.signedUrl,'_blank','noopener,noreferrer');
  status('Opened a time-limited private document link.');
 }catch(error){status('Unable to open document: '+(error.message||'Access denied'),true)}
}
function openReview(doc){
 activeReview=doc;$('documentReviewForm').reset();$('documentReviewHeading').textContent='Review '+(documentLabels[doc.document_type]||'Qualification Document')+' · '+name(doc.driver_id);
 $('documentReviewForm').elements.namedItem('review_status').value=doc.review_status;
 $('documentReviewForm').elements.namedItem('review_notes').value=doc.review_notes||'';
 $('docReviewError').textContent='';$('documentReviewDialog').showModal();
}
$('documentReviewCancel').onclick=()=>$('documentReviewDialog').close();
$('documentReviewForm').onsubmit=async event=>{
 event.preventDefault();if(!ready||!activeReview)return;
 const submit=$('documentReviewSave');submit.disabled=true;$('docReviewError').textContent='';
 try{
  const fields=Object.fromEntries(new FormData(event.currentTarget));
  const {error}=await sb.rpc('tms_review_driver_qualification_document',{p_workspace:ws,p_document:activeReview.id,p_status:fields.review_status,p_note:fields.review_notes||''});
  if(error)throw error;$('documentReviewDialog').close();activeReview=null;await reload();status('Document review saved and recorded in history.');
 }catch(error){$('docReviewError').textContent=error.message||'Unable to review document'}
 finally{submit.disabled=false}
};
$('documentFilter').onchange=render;
$('driverDocumentForm').onsubmit=async event=>{
 event.preventDefault();if(!ready)return;
 const submit=$('docUploadButton');submit.disabled=true;$('docUploadError').textContent='';
 let uploadedPath='';
 try{
  const fields=Object.fromEntries(new FormData(event.currentTarget));
  const file=fields.file;
  if(!(file instanceof File)||!file.size||file.size>MAX)throw Error('Choose a document no larger than 10 MB.');
  if(!UUID.test(fields.driver_id)||!drivers.some(d=>d.id===fields.driver_id))throw Error('Choose a valid driver in this workspace.');
  const extensions={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'},ext=extensions[file.type];
  if(!ext)throw Error('Only PDF, JPG, and PNG files are permitted.');
  if(!file.name||file.name.length>160)throw Error('The file name must be 160 characters or fewer.');
  const name=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():null;
  if(!name)throw Error('Secure file identifier unavailable in this browser.');
  uploadedPath=ws+'/'+fields.driver_id+'/'+name+'.'+ext;
  const upload=await sb.storage.from(BUCKET).upload(uploadedPath,file,{contentType:file.type,upsert:false,cacheControl:'0'});
  if(upload.error)throw upload.error;
  const saved=await sb.rpc('tms_register_driver_qualification_document',{
   p_workspace:ws,p_driver:fields.driver_id,p_kind:fields.document_type,p_path:uploadedPath,p_filename:file.name,
   p_mime:file.type,p_size:file.size,p_expiration:fields.expires_on||null
  });
  if(saved.error)throw saved.error;
  uploadedPath='';event.currentTarget.reset();await reload();status('Qualification document uploaded privately and registered for review.');
 }catch(error){
  $('docUploadError').textContent=error.message||'Document upload failed';
  if(uploadedPath){await sb.storage.from(BUCKET).remove([uploadedPath]).catch(()=>{});}
 }finally{submit.disabled=false}
};
(async()=>{
 try{
  const {data:{user},error}=await sb.auth.getUser();if(error||!user)return;
  const requested=new URLSearchParams(location.search).get('workspace');
  const [members,owned]=await Promise.all([
   sb.from('workspace_members').select('workspace_id,role').eq('user_id',user.id),
   sb.from('workspaces').select('id').eq('owner_id',user.id)
  ]);if(members.error)throw members.error;if(owned.error)throw owned.error;
  const ids=[...new Set([...(members.data||[]).map(x=>x.workspace_id),...(owned.data||[]).map(x=>x.id)])];
  if(requested&&!ids.includes(requested))return;
  ws=requested||ids[0];
  if(!ws)return;
  const member=(members.data||[]).find(x=>x.workspace_id===ws);
  const isAdmin=(owned.data||[]).some(x=>x.id===ws)||['owner','admin'].includes(member?.role);
  if(!isAdmin)return;
  ready=true;$('driverDocumentsPanel').hidden=false;await reload();
 }catch(error){status('Unable to load private qualification records: '+(error.message||'Unknown error'),true)}
})();