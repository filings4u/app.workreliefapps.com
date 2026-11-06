import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
(async()=>{
const root=document.getElementById('workcontent');if(!root||document.body.dataset.view!=='home')return;
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const cards=[...root.querySelectorAll('.broker-metric-value')],stages=[...root.querySelectorAll('.broker-stage b')],note=root.querySelector('.broker-data-note'),board=root.querySelector('.broker-board-empty');
const show=(msg)=>{if(note)note.textContent=msg};const set=(a,i,n)=>{if(a[i])a[i].textContent=String(n)};
const finished=s=>/delivered|invoiced|completed|closed|cancelled|canceled/i.test(s||'');
const transit=s=>/in.transit|dispatched|picked.up|loaded/i.test(s||'');
const scheduled=s=>/scheduled|assigned|booked|confirmed|dispatch.ready/i.test(s||'');
try{
const {data:auth,error:ae}=await sb.auth.getUser();if(ae||!auth?.user){show('Sign in to view live brokerage activity.');return}
const [membership,ownership]=await Promise.all([sb.from('workspace_members').select('workspace_id').eq('user_id',auth.user.id),sb.from('workspaces').select('id').eq('owner_id',auth.user.id)]);
if(membership.error)throw membership.error;if(ownership.error)throw ownership.error;
const allowed=[...new Set([...(membership.data||[]).map(x=>x.workspace_id),...(ownership.data||[]).map(x=>x.id)])];
let ws=new URLSearchParams(location.search).get('workspace');if(!ws&&allowed.length===1)ws=allowed[0];
if(!ws){show('Open this TMS portal from a selected workspace in My Applications to load live data.');return}
if(!allowed.includes(ws)){show('Current account has no access to this workspace.');return}
const [l,p,f,quotes]=await Promise.all([
sb.from('tms_loads').select('id,load_number,status,carrier_name,origin_city,origin_state,destination_city,destination_state,created_at').eq('workspace_id',ws).eq('business_role','broker').order('created_at',{ascending:false}).limit(200),
sb.from('tms_partners').select('id,partner_type,status').eq('workspace_id',ws).limit(1000),
sb.from('tms_financial_documents').select('id,status,document_kind').eq('workspace_id',ws).limit(1000),
sb.from('tms_quotes').select('id,status').eq('workspace_id',ws).limit(1000)]);
if(l.error)throw l.error;if(quotes.error)throw quotes.error;set(cards,0,(quotes.data||[]).filter(x=>!/accepted|booked|converted|declined|rejected|cancelled|canceled|expired|closed/i.test(x.status||'')).length);const loads=l.data||[],open=loads.filter(x=>!finished(x.status)),unassigned=open.filter(x=>!x.carrier_name);
set(cards,1,open.length);set(cards,2,unassigned.length);
set(stages,0,unassigned.length);set(stages,1,open.filter(x=>scheduled(x.status)).length);set(stages,2,open.filter(x=>transit(x.status)).length);set(stages,3,loads.filter(x=>/delivered/i.test(x.status||'')).length);
if(!f.error)set(cards,3,(f.data||[]).filter(x=>/invoice/i.test(x.document_kind||'')&&!/paid|void|cancel/i.test(x.status||'')).length);
if(board){board.replaceChildren();const label=document.createElement('strong');label.textContent=loads.length?'Recent broker loads':'No broker loads in this workspace';board.append(label);for(const x of loads.slice(0,8)){const line=document.createElement('a');line.className='tms-live-load-row';line.href='tms-workflow-loads.html?portal=broker&workspace='+encodeURIComponent(ws)+'&id='+encodeURIComponent(x.id);line.textContent=(x.load_number||'Load')+' · '+[x.origin_city,x.origin_state].filter(Boolean).join(', ')+' → '+[x.destination_city,x.destination_state].filter(Boolean).join(', ')+' · '+(x.status||'Unspecified');board.append(line)}}
show('Live workspace load and quote activity.'+(f.error?' Invoice count unavailable.':'')+(p.error?' Carrier directory query unavailable.':''));
}catch(e){show('Unable to load live brokerage activity: '+(e?.message||'Unknown error'))}
})();