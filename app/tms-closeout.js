import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt'),$=id=>document.getElementById(id),E=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e},money=x=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(x)||0);
let ws='',canWrite=false,canApprove=false,records=[],bills=[],approvals=[],payments=[],busy=false,selectedBill=null;
let reportRows=[],reportLoaded=false;
const state=(message,error=false)=>{$('closeoutState').textContent=message;$('closeoutState').style.color=error?'#a32d40':'#586e8b'};
const detailsUrl=id=>'tms-load.html?'+new URLSearchParams({workspace:ws,id,portal:'broker'});
const invoicesUrl=()=>'tms-workflow-invoices.html?'+new URLSearchParams({workspace:ws,portal:'broker'});
async function reload(){const [loads,charges,pods,docs,approvalRows,paymentRows]=await Promise.all([
 sb.from('tms_loads').select('id,load_number,status,customer_name,carrier_name,customer_partner_id,carrier_partner_id,created_at').eq('workspace_id',ws).in('status',['delivered','invoiced','closed']).order('created_at',{ascending:false}).limit(500),
 sb.from('tms_load_charges').select('id,load_id,charge_side,amount').eq('workspace_id',ws).limit(5000),
 sb.from('tms_documents').select('load_id,document_type').eq('workspace_id',ws).eq('document_type','pod').limit(2000),
 sb.from('tms_financial_documents').select('id,load_id,document_number,document_kind,status,amount').eq('workspace_id',ws).limit(2000),
 sb.from('tms_carrier_settlement_approvals').select('id,carrier_bill_id,approved_at,approved_by').eq('workspace_id',ws).limit(2000),
 sb.from('tms_carrier_payment_records').select('id,carrier_bill_id,amount,payment_method,external_reference,paid_at,recorded_at').eq('workspace_id',ws).order('paid_at',{ascending:false}).limit(5000)
]);for(const q of [loads,charges,pods,docs,approvalRows,paymentRows])if(q.error)throw q.error;
bills=(docs.data||[]).filter(x=>x.document_kind==='carrier_bill');approvals=approvalRows.data||[];payments=paymentRows.data||[];
const chargeByLoad=new Map(),podSet=new Set((pods.data||[]).map(x=>x.load_id)),docByLoad=new Map();
for(const x of charges.data||[]){const totals=chargeByLoad.get(x.load_id)||{receivable:0,payable:0};if(x.charge_side==='receivable')totals.receivable+=Number(x.amount||0);if(x.charge_side==='payable')totals.payable+=Number(x.amount||0);chargeByLoad.set(x.load_id,totals)}
for(const x of docs.data||[]){const set=docByLoad.get(x.load_id)||new Set();set.add(x.document_kind);docByLoad.set(x.load_id,set)}
records=(loads.data||[]).map(l=>{const charges=chargeByLoad.get(l.id)||{receivable:0,payable:0},documents=docByLoad.get(l.id)||new Set(),hasPod=podSet.has(l.id),paired=documents.has('customer_invoice')&&documents.has('carrier_bill'),issues=[];if(!hasPod)issues.push('POD missing');if(!l.customer_partner_id)issues.push('Customer account missing');if(!l.carrier_partner_id)issues.push('Carrier account missing');if(charges.receivable<=0)issues.push('Receivable charges missing');if(charges.payable<=0)issues.push('Payable charges missing');return{...l,...charges,hasPod,paired,issues,ready:issues.length===0&&!paired}});render();renderSettlements();state('Showing up to 500 recently delivered loads and their carrier bills from your authorized workspace.');}
async function prepare(load){if(!canWrite||busy||!load.ready)return;const confirmed=window.confirm('Prepare customer invoice and carrier bill drafts from the recorded load charges? No invoice will be emailed and no payment will be collected.');if(!confirmed)return;busy=true;render();state('Preparing financial drafts…');try{const {error}=await sb.rpc('tms_prepare_financials',{p_workspace:ws,p_load:load.id});if(error)throw error;await reload();state('Draft financial documents prepared. Review them in Invoices before issuance.')}catch(e){state(e.message||'Unable to prepare financial documents',true)}finally{busy=false;render();renderSettlements()}}
function render(){const query=$('coSearch').value.trim().toLowerCase(),filter=$('coFilter').value;const delivered=records.length,ready=records.filter(x=>x.ready).length,attention=records.filter(x=>x.issues.length&&!x.paired).length,prepared=records.filter(x=>x.paired).length;for(const [id,n] of [['coDelivered',delivered],['coReady',ready],['coAttention',attention],['coPrepared',prepared]])$(id).textContent=String(n);const body=$('coRows');body.replaceChildren();const selected=records.filter(x=>[x.load_number,x.customer_name,x.carrier_name].join(' ').toLowerCase().includes(query)&&(filter==='all'||filter==='ready'&&x.ready||filter==='attention'&&x.issues.length&&!x.paired||filter==='prepared'&&x.paired));for(const r of selected){const tr=E('tr');for(const text of [r.load_number||'—',[(r.customer_name||'Unassigned customer'),(r.carrier_name||'Unassigned carrier')].join(' / '),r.status.replaceAll('_',' '),r.hasPod?'On file':'Missing',money(r.receivable),money(r.payable),money(r.receivable-r.payable)])tr.append(E('td',text));const actions=E('td');actions.className='co-actions';const stateBox=E('div');const pill=E('span',r.paired?'Drafts prepared':r.ready?'Ready':'Action needed');pill.className='co-pill';stateBox.append(pill);if(r.issues.length){const list=E('div');list.className='co-issues';for(const issue of r.issues)list.append(E('span',issue));stateBox.append(list)}actions.append(stateBox);const view=E('a','Load Detail');view.href=detailsUrl(r.id);actions.append(view);if(r.paired){const invoice=E('a','View Financial Documents');invoice.href=invoicesUrl();actions.append(invoice)}else if(r.ready&&canWrite){const b=E('button',busy?'Preparing…':'Prepare Drafts');b.disabled=busy;b.type='button';b.onclick=()=>prepare(r);actions.append(b)}tr.append(actions);body.append(tr)}if(!selected.length){const tr=E('tr'),td=E('td','No matching delivered loads in the selected workspace.');td.colSpan=8;td.className='co-empty';tr.append(td);body.append(tr)}}
const reportStatus=(message,error=false)=>{const s=$('coReportState');s.textContent=message;s.style.color=error?'#ad2845':'#647991'};
function csvCell(value){const raw=String(value??'');const safe=/^[=+@-]/.test(raw)?"'"+raw:raw;return '"'+safe.replace(/"/g,'""')+'"'}
function exportReport(){
 if(!reportLoaded)return;
 const columns=['Load Number','Created At','Customer','Carrier','Status','Recorded Receivable','Recorded Payable','Gross Margin'];
 const lines=[columns.map(csvCell).join(',')];
 for(const x of reportRows)lines.push([x.load_number,x.created_at,x.customer_name,x.carrier_name,x.status,Number(x.receivable||0).toFixed(2),Number(x.payable||0).toFixed(2),Number(x.gross_margin||0).toFixed(2)].map(csvCell).join(','));
 const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='workrelief-tms-profitability-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
}
async function loadReport(){
 if(!ws)return;
 const from=$('coReportFrom').value,to=$('coReportTo').value;
 if(from&&to&&to<from){reportStatus('End date must not be earlier than start date.',true);return}
 const apply=$('coReportApply');apply.disabled=true;$('coReportExport').disabled=true;reportLoaded=false;reportStatus('Calculating verified workspace totals…');
 try{
 const {data,error}=await sb.rpc('tms_financial_reporting',{p_workspace_id:ws,p_from:from||null,p_to:to||null});
 if(error)throw error;
 const summary=data?.summary||{},aging=data?.aging||{};
 for(const [id,key] of [['coRptLoads','load_count'],['coRptReceivable','receivables'],['coRptPayable','payables'],['coRptMargin','gross_margin'],['coRptPaid','recorded_carrier_payments'],['coRptOpen','unpaid_carrier_bill_balances']]){
 const node=$(id);node.textContent=key==='load_count'?String(summary[key]||0):money(summary[key]);
 }
 for(const [id,key] of [['coAgeDraft','draft_unissued'],['coAgeNoDate','no_due_date'],['coAgeCurrent','current_due'],['coAge30','past_1_30'],['coAge60','past_31_60'],['coAge90','past_61_90'],['coAgeOver','past_over_90']])$(id).textContent=money(aging[key]);
 reportRows=Array.isArray(data?.loads)?data.loads:[];
 const body=$('coReportRows');body.replaceChildren();
 for(const x of reportRows){
 const row=E('tr');for(const v of [x.load_number||'—',x.customer_name||'—',x.carrier_name||'—',x.status||'—',money(x.receivable),money(x.payable),money(x.gross_margin)])row.append(E('td',v));
 const actions=E('td'),link=E('a','View Load');link.href=detailsUrl(x.id);link.className='co-report-link';actions.append(link);row.append(actions);body.append(row);
 }
 if(!reportRows.length){const row=E('tr'),empty=E('td','No loads match this reporting period.');empty.colSpan=8;empty.className='co-empty';row.append(empty);body.append(row)}
 $('coReportLimit').textContent='Displaying '+reportRows.length+' of '+Number(summary.load_count||0)+' matching loads (up to 250). Summary amounts cover all matching loads. Date filter applies to load creation date in UTC.';
 reportLoaded=true;$('coReportExport').disabled=!reportRows.length;
 reportStatus('Financial reporting updated from authorized workspace records.');
 }catch(error){reportStatus('Reporting unavailable: '+(error.message||'Unknown error'),true)}
 finally{apply.disabled=false}
}
$('coReportApply').onclick=()=>loadReport();
$('coReportExport').onclick=exportReport;
const paymentDialog=$('coPayDialog'),paymentForm=$('coPayForm');
function settlementBalance(bill){return Math.max(0,Number(bill.amount||0)-payments.filter(p=>p.carrier_bill_id===bill.id).reduce((n,p)=>n+Number(p.amount||0),0))}
function renderSettlements(){
 const host=$('coSettlementRows');host.replaceChildren();
 const loadById=new Map(records.map(x=>[x.id,x]));
 for(const bill of bills){
  const load=loadById.get(bill.load_id),approved=approvals.find(a=>a.carrier_bill_id===bill.id),paid=Number(bill.amount||0)-settlementBalance(bill),balance=settlementBalance(bill);
  const tr=E('tr');
  for(const value of [bill.document_number||'—',load?.load_number||'Load unavailable',money(bill.amount),money(paid),money(balance),approved?'Approved '+new Date(approved.approved_at).toLocaleDateString():'Not approved']){
   tr.append(E('td',value));
  }
  const actions=E('td');actions.className='co-actions';
  if(canApprove&&!approved&&bill.status==='issued'&&load?.hasPod){
   const button=E('button','Approve Settlement');button.type='button';button.disabled=busy;button.onclick=()=>approveSettlement(bill);actions.append(button);
  }
  if(canApprove&&approved&&balance>0&&bill.status!=='void'&&bill.status!=='paid'){
   const button=E('button','Record External Payment');button.type='button';button.disabled=busy;button.onclick=()=>openPayment(bill);actions.append(button);
  }
  if(bill.status==='draft'){const view=E('a','Review & Issue Bill');view.href='tms-invoice-view.html?'+new URLSearchParams({portal:'carrier',workspace:ws,id:bill.id});actions.append(view)}if(bill.status==='paid'&&balance===0)actions.append(E('span','Paid in full'));
  if(bill.status==='void')actions.append(E('span','Voided'));
  if(load){const link=E('a','View Load');link.href=detailsUrl(load.id);actions.append(link)}
  tr.append(actions);host.append(tr);
 }
 if(!bills.length){const tr=E('tr'),cell=E('td','No carrier bills have been prepared in this workspace. Prepare drafts from an eligible delivered load above.');cell.colSpan=7;cell.className='co-empty';tr.append(cell);host.append(tr)}
 const history=$('coSettlementHistory');history.replaceChildren();
 const header=E('h3','External Payment Reconciliation History');history.append(header);
 if(!payments.length){history.append(E('p','No external carrier payments have been recorded.'));return}
 const table=E('table');const head=E('thead'),headRow=E('tr');for(const label of ['Carrier Bill','Amount','Method','External Reference','Actual Payment Date'])headRow.append(E('th',label));head.append(headRow);table.append(head);
 const body=E('tbody');for(const payment of payments.slice(0,100)){const bill=bills.find(b=>b.id===payment.carrier_bill_id),row=E('tr');for(const val of [bill?.document_number||'Carrier bill',money(payment.amount),payment.payment_method,payment.external_reference,new Date(payment.paid_at).toLocaleString()])row.append(E('td',val));body.append(row)}table.append(body);const scroll=E('div');scroll.className='co-scroll';scroll.append(table);history.append(scroll);
}
async function approveSettlement(bill){
 if(!canApprove||busy)return;
 if(!confirm('Approve carrier bill '+bill.document_number+' for settlement? This authorizes internal settlement review only and does not send money.'))return;
 busy=true;renderSettlements();state('Saving carrier settlement approval…');
 try{const {error}=await sb.rpc('tms_approve_carrier_settlement',{p_workspace:ws,p_carrier_bill:bill.id,p_notes:''});if(error)throw error;await reload();state('Carrier settlement approval recorded.')}
 catch(e){state(e.message||'Unable to approve carrier settlement',true)}
 finally{busy=false;renderSettlements()}
}
function openPayment(bill){
 if(!canApprove||busy)return;
 selectedBill=bill;paymentForm.reset();$('coPayHeading').textContent='Record Payment · '+bill.document_number;
 const remaining=settlementBalance(bill),amount=paymentForm.elements.namedItem('amount');amount.value=remaining.toFixed(2);amount.max=remaining.toFixed(2);
 const today=new Date();paymentForm.elements.namedItem('paid_at').value=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,16);
 $('coPayError').textContent='';paymentDialog.showModal();
}
$('coPayCancel').onclick=()=>paymentDialog.close();
paymentForm.onsubmit=async e=>{
 e.preventDefault();if(!canApprove||!selectedBill||busy)return;
 const input=Object.fromEntries(new FormData(paymentForm));const when=new Date(input.paid_at);
 if(!Number.isFinite(when.getTime())){$('coPayError').textContent='Enter the actual payment date';return}
 if(!confirm('Confirm this '+money(input.amount)+' payment was completed externally and the transaction reference is accurate?'))return;
 busy=true;$('coPaySave').disabled=true;$('coPayError').textContent='';
 try{
  const {error}=await sb.rpc('tms_record_carrier_payment',{p_workspace:ws,p_carrier_bill:selectedBill.id,p_amount:Number(input.amount),p_method:input.method,p_reference:String(input.reference||'').trim(),p_paid_at:when.toISOString(),p_notes:String(input.notes||'').trim()});
  if(error)throw error;paymentDialog.close();selectedBill=null;await Promise.all([reload(),loadReport()]);state('External carrier payment recorded and outstanding balance reconciled.');
 }catch(err){$('coPayError').textContent=err.message||'Unable to record payment'}
 finally{busy=false;$('coPaySave').disabled=false;renderSettlements()}
};
$('coRefresh').onclick=()=>Promise.all([reload(),loadReport()]).catch(e=>state(e.message,true));$('coSearch').oninput=render;$('coFilter').onchange=render;
(async()=>{try{const{data:{user},error}=await sb.auth.getUser();if(error||!user){location.replace('login.html?next=app/tms-closeout.html');return}const [members,owned]=await Promise.all([sb.from('workspace_members').select('workspace_id,role').eq('user_id',user.id),sb.from('workspaces').select('id').eq('owner_id',user.id)]);if(members.error)throw members.error;if(owned.error)throw owned.error;const allowed=[...new Set([...(members.data||[]).map(x=>x.workspace_id),...(owned.data||[]).map(x=>x.id)])],requested=new URLSearchParams(location.search).get('workspace');if(requested&&!allowed.includes(requested))throw Error('Access denied to the selected workspace');ws=requested||allowed[0];if(!ws)throw Error('No authorized WorkRelief workspace found');canApprove=(owned.data||[]).some(x=>x.id===ws)||['owner','admin'].includes(members.data?.find(x=>x.workspace_id===ws)?.role);canWrite=canApprove||['member'].includes(members.data?.find(x=>x.workspace_id===ws)?.role);$('closeoutApp').hidden=false;await Promise.all([reload(),loadReport()])}catch(e){state(e.message||'Financial closeout unavailable',true)}})();