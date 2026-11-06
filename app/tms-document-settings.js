import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
(async()=>{
const root=document.getElementById('workcontent');if(!root)return;
document.getElementById('heading').textContent='Document Settings';document.getElementById('description').textContent='Broker information, document terms and print settings.';document.getElementById('crumb').textContent='WorkRelief / TMS / Broker / Document Settings';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt'),q=new URLSearchParams(location.search);
const E=(t,c,v)=>{const e=document.createElement(t);if(c)e.className=c;if(v!==undefined)e.textContent=v;return e};
const msg=E('p','doc-help','Loading settings…'),area=E('div','doc-hub-content');root.append(msg,area);
const fields=[
['Broker Identity',[['Legal Business Name','broker_name'],['Business Address','broker_address','textarea'],['Phone','broker_phone'],['Email','broker_email','email'],['MC Number','broker_mc'],['USDOT Number','broker_dot']]],
['Document Terms',[['Rate Confirmation — Terms & Conditions','rate_confirmation_terms','textarea'],['Invoice — Terms & Conditions','invoice_terms','textarea'],['Bill of Lading — Notes & Terms','bol_terms','textarea'],['Freight Quote — Terms & Conditions','quote_terms','textarea'],['Customer Load Sheet — Notes','customer_sheet_terms','textarea'],['Carrier Agreement — Terms','carrier_agreement_terms','textarea']]],
['Payment & Footer',[['Payment Instructions','payment_terms','textarea'],['Document Footer','footer_text','textarea']]]];
try{
const auth=await sb.auth.getUser();if(auth.error||!auth.data?.user)throw Error('Sign in to manage document settings');const uid=auth.data.user.id;
const [m,o]=await Promise.all([sb.from('workspace_members').select('workspace_id').eq('user_id',uid),sb.from('workspaces').select('id').eq('owner_id',uid)]);
if(m.error)throw m.error;if(o.error)throw o.error;
const allowed=[...new Set([...(m.data||[]).map(x=>x.workspace_id),...(o.data||[]).map(x=>x.id)])];const ws=q.get('workspace')||(allowed.length===1?allowed[0]:null);
if(!ws||!allowed.includes(ws))throw Error('Select an authorized workspace in My Applications');
const res=await sb.from('tms_document_settings').select('*').eq('workspace_id',ws).maybeSingle();if(res.error)throw res.error;
const data={workspace_id:ws,...(res.data||{})};msg.textContent='Enter approved company terms. Changes apply to future generated documents.';
for(const [title,items]of fields){const panel=E('section','panel');panel.append(E('h2','',title));const grid=E('div','quote-field-grid');panel.append(grid);for(const [label,key,type]of items){const wrap=E('label','quote-field');wrap.append(E('span','',label));const input=E(type==='textarea'?'textarea':'input');if(type==='textarea'){input.rows=key.endsWith('_terms')?8:3;input.style.minHeight=key.endsWith('_terms')?'160px':'80px'}else input.type=type||'text';input.value=data[key]||'';input.oninput=()=>data[key]=input.value;wrap.append(input);grid.append(wrap)}area.append(panel)}
const actions=E('div','doc-hub-actions');area.append(actions);const save=E('button','quote-btn primary','Save Document Settings');actions.append(save);save.onclick=async()=>{save.disabled=true;msg.textContent='Saving…';try{const result=await sb.from('tms_document_settings').upsert({...data,workspace_id:ws,updated_at:new Date().toISOString()},{onConflict:'workspace_id'}).select('workspace_id').single();if(result.error)throw result.error;msg.textContent='Document settings saved.'}catch(e){msg.textContent='Unable to save document settings: '+(e.message||'Unknown error')}finally{save.disabled=false}};
}catch(e){msg.textContent=e.message||'Document settings unavailable'}
})();