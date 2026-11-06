const appNames=[{"name": "CRM", "desc": "Manage relationships."}, {"name": "HR", "desc": "Support your people."}, {"name": "Scheduling", "desc": "Coordinate with ease."}, {"name": "Tasks", "desc": "Turn plans into progress."}, {"name": "Projects", "desc": "Track work and milestones."}, {"name": "Chat", "desc": "Keep work in sync."}, {"name": "Forms", "desc": "Build and collect data."}, {"name": "Docs", "desc": "Store, share and collaborate."}, {"name": "Sign", "desc": "Get signatures faster."}, {"name": "Billing", "desc": "Simplify payments."}, {"name": "Desk", "desc": "Support your customers."}, {"name": "Training", "desc": "Enable your team."}, {"name": "Compliance", "desc": "Stay audit-ready."}, {"name": "Time", "desc": "Track time and PTO."}, {"name": "Field", "desc": "Dispatch and service."}, {"name": "Inventory", "desc": "Manage stock."}, {"name": "Assets", "desc": "Track equipment."}, {"name": "Workflow", "desc": "Automate everything."}, {"name": "AI", "desc": "Your business assistant."}];
document.querySelectorAll('[data-year]').forEach(e=>e.textContent=new Date().getFullYear());
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('.nav-links');if(menu&&nav)menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});
document.querySelectorAll('.dropdown-toggle').forEach(b=>b.addEventListener('click',()=>{const el=b.parentNode;document.querySelectorAll('.dropdown').forEach(d=>{if(d!==el){d.classList.remove('open');d.querySelector('button').setAttribute('aria-expanded','false')}});const open=el.classList.toggle('open');b.setAttribute('aria-expanded',String(open))}));
document.addEventListener('click',e=>{if(!e.target.closest('.dropdown'))document.querySelectorAll('.dropdown').forEach(d=>{d.classList.remove('open');d.querySelector('button').setAttribute('aria-expanded','false')})});
const dlg=document.querySelector('#search-dialog'),input=document.querySelector('#product-search'),results=document.querySelector('#search-results');document.querySelector('.search-trigger')?.addEventListener('click',()=>{dlg.showModal();input.focus();renderSearch('')});function renderSearch(q){results.innerHTML=appNames.filter(a=>(a.name+' '+a.desc).toLowerCase().includes(q.toLowerCase())).map(a=>`<a href="products.html#${a.name.toLowerCase()}"><strong>${a.name}</strong><span>${a.desc}</span></a>`).join('')||'<p>No matching apps</p>'};input?.addEventListener('input',()=>renderSearch(input.value));
document.querySelector('#contact-form')?.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(e.currentTarget);const text=`Name: ${d.get('firstName')} ${d.get('lastName')}\nEmail: ${d.get('email')}\nCompany: ${d.get('company')}\n\n${d.get('message')}`;location.href='mailto:hello@workreliefapps.com?subject='+encodeURIComponent('workrelief inquiry')+'&body='+encodeURIComponent(text);document.querySelector('#form-note').textContent='Your email application should open with a prepared message. No form data was submitted to a server.'});
// Close dropdowns after navigation, on Escape, and when closing the mobile menu.
document.addEventListener('keydown',event=>{if(event.key==='Escape'){
  document.querySelectorAll('.dropdown.open').forEach(d=>{d.classList.remove('open');d.querySelector('.dropdown-toggle')?.setAttribute('aria-expanded','false')});
  document.querySelector('.nav-links')?.classList.remove('open');document.querySelector('.menu-toggle')?.setAttribute('aria-expanded','false');
}});
document.querySelectorAll('.dropdown-panel a').forEach(a=>a.addEventListener('click',()=>{
  document.querySelectorAll('.dropdown.open').forEach(d=>{d.classList.remove('open');d.querySelector('.dropdown-toggle')?.setAttribute('aria-expanded','false')});
}));

// Solutions page category filter
document.addEventListener('DOMContentLoaded',()=>{const controls=document.querySelectorAll('[data-solution-filter]');const cards=document.querySelectorAll('[data-solution-type]');controls.forEach(button=>button.addEventListener('click',()=>{const group=button.dataset.solutionFilter;controls.forEach(b=>b.classList.toggle('active',b===button));cards.forEach(card=>card.hidden=group!=='all'&&card.dataset.solutionType!==group)}))});

// Shared navigation: keep mobile drawer and dropdown states in sync.
(function(){
  const toggle=document.querySelector('.menu-toggle');
  const links=document.querySelector('.nav-links');
  const closeMenus=()=>{
    if(links) links.classList.remove('open');
    if(toggle) toggle.setAttribute('aria-expanded','false');
    document.querySelectorAll('.dropdown.open').forEach(drop=>{
      drop.classList.remove('open');
      drop.querySelector('.dropdown-toggle')?.setAttribute('aria-expanded','false');
    });
  };
  document.querySelectorAll('.nav-links a').forEach(link=>link.addEventListener('click',closeMenus));
  document.addEventListener('click',event=>{
    if(!event.target.closest('.site-header')) closeMenus();
  });
  window.addEventListener('resize',()=>{
    if(window.matchMedia('(min-width: 1025px)').matches) closeMenus();
  });
  document.querySelector('.search-trigger')?.setAttribute('aria-label','Search all WorkRelief apps');
})();
