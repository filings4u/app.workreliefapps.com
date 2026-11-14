import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
const sb=createClient('https://cqzwoskpgefacghdnuyz.supabase.co','sb_publishable_CoIoX7Pinqd2o4kJwqCTqA_RKmePPZt');
const $=id=>document.getElementById(id),E=(tag,v)=>{const n=document.createElement(tag);if(v!==undefined)n.textContent=String(v);return n},money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v)||0);
(async()=>{
 const state=$('driverPayStatementState'),rows=$('driverPayStatementRows');
 try{const{data:{user},error}=await sb.auth.getUser();if(error||!user)throw Error('Sign in to view statements');
 const {data,error:loadErr}=await sb.rpc('tms_my_driver_pay_statements');if(loadErr)throw loadErr;
 rows.replaceChildren();for(const s of Array.isArray(data)?data:[]){const tr=E('tr');for(const value of [s.load_number,s.status,money(s.gross_pay),money(s.reimbursed_expenses),money(s.deductions),money(s.net_pay),money(s.recorded_paid)])tr.append(E('td',value));rows.append(tr)}
 if(!rows.children.length){const row=E('tr'),empty=E('td','No approved driver settlements are available for your account.');empty.colSpan=7;row.append(empty);rows.append(row)}
 state.textContent='Approved pay statements retrieved. Payment details reflect records entered by finance.';
 }catch(error){state.textContent='Pay statements unavailable: '+(error.message||'Unknown error')}
})();