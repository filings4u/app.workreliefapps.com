import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
(async()=>{
const root=document.getElementById('workcontent');if(!root||document.body.dataset.view!=='home')return;
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const E=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(cls)node.className=cls;return node};
const metrics=[...root.querySelectorAll('.broker-metric-value')],stages=[...root.querySelectorAll('.broker-stage b')],note=root.querySelector('.broker-data-note'),board=root.querySelector('.broker-board-empty');
const set=(elements,i,n)=>{if(elements[i])elements[i].textContent=String(n??0)};
const status=(value,error=false)=>{if(note){note.textContent=value;note.style.color=error?'#ad2845':'#56718d'}};
let workspace='';
function href(path,params={}){return path+'?'+new URLSearchParams({portal:'broker',workspace,...params})}
const live=E('section',undefined,'panel tms-command-summary');live.setAttribute('aria-label','TMS live operations overview');
const host=root.querySelector('.broker-layout')||root;root.insertBefore(live,host);
live.append(E('h2','Enterprise Operations Pulse'));
const caption=E('p','Live data from the selected workspace. No simulated activity or demo numbers.');live.append(caption);
const grid=E('div',undefined,'tms-command-grid');live.append(grid);
const cards=[
 ['Driver assignments awaiting dispatch','awaiting_release','tms-dispatch-board.html'],
 ['Dispatched assignments','active_dispatch','tms-dispatch-board.html'],
 ['Loads in transit','in_transit','tms-workflow-loads.html'],
 ['Delivered loads awaiting closeout','delivered_for_closeout','tms-closeout.html'],
 ['Shipment exception events','recorded_exceptions','tms-workflow-loads.html'],
 ['Delivered loads missing POD','delivered_missing_pod','tms-workflow-loads.html'],
 ['Overdue carrier bills','overdue_carrier_bills','tms-closeout.html'],
 ['Customer invoices requiring review','customer_invoice_review','tms-workflow-invoices.html']
];
const elements=new Map();
for(const [label,key,file] of cards){const link=E('a',undefined,'tms-command-tile');link.href=file;link.append(E('span',label),E('strong','—'));grid.append(link);elements.set(key,{link,number:link.querySelector('strong')})}
const attention=E('section',undefined,'panel tms-command-exceptions');live.append(attention);attention.append(E('h3','Recent Shipment Exceptions'));
const exceptions=E('div');attention.append(exceptions);
const finance=E('div',undefined,'tms-command-finance');live.append(finance);
const financeTitle=E('h3','Financial Overview');finance.append(financeTitle);
const financeStats=E('div',undefined,'tms-command-grid');finance.append(financeStats);
const financeTiles=[['Gross margin from recorded charges','gross_margin'],['Unpaid carrier bill balances','unpaid_carrier_bill_balances'],['External carrier payments recorded','recorded_carrier_payments']];
const financeEls={};for(const [label,key]of financeTiles){const tile=E('a',undefined,'tms-command-tile');tile.href='tms-closeout.html';tile.append(E('span',label),E('strong','—'));financeStats.append(tile);financeEls[key]=tile.querySelector('strong')}
const money=x=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(x)||0);
function setLinks(){for(const [key,{link}]of elements){const file=cards.find(x=>x[1]===key)[2];link.href=href(file)}for(const tile of financeStats.querySelectorAll('a'))tile.href=href('tms-closeout.html')}
function render(data,report){const counts=data?.counts||{},loads=data?.recent_loads||[],events=data?.recent_exceptions||[];
for(const [key,item] of elements)item.number.textContent=String(counts[key]??0);
set(metrics,0,counts.open_quotes);set(metrics,1,counts.active_loads);set(metrics,2,counts.needs_dispatch);set(metrics,3,counts.customer_invoice_review);
set(stages,0,counts.needs_dispatch);set(stages,1,counts.awaiting_release);set(stages,2,counts.in_transit);set(stages,3,counts.delivered_for_closeout);
if(board){board.replaceChildren();board.append(E('strong',loads.length?'Recent workspace loads':'No loads recorded in this workspace'));for(const x of loads){const link=E('a',[x.load_number||'Load',x.origin_city||'—',x.destination_city||'—',x.status||'Unspecified'].join(' · '),'tms-live-load-row');link.href=href('tms-workflow-loads.html',{id:x.id});board.append(link)}}
exceptions.replaceChildren();if(!events.length)exceptions.append(E('p','No shipment exception events recorded in this workspace.'));
for(const x of events){const row=E('a',undefined,'tms-command-exception');row.href=href('tms-load.html',{id:x.load_id});row.append(E('strong',x.load_number||'Load'),E('span',x.details||'Shipment exception'),E('small',new Date(x.happened_at).toLocaleString()));exceptions.append(row)}
if(report?.summary){for(const [key,node] of Object.entries(financeEls))node.textContent=money(report.summary[key])}else{for(const node of Object.values(financeEls))node.textContent='Unavailable'}
}
try{
const {data:auth,error:ae}=await sb.auth.getUser();if(ae||!auth?.user){status('Sign in to view authorized TMS operations.',true);return}
const [m,w]=await Promise.all([sb.from('workspace_members').select('workspace_id').eq('user_id',auth.user.id),sb.from('workspaces').select('id').eq('owner_id',auth.user.id)]);
if(m.error)throw m.error;if(w.error)throw w.error;
const allowed=[...new Set([...(m.data||[]).map(x=>x.workspace_id),...(w.data||[]).map(x=>x.id)])],requested=new URLSearchParams(location.search).get('workspace');
if(requested&&!allowed.includes(requested))throw Error('Access denied to this workspace');
workspace=requested||(allowed.length===1?allowed[0]:'');
if(!workspace)throw Error('Select an authorized WorkRelief workspace from My Applications.');
setLinks();
const [data,financeResult]=await Promise.all([sb.rpc('tms_command_center',{p_workspace:workspace}),sb.rpc('tms_financial_reporting',{p_workspace_id:workspace,p_from:null,p_to:null})]);
if(data.error)throw data.error;
render(data.data,financeResult.error?null:financeResult.data);
status('Live workspace operations.'+(financeResult.error?' Financial summary unavailable: '+financeResult.error.message:''));
}catch(err){status('Unable to load command center: '+(err.message||'Unknown error'),true)}
})();