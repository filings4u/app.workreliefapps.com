// WorkRelief CRM: workspace-scoped server paging and filtering.
// This module never uses the Supabase service role and never trusts workspace IDs from form fields.
const TABLES = Object.freeze({
  crm_contacts: ['id','name','email','company_id','status','lead_status','created_at'],
  crm_companies: ['id','name','industry','account_type','status','segment','territory_id','owner_id','parent_company_id','created_at'],
  crm_deals: ['id','title','stage','company_id','contact_id','sales_process_id','created_at'],
  crm_activities: ['id','title','kind','company_id','contact_id','created_at'],
  crm_record_events: ['id','event_type','company_id','contact_id','created_at'],
  crm_company_emails: ['id','email','company_id','created_at'],
  crm_cases: ['id','subject','status','priority','company_id','contact_id','created_at'],
  crm_products: ['id','name','sku','item_type','active','created_at'],
  crm_quotes: ['id','title','status','deal_id','created_at'],
  crm_quote_items: ['id','quote_id','product_id'],
  crm_sales_processes: ['id','name','active','created_at'],
  crm_sales_documents: ['id','title','kind','status','deal_id','created_at'],
  crm_subscriptions: ['id','name','status','company_id','created_at'],
  crm_product_bundle_items: ['id','bundle_product_id','component_product_id']
});
const MAX_PAGE = 200;
export function crmQuery({sb,workspaceId,table,page=0,pageSize=50,filters={},exclude={},search=''}) {
  if(!sb||typeof sb.from!=='function') throw Error('Data connection unavailable');
  if(!/^[0-9a-f-]{36}$/i.test(String(workspaceId))) throw Error('Valid workspace ID required');
  const allowed=TABLES[table];
  if(!allowed) throw Error('Unknown CRM table');
  if(!Number.isSafeInteger(page)||page<0||!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>MAX_PAGE) throw Error('Invalid page');
  if(page>Math.floor(Number.MAX_SAFE_INTEGER/pageSize)) throw Error('Page offset too large');
  let q=sb.from(table).select('*',{count:'exact'}).eq('workspace_id',workspaceId);
  for(const [field,value] of Object.entries(filters)) {
    if(!allowed.includes(field)||field==='id'&&typeof value!=='string')throw Error('Unsupported filter: '+field);
    if(value===null)q=q.is(field,null);
    else if(['string','number','boolean'].includes(typeof value))q=q.eq(field,value);
    else throw Error('Unsupported filter value');
  }
  for(const [field,value] of Object.entries(exclude)) {
    if(!allowed.includes(field) || value===null || !['string','number','boolean'].includes(typeof value)) throw Error('Unsupported exclusion filter: '+field);
    q=q.neq(field,value);
  }
  if(search){
    const searchField={crm_contacts:'name',crm_companies:'name',crm_deals:'title',crm_activities:'title',crm_cases:'subject'}[table];
    if(!searchField)throw Error('Search unsupported for this table');
    const clean=String(search).trim().slice(0,120).replace(/[%,()\\]/g,' ');
    if(clean)q=q.ilike(searchField,'%'+clean+'%');
  }
  const offset=page*pageSize;
  return (['crm_quote_items','crm_product_bundle_items'].includes(table)?q:q.order('created_at',{ascending:false})).order('id',{ascending:false}).range(offset,offset+pageSize-1);
}
export async function crmPage(args){
  const {data,error,count}=await crmQuery(args);
  if(error)throw error;
  return {records:data||[],total:count??null,page:args.page??0,pageSize:args.pageSize??50};
}
export async function crmAllRows({sb,workspaceId,table,pageSize=200,maxRecords=100000}) {
  const all=[];
  for(let page=0;all.length<maxRecords;page++){
    const result=await crmPage({sb,workspaceId,table,page,pageSize});
    all.push(...result.records);
    if(all.length>maxRecords)throw Error('Workspace dataset exceeds the safe full-refresh limit; use server-side page and filters.');
    if(result.records.length<pageSize)return all;
    if(result.total!==null && all.length>=result.total)return all;
  }
  throw Error('Workspace dataset exceeds the safe full-refresh limit; use server-side page and filters.');
}

// Direct record retrieval for detail/edit screens. RLS is enforced by Supabase.
export async function crmRecord({sb,workspaceId,table,id}) {
  if (!TABLES[table]) throw Error('Unknown CRM table');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id))) throw Error('Valid record UUID required');
  if (!/^[0-9a-f-]{36}$/i.test(String(workspaceId))) throw Error('Valid workspace ID required');
  if (!sb || typeof sb.from !== 'function') throw Error('Data connection unavailable');
  const {data,error}=await sb.from(table).select('*').eq('workspace_id',workspaceId).eq('id',id).maybeSingle();
  if(error) throw error;
  if(!data) throw Error('Record not found or workspace access denied');
  return data;
}
