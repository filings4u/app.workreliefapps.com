import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),E=(tag,t)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=String(t);return n};
const bucket='tms-driver-trip-submissions',limit=10485760;let trips=[],docs=[],busy=false;
const status=(text,error=false)=>{const n=$('driverDocStatus');n.textContent=text;n.style.color=error?'#ae3150':'#667c95'};
const fmt=v=>v?new Date(v).toLocaleString():'—';
function draw(){
 const choices=$('driverDocTrip'),previous=choices.value;choices.replaceChildren();const empty=E('option','Select Assigned Trip');empty.value='';choices.append(empty);
 for(const trip of trips.filter(x=>['dispatched','completed'].includes(x.assignment_status)&&['dispatched','in_transit','delivered'].includes(x.load_status))){const opt=E('option',trip.load_number||'Shipment');opt.value=trip.workspace_id+'|'+trip.load_id;choices.append(opt)}
 if([...choices.options].some(o=>o.value===previous))choices.value=previous;
 const rows=$('driverDocRows');rows.replaceChildren();
 for(const d of docs){const tr=E('tr'),trip=trips.find(t=>t.load_id===d.load_id&&t.workspace_id===d.workspace_id);
 for(const text of [trip?.load_number||'Assigned trip',d.document_type.replaceAll('_',' '),fmt(d.created_at),d.review_status])tr.append(E('td',text));
 const td=E('td');const btn=E('button','View');btn.type='button';btn.onclick=()=>view(d);td.append(btn);tr.append(td);rows.append(tr)}
 if(!docs.length){const tr=E('tr'),td=E('td','No trip documents have been submitted.');td.colSpan=5;tr.append(td);rows.append(tr)}
}
async function reload(){
 const [t,d]=await Promise.all([sb.rpc('tms_my_driver_trips'),sb.from('tms_driver_trip_documents').select('id,workspace_id,load_id,storage_path,document_type,created_at,review_status').order('created_at',{ascending:false}).limit(150)]);
 if(t.error)throw t.error;if(d.error)throw d.error;trips=Array.isArray(t.data)?t.data:[];docs=d.data||[];draw();
 status('Showing private submissions linked to your account. A submitted POD is pending staff review.');
}
async function view(d){
 const w=window.open('about:blank','_blank');
 try{const{data,error}=await sb.storage.from(bucket).createSignedUrl(d.storage_path,60);if(error)throw error;if(!data?.signedUrl)throw Error('Secure viewing link unavailable');if(!w)throw Error('Allow popups to view private documents');w.opener=null;w.location.replace(data.signedUrl)}
 catch(err){if(w)w.close();status('Unable to open document: '+(err.message||'Unknown error'),true)}
}
$('driverTripDocumentForm').onsubmit=async event=>{
 event.preventDefault();if(busy)return;
 const data=Object.fromEntries(new FormData(event.currentTarget)),[ws,load]=String(data.trip||'').split('|'),trip=trips.find(t=>t.workspace_id===ws&&t.load_id===load);
 const file=data.file;const allowed={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'};
 if(!trip){$('driverDocError').textContent='Choose an assigned trip.';return}
 if(!(file instanceof File)||file.size<1||file.size>limit||!allowed[file.type]){$('driverDocError').textContent='Select a PDF, JPG, or PNG no larger than 10 MB.';return}
 if(file.name.length>160){$('driverDocError').textContent='File name cannot exceed 160 characters.';return}
 const {data:auth,error:authErr}=await sb.auth.getUser();if(authErr||!auth.user){$('driverDocError').textContent='Sign in is required.';return}
 const id=crypto.randomUUID(),path=ws+'/'+load+'/'+auth.user.id+'/'+id+'.'+allowed[file.type];
 busy=true;$('driverDocUpload').disabled=true;$('driverDocError').textContent='';status('Uploading private trip document…');
 try{
  const upload=await sb.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false,cacheControl:'0'});
  if(upload.error)throw upload.error;
  const save=await sb.rpc('tms_submit_driver_trip_document',{p_workspace:ws,p_load:load,p_kind:data.document_type,p_path:path,p_filename:file.name,p_mime:file.type,p_size:file.size,p_note:data.note||''});
  if(save.error)throw save.error;event.currentTarget.reset();await reload();status('Document submitted to dispatch for review. It is not automatically an official POD.');
 }catch(error){$('driverDocError').textContent=error.message||'Submission failed';status('Unable to finish document submission.',true)}
 finally{busy=false;$('driverDocUpload').disabled=false}
};
(async()=>{try{const{data:{user},error}=await sb.auth.getUser();if(error||!user){status('Sign in to view trip documents.',true);return}await reload()}catch(err){status('Driver documents unavailable: '+(err.message||'Unknown error'),true)}})();