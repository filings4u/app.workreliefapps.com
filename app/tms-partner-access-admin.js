import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),E=(tag,v)=>{const node=document.createElement(tag);if(v!==undefined)node.textContent=String(v);return node};
let ws='',partners=[],links=[],busy=false;
const status=(value,error=false)=>{const n=$('partnerAccessState');n.textContent=value;n.style.color=error?'#ae2947':'#607b98'};
async function refresh(){
 const {data,error}=await sb.rpc('tms_partner_access_admin',{p_workspace:ws});if(error)throw error;
 partners=Array.isArray(data?.partners)?data.partners:[];links=Array.isArray(data?.links)?data.links:[];
 const select=$('partnerAccessPartner'),chosen=select.value;select.replaceChildren();const placeholder=E('option','Select Active Partner');placeholder.value='';select.append(placeholder);
 for(const partner of partners.filter(p=>p.status==='active')){const opt=E('option',partner.name+' · '+partner.type);opt.value=partner.id;select.append(opt)}
 if(partners.some(p=>p.id===chosen&&p.status==='active'))select.value=chosen;
 const host=$('partnerAccessRows');host.replaceChildren();
 for(const link of links){
 const partner=partners.find(p=>p.id===link.partner_id);const row=E('tr');
 row.append(E('td',(partner?.name||'Partner record')+' · '+(partner?.type||'')),E('td',link.email||'Confirmed account'),E('td',new Date(link.linked_at).toLocaleString()));
 const actions=E('td'),remove=E('button','Revoke Access');remove.type='button';remove.disabled=busy;remove.onclick=()=>revoke(link);actions.append(remove);row.append(actions);host.append(row)
 }
 if(!links.length){const row=E('tr'),empty=E('td','No customer or carrier user accounts are linked.');empty.colSpan=4;row.append(empty);host.append(row)}
 status('Showing '+links.length+' authorized partner account link'+(links.length===1?'':'s')+'.');
}
async function revoke(link){
 if(busy)return;
 if(!window.confirm('Revoke shipment access for '+(link.email||'this account')+'?'))return;
 busy=true;try{const {data,error}=await sb.rpc('tms_unlink_partner_user',{p_workspace:ws,p_partner:link.partner_id,p_user:link.user_id});if(error)throw error;if(!data)throw Error('The account link no longer exists');await refresh();status('Partner shipment access revoked.')}
 catch(error){status('Unable to revoke access: '+(error.message||'Unknown error'),true)}
 finally{busy=false}
}
$('partnerAccessForm').onsubmit=async e=>{
 e.preventDefault();if(busy)return;
 const fields=Object.fromEntries(new FormData(e.currentTarget));
 if(!partners.some(x=>x.id===fields.partner_id&&x.status==='active')){status('Select an active partner.',true);return}
 if(!window.confirm('Grant this confirmed account restricted access to shipments for the selected partner?'))return;
 busy=true;$('partnerAccessSave').disabled=true;
 try{const {error}=await sb.rpc('tms_link_partner_user_by_email',{p_workspace:ws,p_partner:fields.partner_id,p_email:String(fields.email||'').trim()});if(error)throw error;e.currentTarget.reset();await refresh();status('Confirmed partner account linked to the selected shipment records.')}
 catch(error){status('Unable to grant access: '+(error.message||'Unknown error'),true)}
 finally{busy=false;$('partnerAccessSave').disabled=false}
};
(async()=>{try{
 const {data:{user},error}=await sb.auth.getUser();if(error||!user)throw Error('Sign in to WorkRelief first.');
 const [members,owned]=await Promise.all([sb.from('workspace_members').select('workspace_id,role').eq('user_id',user.id),sb.from('workspaces').select('id').eq('owner_id',user.id)]);if(members.error)throw members.error;if(owned.error)throw owned.error;
 const allowed=[...new Set([...(members.data||[]).map(m=>m.workspace_id),...(owned.data||[]).map(w=>w.id)])],requested=new URLSearchParams(location.search).get('workspace');
 if(requested&&!allowed.includes(requested))throw Error('Access denied to the selected workspace');
 ws=requested||(allowed.length===1?allowed[0]:'');if(!ws)throw Error('Select an authorized WorkRelief workspace.');
 const admin=(owned.data||[]).some(w=>w.id===ws)||(members.data||[]).some(m=>m.workspace_id===ws&&['owner','admin'].includes(m.role));if(!admin)throw Error('Workspace owner or administrator permission required.');
 $('partnerAccessBlocked').hidden=true;$('partnerAccessPanel').hidden=false;await refresh();
 }catch(error){$('partnerAccessBlocked').textContent=error.message||'Unable to load partner access';status(error.message||'Access unavailable',true)}
})();