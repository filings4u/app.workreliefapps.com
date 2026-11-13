import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),el=(tag,value)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=String(value);return node};
let ws='',drivers=[],links=[],busy=false;
const report=(message,error=false)=>{const node=$('driverLinkStatus');node.textContent=message;node.style.color=error?'#ae2947':'#607b98'};
function option(select,value,label){const o=el('option',label);o.value=value;select.append(o)}
function render(){
 const select=$('driverLinkDriver'),chosen=select.value;
 select.replaceChildren();option(select,'','Select Driver');for(const d of drivers)option(select,d.id,d.full_name);if(drivers.some(d=>d.id===chosen))select.value=chosen;
 const body=$('driverLinkedRows');body.replaceChildren();
 for(const link of links){const row=el('tr');const driver=drivers.find(d=>d.id===link.driver_id);
 row.append(el('td',driver?.full_name||'Driver record'),el('td','Confirmed WorkRelief account'),el('td',new Date(link.linked_at).toLocaleString()));body.append(row)}
 if(!links.length){const row=el('tr'),cell=el('td','No driver accounts are linked in this workspace.');cell.colSpan=3;row.append(cell);body.append(row)}
}
async function reload(){const [d,l]=await Promise.all([
 sb.from('tms_drivers').select('id,full_name').eq('workspace_id',ws).order('full_name').limit(1000),
 sb.from('tms_driver_users').select('driver_id,linked_at').eq('workspace_id',ws).limit(1000)
]);for(const item of [d,l])if(item.error)throw item.error;
 drivers=d.data||[];links=l.data||[];render();report('Current driver account links loaded. Only confirmed WorkRelief accounts can be linked.')}
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