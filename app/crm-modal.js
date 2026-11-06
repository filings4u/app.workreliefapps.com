/* New WorkRelief modal DOM. No retired drawer/wizard markup is reused. */
function wrModalIcon(i){
 const paths=[
 '<rect x="4" y="7" width="16" height="15" rx="1"/><path d="M9 22V3h6v19M7 11h2m-2 4h2m6-4h2m-2 4h2"/>',
 '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"/>',
 '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>'
 ];
 return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">'+paths[i%5]+'</svg>';
}
function wrEnhanceDrawer(){
 const dialog=document.getElementById('drawer'), overlay=document.getElementById('back');
 if(!dialog||!overlay)return;
 overlay.className='wm-overlay show';dialog.className='wm-dialog';
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 const nodes=[...dialog.children],eyebrow=nodes.find(x=>x.classList.contains('eyebrow')),heading=nodes.find(x=>x.matches('h2')),description=nodes.find(x=>x.matches('p.sub,p:not(.note)'));
 const category=eyebrow?.textContent||'WORKRELIEF',title=heading?.textContent||'Details',desc=description?.textContent||'';
 [eyebrow,heading,description].forEach(x=>x?.remove());
 const original=[...dialog.childNodes];dialog.replaceChildren();
 const header=document.createElement('header');header.className='wm-header';
 const label=document.createElement('span');label.className='wm-eyebrow';label.textContent=category;
 const h=document.createElement('h2');h.className='wm-heading';h.textContent=title;h.id='wm-dialog-title';
 const summary=document.createElement('p');summary.className='wm-description';summary.textContent=desc;
 const close=document.createElement('button');close.className='wm-close';close.type='button';close.textContent='×';close.setAttribute('aria-label','Close');close.onclick=closeDrawer;
 header.append(label,h,summary,close);dialog.append(header);
 dialog.setAttribute('aria-labelledby','wm-dialog-title');
 const scroll=document.createElement('div');scroll.className='wm-scroll';
 const form=original.find(x=>x.nodeType===1&&x.matches('form'));
 if(form){
  form.classList.remove('formgrid','wr-floating-company-form','wr-floating-regular-form');
  form.classList.add('wm-form');
  if(title==='Add company'){
 const names=[['name','website','industry','employee_count','segment','tags_text'],['primary_contact_name','primary_contact_phone','email'],['parent_company_id','owner_id','account_type','territory_id'],['address_line1','address_line2','city','state_region','postal_code','country'],['notes','description','annual_revenue','source','status','industry_naics_code','custom_fields_text','phone']];
 const headings=['Company basics','Primary contact','Relationships','Address','Notes & insights'];
 const descriptions=['Add core information about the company.','The first person is added directly to Contacts and set as the primary account contact.','Assign an owner and territory, and categorize the account.','Add the company address.','Save helpful background information.'];
 const prior=[...form.querySelectorAll(':scope > .wr-form-section')];
 const allFields=[...form.querySelectorAll('.wr-form-section .field')];
 const cards=names.map((items,i)=>{
  const section=document.createElement('section');section.className='wr-form-section';
  const h=document.createElement('h3');h.textContent=(i+1)+'. '+headings[i];
  const p=document.createElement('p');p.className='sub';p.textContent=descriptions[i];
  const grid=document.createElement('div');grid.className='wm-grid';
  items.forEach(name=>{const input=form.querySelector('[name="'+name+'"]');const field=input?.closest('.field');if(field&&!grid.contains(field))grid.append(field)});
  section.append(h,p,grid);return section
 });
 const extras=allFields.filter(f=>!cards.some(c=>c.contains(f)));extras.forEach(f=>cards[4].lastChild.append(f));
 prior[0]?.before(...cards);prior.forEach(x=>x.remove());
}
  const oldSections=[...form.querySelectorAll(':scope > .wr-form-section')];
  const footer=oldSections.length?form.querySelector(':scope > .wr-drawer-footer'):form.querySelector(':scope > .wr-drawer-footer,:scope > .actions');
  const sections=[];
  if(oldSections.length){
   oldSections.forEach((s,i)=>{
    s.classList.add('wm-section');s.classList.remove('wr-form-section');
    const titleEl=s.querySelector(':scope > h3');const descEl=s.querySelector(':scope > p.sub');
    const top=document.createElement('div');top.className='wm-section-head';
    const icon=document.createElement('span');icon.className='wm-section-symbol';icon.innerHTML=wrModalIcon(i);
    const texts=document.createElement('div');
    if(titleEl)texts.append(titleEl);if(descEl){descEl.classList.add('wm-section-description');texts.append(descEl)}
    top.append(icon,texts);s.prepend(top);sections.push(s);
   });
  }else{
   const fields=[...form.children].filter(x=>x.matches('.field'));
   if(fields.length){
    const section=document.createElement('section');section.className='wm-section';
    const top=document.createElement('div');top.className='wm-section-head';top.innerHTML='<span class="wm-section-symbol">▦</span><div><h3></h3><p class="wm-section-description">Enter the information below.</p></div>';top.querySelector('h3').textContent='1. '+h.textContent.replace(/^(Add|Create|Edit|New|Update)\s+/i,'')+' details';
    const grid=document.createElement('div');grid.className='wm-grid';fields[0].before(section);section.append(top,grid);fields.forEach(x=>grid.append(x));sections.push(section);
   }
  }
  if(sections.length>1){
   const tabs=document.createElement('nav');tabs.className='wm-tabs';tabs.setAttribute('aria-label','Form sections');
   sections.forEach((s,i)=>{
    const t=document.createElement('button');t.type='button';t.className='wm-tab'+(i===0?' active':'');
    const ic=document.createElement('span');ic.className='wm-tab-icon';ic.innerHTML=wrModalIcon(i);
    t.append(ic,document.createTextNode((s.querySelector('h3')?.textContent||'Section '+(i+1)).replace(/^\d+\.\s*/,'')));
    t.onclick=()=>{s.scrollIntoView({behavior:'smooth',block:'start'});[...tabs.children].forEach(x=>x.classList.toggle('active',x===t))};
    tabs.append(t);
   });dialog.append(tabs);
  }
  if(!footer){
   const submit=form.querySelector('button[type=submit]');
   if(submit){
    const buttons=document.createElement('div');buttons.className='wm-footer';
    const cancel=document.createElement('button');cancel.type='button';cancel.className='btn';cancel.textContent='Cancel';cancel.onclick=closeDrawer;
    form.append(buttons);buttons.append(cancel,submit);
    buttons.dataset.wmFooter='yes';
   }
  }
  const finalFooter=form.querySelector(':scope > .wr-drawer-footer,:scope > .wm-footer,:scope > .actions');
  if(finalFooter){
   finalFooter.className='wm-footer';
   let cancel=[...finalFooter.querySelectorAll('button')].find(x=>x.type==='button'&&/cancel/i.test(x.textContent));
   if(!cancel){cancel=document.createElement('button');cancel.type='button';cancel.className='btn';cancel.textContent='Cancel';cancel.onclick=closeDrawer;finalFooter.prepend(cancel)}
   const button=finalFooter.querySelector('button[type=submit]');
   if(button&&/^Add company$/i.test(title))button.textContent='Save company';
   finalFooter.remove();form.append(finalFooter);
  }
  scroll.append(form);dialog.append(scroll);
 }else{
   dialog.classList.add('wm-compact');
   const section=document.createElement('section');section.className='wm-section';
   for(const node of original)if(node.nodeType===1&&node!==eyebrow&&node!==heading&&node!==description)section.append(node);
   scroll.append(section);dialog.append(scroll);
 }
 const footer=dialog.querySelector('.wm-form > .wm-footer');
 if(footer){footer.remove();dialog.append(footer);footer.querySelectorAll('button').forEach(b=>{if(b.type==='submit')b.addEventListener('click',()=>{if(form.requestSubmit)form.requestSubmit();else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))})})}
 dialog.querySelectorAll('.wm-form>.wr-form-section').forEach(s=>s.classList.add('wm-section'));
 scroll.scrollTop=0;
}
/* Shared independent simple dialogs, built fresh each time. */
function wrSimpleModal({category='WORKRELIEF',title,description='',body,actions=[],onDismiss=()=>{}}){
 const overlay=document.createElement('div');overlay.className='wm-overlay';
 const dialog=document.createElement('section');dialog.className='wm-dialog wm-compact';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 const header=document.createElement('header');header.className='wm-header';const eyebrow=document.createElement('span');eyebrow.className='wm-eyebrow';eyebrow.textContent=category;
 const h=document.createElement('h2');h.className='wm-heading';h.textContent=title;const p=document.createElement('p');p.className='wm-description';p.textContent=description;
 const close=document.createElement('button');close.className='wm-close';close.type='button';close.textContent='×';close.setAttribute('aria-label','Close');
 const scroll=document.createElement('div');scroll.className='wm-scroll';const section=document.createElement('section');section.className='wm-section';section.append(body);scroll.append(section);
 const footer=document.createElement('footer');footer.className='wm-footer';for(const {label,primary,onClick} of actions){const btn=document.createElement('button');btn.type='button';btn.className='btn'+(primary?' primary':'');btn.textContent=label;btn.onclick=()=>onClick(finish);footer.append(btn)}
 const oldFocus=document.activeElement;function finish(){overlay.remove();document.removeEventListener('keydown',key);oldFocus?.focus?.()}
 function dismiss(){finish();onDismiss()}function key(e){if(e.key==='Escape')dismiss()}close.onclick=dismiss;overlay.onclick=e=>{if(e.target===overlay)dismiss()};document.addEventListener('keydown',key);
 header.append(eyebrow,h,p,close);dialog.append(header,scroll,footer);overlay.append(dialog);document.body.append(overlay);close.focus();return {overlay,dialog,finish};
}
