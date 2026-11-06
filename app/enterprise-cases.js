/* WorkRelief Service Desk: workspace-secured, database-paged cases and linked records. */
(()=>{
'use strict';
let session=null,installed=false,requestId=0;
const PAGE=50;
const state={items:[],page:0,total:0,loading:false,loaded:false,error:'',search:'',names:{},counts:null};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses={open:'Open',in_progress:'In progress',waiting_on_customer:'Waiting on customer',resolved:'Resolved',closed:'Closed'};
const priorities={low:'Low',normal:'Normal',high:'High',urgent:'Urgent'};
const sources={manual:'Manual',email:'Email',phone:'Phone',web:'Web form',chat:'Chat',other:'Other'};
const options=(items,value)=>Object.entries(items).map(([k,v])=>`<option value="${k}" ${k===value?'selected':''}>${esc(v)}</option>`).join('');
const association=(value,empty)=>`<option value="">${empty}</option>`+(value?`<option value="${esc(value)}" selected>Loading selected record…</option>`:'');
const notice=msg=>{if(typeof toast==='function')toast(msg);else console.error(msg)};
const pageMarkup=()=>{
 const from=state.page*PAGE;
 const range=`${state.items.length?from+1:0}–${from+state.items.length} of ${state.total}`;
 const counts=state.counts||{};
 return `<div class="heading"><div><div class="eyebrow">WORKRELIEF SERVICE DESK</div><h1>Customer cases</h1><p class="desc">Manage customer requests securely through your workspace.</p></div><button class="btn primary" onclick="wrOpenCase()">＋ New case</button></div>`+
 `<div class="stats">${[['Open cases',counts.open],['Urgent',counts.urgent],['Resolved',counts.resolved]].map(([name,num])=>`<div class="stat"><div class="label">${esc(name)}</div><strong class="num">${num??'—'}</strong></div>`).join('')}</div>`+
 `<div class="toolbar" style="margin-top:16px"><span class="sub">${state.loading?'Loading…':range} · Server-side search</span></div>`+
 (state.error?`<p class="empty-note" role="alert">${esc(state.error)}</p>`:'')+
 `<div class="tablewrap"><table><thead><tr><th>Case</th><th>Customer</th><th>Priority</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>`+
 (state.items.map(x=>`<tr><td><b>#${esc(x.case_number)} · ${esc(x.subject)}</b></td><td>${esc(state.names[x.company_id]||state.names[x.contact_id]||'Unlinked')}</td><td>${esc(priorities[x.priority]||x.priority)}</td><td>${esc(statuses[x.status]||x.status)}</td><td>${esc(x.created_at?.slice(0,10)||'')}</td><td><button class="btn" onclick="wrOpenCase('${esc(x.id)}')">Open →</button></td></tr>`).join('')||`<tr><td colspan="6" class="empty">${state.loading?'Loading cases…':'No cases found in this workspace'}</td></tr>`)+
 `</tbody></table></div><div class="actions" style="justify-content:flex-end;margin-top:14px"><button class="btn" onclick="wrCasePage(-1)" ${state.page===0||state.loading?'disabled':''}>← Previous</button><span class="sub">Page ${state.page+1} of ${Math.max(1,Math.ceil(state.total/PAGE))}</span><button class="btn" onclick="wrCasePage(1)" ${(state.page+1)*PAGE>=state.total||state.loading?'disabled':''}>Next →</button></div>`;
};
const paint=()=>{if(page==='cases')document.getElementById('content').innerHTML=pageMarkup()};
const countCases=async()=>{
 const {sb,workspaceId}=session;
 const base=()=>sb.from('crm_cases').select('id',{count:'exact',head:true}).eq('workspace_id',workspaceId);
 const [open,urgent,resolved]=await Promise.all([
  base().in('status',['open','in_progress','waiting_on_customer']),
  base().eq('priority','urgent'),
  base().eq('status','resolved')]);
 for(const r of [open,urgent,resolved])if(r.error)throw r.error;
 return {open:open.count||0,urgent:urgent.count||0,resolved:resolved.count||0};
};
const refresh=async(reset=false)=>{
 if(!session)return;
 const {sb,workspaceId}=session;
 const request=++requestId;
 if(reset)state.page=0;
 state.search=String(query||'').trim();state.loading=true;state.error='';paint();
 try{
  let q=sb.from('crm_cases').select('*',{count:'exact'}).eq('workspace_id',workspaceId).order('created_at',{ascending:false}).order('id',{ascending:false}).range(state.page*PAGE,state.page*PAGE+PAGE-1);
  if(state.search)q=q.ilike('subject','%'+state.search.slice(0,120).replace(/[%,()\\]/g,' ')+'%');
  const [records,counts]=await Promise.all([q,countCases()]);
  if(records.error)throw records.error;
  if(request!==requestId||page!=='cases')return;
  const items=records.data||[];
  const companies=[...new Set(items.map(x=>x.company_id).filter(Boolean))];
  const contacts=[...new Set(items.map(x=>x.contact_id).filter(Boolean))];
  const [relatedCompanies,relatedContacts]=await Promise.all([
   companies.length?sb.from('crm_companies').select('id,name').eq('workspace_id',workspaceId).in('id',companies):Promise.resolve({data:[],error:null}),
   contacts.length?sb.from('crm_contacts').select('id,name').eq('workspace_id',workspaceId).in('id',contacts):Promise.resolve({data:[],error:null})
  ]);
  if(relatedCompanies.error)throw relatedCompanies.error;if(relatedContacts.error)throw relatedContacts.error;
  if(request!==requestId||page!=='cases')return;
  state.items=items;state.total=records.count||0;state.counts=counts;state.loaded=true;
  state.names=Object.fromEntries([...relatedCompanies.data||[],...relatedContacts.data||[]].map(x=>[x.id,x.name]));
 }catch(err){if(request!==requestId||page!=='cases')return;state.items=[];state.error=err.message||'Case query failed';console.error(err)}
 finally{if(request===requestId){state.loading=false;paint()}}
};
window.wrCasePage=delta=>{if(page!=='cases')return;const next=state.page+delta;if(next<0||next*PAGE>=state.total)return;state.page=next;void refresh()};
const fields=(x={})=>`<section class="wr-form-section"><h3>Case details</h3><div class="formgrid">
 <div class="field"><label>Subject *</label><input name="subject" required maxlength="240" value="${esc(x.subject)}"></div>
 <div class="field"><label>Priority</label><select name="priority">${options(priorities,x.priority||'normal')}</select></div>
 <div class="field"><label>Status</label><select name="status">${options(statuses,x.status||'open')}</select></div>
 <div class="field"><label>Source</label><select name="source">${options(sources,x.source||'manual')}</select></div>
 <div class="field"><label>Company</label><select name="company_id" onchange="wrCaseCompanyChanged(this)">${association(x.company_id,'No company')}</select></div>
 <div class="field"><label>Contact</label><select name="contact_id">${association(x.contact_id,'No contact')}</select></div>
 <div class="field"><label>Due date</label><input type="datetime-local" name="due_at" value="${esc(x.due_at?.slice(0,16)||'')}"></div>
 <div class="field"><label>Resolution date</label><input type="text" disabled value="${esc(x.resolved_at?new Date(x.resolved_at).toLocaleString():'Not resolved')}"></div>
 <div class="field" style="grid-column:1/-1"><label>Description</label><textarea name="description" rows="5">${esc(x.description)}</textarea></div>
 <div class="field" style="grid-column:1/-1"><label>Resolution notes</label><textarea name="resolution" rows="3">${esc(x.resolution)}</textarea></div>
 </div></section>`;
window.wrCaseCompanyChanged=async select=>{
 const form=select.form,contact=form?.querySelector('select[name="contact_id"]');if(!contact)return;
 contact.replaceChildren(new Option('No contact',''));
 if(!select.value)return;
 const {sb,workspaceId}=session;
 const {data,error}=await sb.from('crm_contacts').select('id,name').eq('workspace_id',workspaceId).eq('company_id',select.value).neq('status','lead').order('name').limit(50);
 if(error){notice('Unable to load contacts');return}
 for(const row of data||[])contact.append(new Option(row.name,row.id));
};
window.wrOpenCase=async id=>{
 if(!session)return;
 openDrawer('<h2>Customer case</h2><p class="sub">Loading current record…</p>');
 try{
  let record={};
  if(id){const {data,error}=await session.sb.from('crm_cases').select('*').eq('workspace_id',session.workspaceId).eq('id',id).maybeSingle();if(error)throw error;if(!data)throw Error('Case not found or access denied');record=data}
  openDrawer(`<div class="eyebrow">CUSTOMER SERVICE</div><h2>${id?'Manage case #'+esc(record.case_number):'New support case'}</h2><p class="sub">Changes are saved securely without reloading the application.</p><form class="wr-management-form" onsubmit="wrSaveCase(event,'${esc(id||'')}')">${fields(record)}<div class="wr-form-actions"><button class="btn" type="button" onclick="closeDrawer()">Cancel</button><button class="btn primary" type="submit">Save case</button></div></form>`);
 }catch(err){console.error(err);openDrawer(`<h2>Case unavailable</h2><p role="alert">${esc(err.message)}</p><button class="btn" onclick="closeDrawer()">Close</button>`)}
};
window.wrSaveCase=async(event,id)=>{
 event.preventDefault();if(!session)return;
 const form=event.target,button=form.querySelector('[type=submit]');
 const fields=Object.fromEntries(new FormData(form));
 const payload={subject:fields.subject.trim(),priority:fields.priority,status:fields.status,source:fields.source,description:fields.description||'',resolution:fields.resolution||null,company_id:fields.company_id||null,contact_id:fields.contact_id||null,due_at:fields.due_at?new Date(fields.due_at).toISOString():null};
 button.disabled=true;button.textContent='Saving…';
 try{
  const {sb,workspaceId,userId}=session;
  if(payload.contact_id){const check=await sb.from('crm_contacts').select('company_id,status').eq('workspace_id',workspaceId).eq('id',payload.contact_id).maybeSingle();if(check.error)throw check.error;if(!check.data||check.data.status==='lead')throw Error('Selected contact is unavailable');if(payload.company_id&&check.data.company_id&&payload.company_id!==check.data.company_id)throw Error('Contact belongs to another company');if(!payload.company_id)payload.company_id=check.data.company_id||null}
  if(payload.status==='resolved'||payload.status==='closed')payload.resolved_at=new Date().toISOString();else payload.resolved_at=null;
  const result=id?await sb.from('crm_cases').update(payload).eq('workspace_id',workspaceId).eq('id',id).select('id'):
    await sb.from('crm_cases').insert({...payload,workspace_id:workspaceId,created_by:userId}).select('id');
  if(result.error)throw result.error;if(!result.data?.length)throw Error('Case write could not be confirmed');
  closeDrawer();state.loaded=false;state.page=0;await refresh(true);notice('Case saved');
 }catch(err){console.error(err);notice('Unable to save case: '+err.message)}
 finally{if(button.isConnected){button.disabled=false;button.textContent='Save case'}}
};
function install(){
 session=window.wrEnterpriseSession;if(!session||installed)return;
 installed=true;
 const nav=document.querySelector('.sidebar .nav'),next=nav.querySelector('[data-page="activities"]');
 const button=document.createElement('button');button.dataset.page='cases';button.innerHTML='<i aria-hidden="true">▣</i> Service desk';nav.insertBefore(button,next);
 const originalRender=render,originalTitle=title;
 title=p=>p==='cases'?'Service desk':originalTitle(p);
 render=function(){if(page!=='cases')return originalRender();
  document.getElementById('crumb').textContent='Service desk';document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('on',el.dataset.page==='cases'));paint();
  if(!state.loading&&(!state.loaded||state.search!==String(query||'').trim()))void refresh(state.search!==String(query||'').trim());
 };
 button.addEventListener('click',()=>go('cases'));
 document.getElementById('wr-manual-refresh')?.addEventListener('click',event=>{if(page!=='cases')return;event.stopImmediatePropagation();event.preventDefault();void refresh()},true);
}
window.addEventListener('wr-enterprise-authenticated',install);
if(window.wrEnterpriseSession)install();
})();
