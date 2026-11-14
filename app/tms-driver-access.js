import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),el=(tag,value)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=String(value);return node};
let ws='',drivers=[],links=[],invitations=[],busy=false;
const report=(message,error=false)=>{const node=$('driverLinkStatus');node.textContent=message;node.style.color=error?'#ae2947':'#607b98'};
function option(select,value,label){const o=el('option',label);o.value=value;select.append(o)}
function render(){
 const select=$('driverLinkDriver'),chosen=select.value;
 select.replaceChildren();option(select,'','Select Driver');for(const d of drivers)option(select,d.id,d.full_name);if(drivers.some(d=>d.id===chosen))select.value=chosen;
 const body=$('driverLinkedRows');body.replaceChildren();
 for(const link of links){const row=el('tr');const driver=drivers.find(d=>d.id===link.driver_id);
 row.append(el('td',driver?.full_name||'Driver record'),el('td','Confirmed WorkRelief account'),el('td',new Date(link.linked_at).toLocaleString()));const actions=el('td'),revoke=el('button','Revoke Access');revoke.type='button';revoke.onclick=()=>revokeDriver(link);actions.append(revoke);row.append(actions);body.append(row)}
 if(!links.length){const row=el('tr'),cell=el('td','No driver accounts are linked in this workspace.');cell.colSpan=4;row.append(cell);body.append(row)}
 const queue=$('driverInviteRows');queue.replaceChildren();
 for(const invite of invitations){
 const row=el('tr'),driver=drivers.find(d=>d.id===invite.target_id);
 const expired=new Date(invite.expires_at)<new Date()&&['sent','pending'].includes(invite.status);
 for(const text of [driver?.full_name||'Driver',invite.invite_email,expired?'Expired':invite.status,new Date(invite.expires_at).toLocaleString()])row.append(el('td',text));
 const action=el('td');
 if(['pending','sent'].includes(invite.status)&&!expired){const cancel=el('button','Revoke');cancel.type='button';cancel.onclick=()=>revokeInvite(invite);action.append(cancel)}
 row.append(action);queue.append(row);
 }
 if(!invitations.length){const row=el('tr'),empty=el('td','No driver invitations sent.');empty.colSpan=5;row.append(empty);queue.append(row)}

}
async function reload(){const [d,l,i]=await Promise.all([
 sb.from('tms_drivers').select('id,full_name').eq('workspace_id',ws).order('full_name').limit(1000),
 sb.from('tms_driver_users').select('driver_id,linked_at').eq('workspace_id',ws).limit(1000),
 sb.from('tms_external_invitations').select('id,target_id,invite_email,status,expires_at,created_at').eq('workspace_id',ws).eq('invite_kind','driver').order('created_at',{ascending:false}).limit(100)
]);for(const item of [d,l,i])if(item.error)throw item.error;
 drivers=d.data||[];links=l.data||[];invitations=i.data||[];render();report('Current driver account links loaded. Only confirmed WorkRelief accounts can be linked.')}
async function revokeDriver(link){if(busy||!window.confirm('Revoke this driver’s access to their assigned WorkRelief trips?'))return;busy=true;try{const{error}=await sb.rpc('tms_unlink_driver_user',{p_workspace:ws,p_driver:link.driver_id});if(error)throw error;await reload();report('Driver account access revoked.')}catch(error){report('Unable to revoke driver account: '+(error.message||'Unknown error'),true)}finally{busy=false}}
async function revokeInvite(inv){
 if(busy||!window.confirm('Revoke this driver invitation?'))return;
 busy=true;try{const {error}=await sb.rpc('tms_revoke_external_invite',{p_workspace:ws,p_invitation:inv.id});if(error)throw error;await reload();report('Driver invitation revoked.')}
 catch(error){report('Unable to revoke invitation: '+error.message,true)}finally{busy=false}
}
$('driverInviteSend').onclick=async()=>{
 if(busy||!ws)return;
 const driver=$('driverLinkDriver').value,email=$('driverLinkEmail').value.trim();
 if(!drivers.some(d=>d.id===driver)||!email){report('Select a driver and enter an email address.',true);return}
 if(!window.confirm('Send a restricted WorkRelief TMS driver invitation to '+email+'?'))return;
 busy=true;$('driverInviteSend').disabled=true;report('Submitting secure driver invitation…');
 try{const {data,error}=await sb.functions.invoke('workrelief-tms-external-invite',{body:{workspace_id:ws,target_id:driver,kind:'driver',email}});
 if(error)throw error;if(data?.status!=='sent')throw Error(data?.error||'Email invitation not confirmed');
 await reload();report('Driver invitation email sent. Access activates after the recipient confirms and accepts.')}
 catch(error){report('Unable to email invitation: '+(error.message||'Unknown error'),true)}
 finally{busy=false;$('driverInviteSend').disabled=false}
};
$('driverAccessForm').onsubmit=async event=>{
 event.preventDefault();if(busy||!ws)return;
 const fields=Object.fromEntries(new FormData(event.currentTarget));
 if(!drivers.some(d=>d.id===fields.driver)||!String(fields.email||'').trim()){report('Select a driver and enter their confirmed account email.',true);return}
 if(!window.confirm('Link this confirmed WorkRelief account to the selected driver record? The account must not have general workspace access.'))return;
 busy=true;$('driverLinkSave').disabled=true;
 try{const {error}=await sb.rpc('tms_link_driver_by_email',{p_workspace:ws,p_driver:fields.driver,p_email:String(fields.email).trim()});if(error)throw error;event.currentTarget.reset();await reload();report('Driver account link saved. This account can access its own assigned trips only.')}
 catch(error){report('Unable to link driver account: '+(error.message||'Unknown error'),true)}
 finally{busy=false;$('driverLinkSave').disabled=false}
};
(async()=>{
 try{const {data:{user},error}=await sb.auth.getUser();if(error||!user)return;
 const [m,w]=await Promise.all([sb.from('workspace_members').select('workspace_id,role').eq('user_id',user.id),sb.from('workspaces').select('id').eq('owner_id',user.id)]);if(m.error)throw m.error;if(w.error)throw w.error;
 const allowed=[...new Set([...(m.data||[]).map(x=>x.workspace_id),...(w.data||[]).map(x=>x.id)])],requested=new URLSearchParams(location.search).get('workspace');
 if(requested&&!allowed.includes(requested))return;ws=requested||allowed[0];if(!ws)return;
 const admin=(w.data||[]).some(x=>x.id===ws)||(m.data||[]).some(x=>x.workspace_id===ws&&['owner','admin'].includes(x.role));if(!admin)return;
 $('driverAccessPanel').hidden=false;await reload();
 }catch(error){report('Driver access management unavailable: '+(error.message||'Unknown error'),true)}
})();