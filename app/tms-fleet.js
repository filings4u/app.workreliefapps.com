import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),qs=new URLSearchParams(location.search);let workspace='',tab='drivers',drivers=[],equipment=[],services=[],editing=null,canWrite=false,selectedService=null;
const def={drivers:[['full_name','Full name',true],['phone','Phone',false],['email','Email',false],['license_state','License state',false],['status','Status',true]],equipment:[['unit_number','Unit number',true],['equipment_kind','Kind',true],['equipment_type','Equipment type',false],['plate_number','Plate number',false],['vin','VIN',false],['status','Status',true]]};
const make=(tag,txt)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=String(txt);return e};
function notice(msg,error=false){$('status').textContent=msg;$('status').style.color=error?'#b22742':'#627895'}
function navLinks(){for(const [id,file] of [['nav-home','tms-shell-broker.html'],['nav-loads','tms-workflow-loads.html'],['nav-docs','tms-workflow-documents.html']]){const node=$(id);if(node)node.href=file+'?workspace='+encodeURIComponent(workspace)+'&portal=broker'}}
function render(){const data=tab==='drivers'?drivers:equipment,q=$('search').value.toLowerCase().trim();$('driversTab').setAttribute('aria-selected',String(tab==='drivers'));$('equipmentTab').setAttribute('aria-selected',String(tab==='equipment'));$('add').textContent=tab==='drivers'?'Add Driver':'Add Equipment';$('add').hidden=!canWrite;$('driverCount').textContent=drivers.length;$('truckCount').textContent=equipment.filter(x=>x.equipment_kind==='truck').length;$('trailerCount').textContent=equipment.filter(x=>x.equipment_kind==='trailer').length;$('holdCount').textContent=equipment.filter(x=>/maintenance|out.of.service|hold/i.test(x.status||'')).length;
const tr=make('tr');for(const name of (tab==='drivers'?['Name','Phone','Email','License State','Status','Actions']:['Unit','Kind','Type','Plate','VIN','Status','Actions']))tr.append(make('th',name));$('head').replaceChildren(tr);$('rows').replaceChildren();const fields=tab==='drivers'?['full_name','phone','email','license_state','status']:['unit_number','equipment_kind','equipment_type','plate_number','vin','status'];
const filtered=data.filter(x=>fields.map(f=>x[f]||'').join(' ').toLowerCase().includes(q));for(const record of filtered){const row=make('tr');for(const f of fields)row.append(make('td',record[f]||'—'));const actions=make('td');if(canWrite){const edit=make('button','Edit');edit.onclick=()=>openEditor(record);actions.append(edit);if(tab==='equipment'){const schedule=make('button','Schedule Service');schedule.onclick=()=>openService(record.id);actions.append(schedule)}}row.append(actions);$('rows').append(row)}if(!filtered.length){const row=make('tr'),empty=make('td','No matching records in this workspace.');empty.colSpan=fields.length+1;row.append(empty);$('rows').append(row)}}
async function reload(){const [d,e,s]=await Promise.all([sb.from('tms_drivers').select('*').eq('workspace_id',workspace).order('created_at',{ascending:false}).limit(1000),sb.from('tms_equipment').select('*').eq('workspace_id',workspace).order('created_at',{ascending:false}).limit(1000),sb.from('tms_equipment_service').select('*').eq('workspace_id',workspace).order('created_at',{ascending:false}).limit(1000)]);for(const item of [d,e,s])if(item.error)throw item.error;drivers=d.data||[];equipment=e.data||[];services=s.data||[];render();renderServices();notice('Live fleet and maintenance records loaded. Up to 1,000 per category.')}
function openEditor(record=null){if(!canWrite)return;editing=record;const fields=$('fields');fields.replaceChildren();$('editorTitle').textContent=(record?'Edit ':'Add ')+(tab==='drivers'?'Driver':'Equipment');$('formError').textContent='';for(const [name,label,required] of def[tab]){const wrapper=make('label',label);let input;if(name==='status'||name==='equipment_kind'){input=make('select');const opts=name==='status'?(tab==='drivers'?['active','inactive','unavailable']:['available','assigned','maintenance','inactive']):['truck','trailer'];for(const val of opts){const opt=make('option',val.replaceAll('_',' '));opt.value=val;input.append(opt)}}else{input=make('input');input.type=name==='email'?'email':'text';input.maxLength=name==='vin'?17:160}input.name=name;input.required=required;input.value=record?.[name]??(name==='status'?(tab==='drivers'?'active':'available'):'');wrapper.append(input);fields.append(wrapper)}$('editor').showModal()}
$('driversTab').onclick=()=>{tab='drivers';render()};$('equipmentTab').onclick=()=>{tab='equipment';render()};$('search').oninput=render;$('add').onclick=()=>openEditor();$('cancel').onclick=()=>$('editor').close();$('refresh').onclick=()=>reload().catch(e=>notice(e.message,true));
$('recordForm').onsubmit=async e=>{e.preventDefault();if(!canWrite)return;const table=tab==='drivers'?'tms_drivers':'tms_equipment',data=Object.fromEntries(new FormData(e.currentTarget));$('save').disabled=true;$('formError').textContent='';try{let request=editing?sb.from(table).update(data).eq('workspace_id',workspace).eq('id',editing.id):sb.from(table).insert({...data,workspace_id:workspace});const {error}=await request;if(error)throw error;$('editor').close();await reload();notice('Record saved to WorkRelief.')}catch(err){$('formError').textContent=err.message||'Save failed'}finally{$('save').disabled=false}};
function serviceDate(value){return value?new Date(value).toLocaleString():'Not set'}
function serviceUnit(id){return equipment.find(e=>e.id===id)?.unit_number||'Unknown unit'}
function renderServices(){
 const now=Date.now();$('serviceScheduled').textContent=String(services.filter(s=>s.status==='scheduled').length);
 $('serviceOpen').textContent=String(services.filter(s=>s.status==='open').length);
 $('serviceOverdue').textContent=String(services.filter(s=>['scheduled','open'].includes(s.status)&&s.due_at&&new Date(s.due_at).getTime()<now).length);
 $('serviceCompleted').textContent=String(services.filter(s=>s.status==='completed').length);
 $('newService').hidden=!canWrite;
 const host=$('serviceRows');host.replaceChildren();
 for(const record of services){
  const row=make('tr');
  for(const value of [serviceUnit(record.equipment_id),record.service_type.replaceAll('_',' '),record.priority,serviceDate(record.due_at),record.status,record.vendor_name||'—'])row.append(make('td',value));
  const actions=make('td');actions.className='service-actions';
  if(canWrite&&record.status==='scheduled'){
   const start=make('button','Start Maintenance');start.type='button';start.onclick=()=>changeService(record,'open');actions.append(start);
   const cancel=make('button','Cancel');cancel.type='button';cancel.onclick=()=>changeService(record,'cancel');actions.append(cancel);
  }
  if(canWrite&&record.status==='open'){const finish=make('button','Complete Service');finish.type='button';finish.onclick=()=>openCompletion(record);actions.append(finish)}
  if(record.status==='completed'&&record.completion_notes){const notes=make('span','Completed: '+record.completion_notes);notes.title='Recorded completion notes';actions.append(notes)}
  row.append(actions);host.append(row);
 }
 if(!services.length){const row=make('tr'),cell=make('td','No maintenance or inspection records in this workspace.');cell.colSpan=7;row.append(cell);host.append(row)}
}
function openService(equipmentId=''){
 if(!canWrite)return;
 const select=$('serviceEquipment');select.replaceChildren();
 const empty=make('option','Select equipment');empty.value='';select.append(empty);
 for(const unit of equipment){const o=make('option',unit.unit_number+' · '+unit.equipment_kind+' · '+unit.status);o.value=unit.id;select.append(o)}
 $('serviceForm').reset();select.value=equipmentId;$('serviceError').textContent='';$('serviceEditor').showModal();
}
async function changeService(record,action){
 if(!canWrite||!window.confirm(action==='open'?'Start this service job and place equipment on maintenance hold? Active dispatch assignments must be resolved first.':'Cancel this scheduled service record?'))return;
 try{notice('Updating maintenance record…');const {error}=await sb.rpc('tms_transition_equipment_service',{p_workspace:workspace,p_service:record.id,p_action:action,p_notes:'',p_cost:null});if(error)throw error;await reload();notice(action==='open'?'Maintenance started. Equipment held from dispatch.':'Scheduled service cancelled.')}
 catch(error){notice(error.message||'Unable to update service',true)}
}
function openCompletion(record){
 if(!canWrite)return;selectedService=record;$('serviceCompleteForm').reset();
 $('serviceCompleteDescription').textContent='Unit '+serviceUnit(record.equipment_id)+' · '+record.service_type.replaceAll('_',' ');
 $('serviceCompleteError').textContent='';$('serviceCompleteDialog').showModal();
}
$('newService').onclick=()=>openService();
$('serviceCancel').onclick=()=>$('serviceEditor').close();
$('serviceCompleteCancel').onclick=()=>$('serviceCompleteDialog').close();
$('serviceForm').onsubmit=async event=>{
 event.preventDefault();if(!canWrite)return;
 const submit=$('serviceSave');submit.disabled=true;$('serviceError').textContent='';
 try{const data=Object.fromEntries(new FormData(event.currentTarget));const {error}=await sb.rpc('tms_schedule_equipment_service',{p_workspace:workspace,p_equipment:data.equipment_id,p_type:data.service_type,p_priority:data.priority,p_due:data.due_at?new Date(data.due_at).toISOString():null,p_description:data.description,p_vendor:data.vendor_name||''});if(error)throw error;$('serviceEditor').close();await reload();notice('Equipment service scheduled.')}
 catch(error){$('serviceError').textContent=error.message||'Unable to schedule service'}
 finally{submit.disabled=false}
};
$('serviceCompleteForm').onsubmit=async event=>{
 event.preventDefault();if(!canWrite||!selectedService)return;
 const submit=$('serviceCompleteSave');submit.disabled=true;$('serviceCompleteError').textContent='';
 try{const data=Object.fromEntries(new FormData(event.currentTarget));const cost=data.cost===''?null:Number(data.cost);
 const {error}=await sb.rpc('tms_transition_equipment_service',{p_workspace:workspace,p_service:selectedService.id,p_action:'complete',p_notes:data.notes,p_cost:cost});if(error)throw error;
 $('serviceCompleteDialog').close();selectedService=null;await reload();notice('Maintenance completed and equipment availability updated.')}
 catch(error){$('serviceCompleteError').textContent=error.message||'Unable to complete maintenance'}
 finally{submit.disabled=false}
};
(async()=>{try{const{data:{user},error}=await sb.auth.getUser();if(error||!user){location.replace('login.html?next='+encodeURIComponent('app/tms-fleet.html'));return}const [members,owned]=await Promise.all([sb.from('workspace_members').select('workspace_id,role').eq('user_id',user.id),sb.from('workspaces').select('id,name').eq('owner_id',user.id)]);if(members.error)throw members.error;if(owned.error)throw owned.error;const ids=[...new Set([...(members.data||[]).map(m=>m.workspace_id),...(owned.data||[]).map(o=>o.id)])];const requested=qs.get('workspace');if(requested&&!ids.includes(requested))throw Error('Access denied to the requested workspace.');workspace=requested||ids[0];if(!workspace)throw Error('No authorized WorkRelief workspace found.');const membership=(members.data||[]).find(x=>x.workspace_id===workspace);canWrite=(owned.data||[]).some(x=>x.id===workspace)||['owner','admin','member'].includes(String(membership?.role||'').toLowerCase());$('workspaceLabel').textContent=(owned.data||[]).find(x=>x.id===workspace)?.name||'Authorized workspace';navLinks();$('mainContent').hidden=false;await reload()}catch(e){notice(e.message||'Unable to load the fleet workspace.',true)}})();