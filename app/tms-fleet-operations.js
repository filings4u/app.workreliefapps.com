import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),E=(tag,value)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=String(value);return node};
let ws='',canWrite=false,canAdmin=false,equipment=[],drivers=[],inspections=[],fuel=[],hos=[],requests=[],mileage=[];
const message=(value,error=false)=>{const n=$('fleetOpsState');n.textContent=value;n.style.color=error?'#b52d49':'#657d97'};
const fmt=value=>value?new Date(value).toLocaleString():'—';
const unit=id=>equipment.find(e=>e.id===id)?.unit_number||'Unit';
const driver=id=>drivers.find(d=>d.id===id)?.full_name||'Driver';
function renderList(id,records,render){const host=$(id);host.replaceChildren();if(!records.length){host.append(E('p','No records saved in this workspace.'));return}for(const r of records){const item=E('article');item.className='ops-item';render(item,r);host.append(item)}}
function show(){
 for(const sel of document.querySelectorAll('[data-equipment]')){const val=sel.value;sel.replaceChildren();const none=E('option','Select Equipment');none.value='';sel.append(none);for(const e of equipment){const opt=E('option',e.unit_number+' · '+e.equipment_kind);opt.value=e.id;sel.append(opt)}if(equipment.some(e=>e.id===val))sel.value=val}
 const dr=$('hosDriver'),v=dr.value;dr.replaceChildren();const empty=E('option','Select Driver');empty.value='';dr.append(empty);for(const d of drivers){const opt=E('option',d.full_name);opt.value=d.id;dr.append(opt)}if(drivers.some(d=>d.id===v))dr.value=v;
 renderList('inspectionRows',inspections,(item,r)=>{item.append(E('strong',unit(r.equipment_id)+' · '+r.inspection_kind.replaceAll('_',' ')),E('span',fmt(r.inspected_at)+' · '+(r.safety_critical?'SAFETY-CRITICAL DEFECT':r.defect_found?'Defect recorded':'No defect')+' · '+r.status));if(r.defect_description)item.append(E('span',r.defect_description));if(r.resolution_notes)item.append(E('span','Resolution: '+r.resolution_notes));if(r.safety_critical&&r.status!=='resolved'&&canAdmin){const b=E('button','Record Repair & Resolve');b.type='button';b.onclick=()=>resolve(r);item.append(b)}});
 renderList('fuelRows',fuel,(item,r)=>item.append(E('strong',unit(r.equipment_id)+' · '+r.jurisdiction+' · '+r.purchased_on),E('span',Number(r.gallons).toFixed(3)+' gallons · $'+Number(r.total_cost).toFixed(2)),E('span',r.vendor||r.receipt_reference||'No receipt reference')));
 const gallons=fuel.reduce((a,r)=>a+Number(r.gallons||0),0),cost=fuel.reduce((a,r)=>a+Number(r.total_cost||0),0);$('fuelSummary').textContent=fuel.length+' purchases · '+gallons.toFixed(3)+' gallons · $'+cost.toFixed(2)+' in displayed entries (up to 1000)';
 renderList('mileageRows',mileage,(item,r)=>item.append(E('strong',unit(r.equipment_id)+' · '+r.jurisdiction+' · '+r.trip_date),E('span',Number(r.miles).toFixed(2)+' manual miles'),E('span',r.notes||'No source notes')));
 renderList('hosRows',hos,(item,r)=>item.append(E('strong',driver(r.driver_id)+' · '+r.attested_on),E('span',r.duty_status.replaceAll('_',' ')+' · MANUAL, NOT ELD VERIFIED'),E('span',r.notes||'No notes')));
 renderList('integrationRows',requests,(item,r)=>item.append(E('strong',r.provider_name+' · '+r.integration_kind.toUpperCase()),E('span','Status: '+r.approval_status+' · '+fmt(r.created_at)),E('span',r.requested_scope)));
 document.querySelectorAll('.ops-form button').forEach(b=>b.disabled=!canWrite||((b.closest('form')?.id==='integrationForm')&&!canAdmin));
 $('exportFuel').disabled=!fuel.length;
}
async function reload(){
 const tables=['tms_equipment','tms_drivers','tms_vehicle_inspections','tms_fuel_entries','tms_driver_hos_attestations','tms_integration_requests','tms_jurisdiction_mileage'];
 const values=await Promise.all(tables.map(t=>sb.from(t).select('*').eq('workspace_id',ws).order('created_at',{ascending:false}).limit(1000)));
 for(const result of values)if(result.error)throw result.error;
 [equipment,drivers,inspections,fuel,hos,requests,mileage]=values.map(r=>r.data||[]);
 show();message('Live WorkRelief fleet operations records loaded. Up to 1,000 rows per list.');
}
function submit(formId,rpc,build){$(formId).onsubmit=async ev=>{
 ev.preventDefault();if(!canWrite||formId==='integrationForm'&&!canAdmin)return;
 const form=ev.currentTarget,button=form.querySelector('button[type=submit]');button.disabled=true;
 try{const v=Object.fromEntries(new FormData(form));const args=build(v);const result=await sb.rpc(rpc,args);if(result.error)throw result.error;form.reset();await reload();message('Record saved successfully in the authorized workspace.')}
 catch(error){message('Unable to save '+formId+': '+(error.message||'Unknown error'),true)}
 finally{button.disabled=false}
}}
submit('inspectionForm','tms_record_vehicle_inspection',v=>({p_workspace:ws,p_equipment:v.equipment,p_kind:v.kind,p_time:new Date(v.time).toISOString(),p_odometer:v.odometer===''?null:Number(v.odometer),p_defect:v.defect==='on',p_critical:v.critical==='on',p_description:v.description||'',p_driver:null}));
submit('fuelForm','tms_record_fuel_entry',v=>({p_workspace:ws,p_equipment:v.equipment,p_driver:null,p_date:v.date,p_jurisdiction:v.jurisdiction.toUpperCase(),p_vendor:v.vendor||'',p_gallons:Number(v.gallons),p_total:Number(v.cost),p_odometer:v.odometer===''?null:Number(v.odometer),p_receipt:v.receipt||''}));
submit('mileageForm','tms_record_jurisdiction_mileage',v=>({p_workspace:ws,p_equipment:v.equipment,p_day:v.date,p_jurisdiction:v.jurisdiction.toUpperCase(),p_miles:Number(v.miles),p_load:null,p_notes:v.notes||''}));
submit('hosForm','tms_record_hos_attestation',v=>({p_workspace:ws,p_driver:v.driver,p_day:v.date,p_duty:v.status,p_notes:v.notes||''}));
submit('integrationForm','tms_request_integration',v=>({p_workspace:ws,p_provider:v.provider,p_kind:v.kind,p_scope:v.scope}));
let iftaRows=[];
$('iftaRun').onclick=async()=>{
 const from=$('iftaFrom').value,to=$('iftaThrough').value;
 if(!from||!to||from>to){$('iftaState').textContent='Choose a valid period';return}
 const result=await sb.rpc('tms_ifta_source_summary',{p_workspace:ws,p_start:from,p_end:to});
 if(result.error){$('iftaState').textContent=result.error.message;return}
 iftaRows=Array.isArray(result.data?.jurisdictions)?result.data.jurisdictions:[];
 const host=$('iftaSummary');host.replaceChildren();
 for(const j of iftaRows){
  const row=E('article');row.className='ops-item';
  row.append(E('strong',j.jurisdiction),E('span',String(j.miles)+' manual miles'),E('span',String(j.purchased_gallons)+' fuel gallons'));
  host.append(row);
 }
 $('iftaState').textContent=result.data?.notice||'Unverified source summary only';
 $('iftaExport').disabled=iftaRows.length===0;
};
async function resolve(item){if(!canAdmin)return;const notes=window.prompt('Describe repairs and checks performed before resolving this safety-critical defect:');if(notes===null)return;if(notes.trim().length<8){message('Enter at least eight characters describing the repair and review.',true);return}
 try{const {error}=await sb.rpc('tms_resolve_vehicle_inspection',{p_workspace:ws,p_inspection:item.id,p_notes:notes.trim()});if(error)throw error;await reload();message('Inspection resolution recorded and dispatch hold updated.')}catch(error){message('Unable to resolve inspection: '+(error.message||'Unknown error'),true)}
}
$('exportFuel').onclick=()=>{
 const quote=v=>{let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
 const cols=['Date','Equipment','Jurisdiction','Vendor','Gallons','Total Cost USD','Odometer','Receipt'];
 const body=[cols.map(quote).join(',')];for(const f of fuel)body.push([f.purchased_on,unit(f.equipment_id),f.jurisdiction,f.vendor,Number(f.gallons).toFixed(3),Number(f.total_cost).toFixed(2),f.odometer_miles??'',f.receipt_reference].map(quote).join(','));
 const blob=new Blob(['\ufeff'+body.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='workrelief-tms-fuel-'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(url);
};
(async()=>{try{
 const{data:{user},error}=await sb.auth.getUser();if(error||!user)throw Error('Sign in to WorkRelief to access fleet operations');
 const [m,w]=await Promise.all([sb.from('workspace_members').select('workspace_id,role').eq('user_id',user.id),sb.from('workspaces').select('id').eq('owner_id',user.id)]);
 if(m.error)throw m.error;if(w.error)throw w.error;
 const allowed=[...new Set([...(m.data||[]).map(x=>x.workspace_id),...(w.data||[]).map(x=>x.id)])],requested=new URLSearchParams(location.search).get('workspace');
 if(requested&&!allowed.includes(requested))throw Error('Access denied to this workspace');
 ws=requested||(allowed.length===1?allowed[0]:'');if(!ws)throw Error('Choose your authorized WorkRelief workspace');
 const role=(m.data||[]).find(x=>x.workspace_id===ws)?.role,owner=(w.data||[]).some(x=>x.id===ws);canWrite=owner||['owner','admin','member'].includes(role);canAdmin=owner||['owner','admin'].includes(role);
 $('fleetOpsContent').hidden=false;const today=new Date().toISOString().slice(0,10);document.querySelector('#fuelForm [name=date]').value=today;document.querySelector('#hosForm [name=date]').value=today;document.querySelector('#mileageForm [name=date]').value=today;const year=new Date().getFullYear(),quarterStart=Math.floor(new Date().getMonth()/3)*3;$('iftaFrom').value=new Date(Date.UTC(year,quarterStart,1)).toISOString().slice(0,10);$('iftaThrough').value=today;const n=new Date(),local=new Date(n.getTime()-n.getTimezoneOffset()*60000).toISOString().slice(0,16);document.querySelector('#inspectionForm [name=time]').value=local;
 await reload();
 }catch(error){message('Fleet operations unavailable: '+(error.message||'Unknown error'),true)}})();