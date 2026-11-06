const palette={crm:'#1768f5',scheduling:'#12b8b1',forms:'#ff8419',desk:'#ed3192',hr:'#8839ec',training:'#247bff',compliance:'#10c66e',time:'#8a3cf6',tasks:'#e59a32',projects:'#4c77d9',chat:'#7a4fdd',docs:'#5b77a6',sign:'#e68c45',billing:'#3f94cc',field:'#8a69d4',inventory:'#c77842',assets:'#3b81ac',workflow:'#8467d0',ai:'#9457e8'};
let loading;
async function pdfLibrary(){
 if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
 if(!loading)loading=new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.onload=()=>window.jspdf?.jsPDF?resolve(window.jspdf.jsPDF):reject(Error('PDF generator did not initialize'));
  s.onerror=()=>reject(Error('Unable to load PDF generator'));document.head.append(s);
 }).catch(e=>{loading=null;throw e});
 return loading;
}
async function logoImage(){
 try{
  const response=await fetch('/assets/img/logo.png',{cache:'force-cache'});if(!response.ok)throw Error('Logo unavailable');
  const blob=await response.blob(),url=URL.createObjectURL(blob);
  try{
   const img=new Image();await new Promise((ok,fail)=>{img.onload=ok;img.onerror=fail;img.src=url});
   const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);
   return {data:canvas.toDataURL('image/png'),ratio:img.naturalHeight/img.naturalWidth};
  }finally{URL.revokeObjectURL(url)}
 }catch{return null}
}
export async function downloadReceipt(r){
 const PDF=await pdfLibrary();const pdf=new PDF({unit:'pt',format:'letter'});
 const accentHex=palette[String(r.apps?.[0]||'').toLowerCase()]||palette.crm;
 const rgb=[1,3,5].map(i=>parseInt(accentHex.slice(i,i+2),16));
 const pale=rgb.map(v=>Math.round(255-(255-v)*.10));
 const ink=[16,38,75],muted=[101,119,147],line=[221,231,243];
 const amount=new Intl.NumberFormat('en-US',{style:'currency',currency:String(r.currency||'usd').toUpperCase()}).format(Number(r.amount_cents||0)/100);
 const date=r.paid_at?new Date(typeof r.paid_at==='number'?r.paid_at*1000:r.paid_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}):'Not available';
 const label=v=>String(v||'').replace(/_/g,' ').replace(/\b\w/g,x=>x.toUpperCase());
 const text=(value,x,y,size=10,bold=false,color=ink,opts={})=>{pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(...color);pdf.text(String(value??''),x,y,opts)};
 const wrapped=(value,x,y,width,size=10,bold=false,color=ink)=>{pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(...color);pdf.text(pdf.splitTextToSize(String(value||'None'),width).slice(0,2),x,y)};
 const rect=(x,y,w,h,rad,color)=>{pdf.setFillColor(...color);pdf.roundedRect(x,y,w,h,rad,rad,'F')};
 const rule=y=>{pdf.setDrawColor(...line);pdf.setLineWidth(.7);pdf.line(42,y,570,y)};
 pdf.setFillColor(255,255,255);pdf.rect(0,0,612,792,'F');pdf.setFillColor(...rgb);pdf.rect(0,0,612,9,'F');
 const logo=await logoImage();
 if(logo){try{pdf.addImage(logo.data,'PNG',42,35,175,Math.min(61,175*logo.ratio))}catch{text('workrelief',42,70,25,true)}}else text('workrelief',42,70,25,true);
 text('PAYMENT RECEIPT',570,51,10,true,rgb,{align:'right'});
 text(String(r.reference||'—').slice(0,38),570,69,10,true,ink,{align:'right'});rule(113);
 rect(42,134,528,113,12,pale);rect(57,151,36,36,18,rgb);
 pdf.setDrawColor(255,255,255);pdf.setLineWidth(2.6);pdf.line(66,169,72,175);pdf.line(72,175,84,161);
 text('Payment confirmed',107,166,23,true);text('Your WorkRelief subscription payment is complete.',107,187,10,false,muted);
 text('TOTAL PAID',58,218,9,true,muted);text(amount,544,225,25,true,ink,{align:'right'});
 text('PURCHASE SUMMARY',42,280,10,true,rgb);
 text('Applications',42,311,10,false,muted);
 wrapped((r.apps||[]).map(label).join(', ')||'None',235,311,325,11,true);rule(344);
 text('Additional team members',42,364,10,false,muted);text(String(r.seats||0),570,364,11,true,ink,{align:'right'});rule(380);
 text('White Label applications',42,400,10,false,muted);wrapped((r.white||[]).map(label).join(', ')||'None',235,400,325,10,true);rule(433);
 text('Billing frequency',42,453,10,false,muted);text(r.cycle==='annual'?'Annual':'Monthly',570,453,11,true,ink,{align:'right'});rule(469);
 text('PAYMENT DETAILS',42,502,10,true,rgb);rect(42,516,528,120,10,[247,250,254]);
 text('Payment status',58,542,10,false,muted);text('PAID',554,542,10,true,rgb,{align:'right'});
 pdf.setDrawColor(...line);pdf.line(58,553,554,553);
 text('Payment date',58,573,10,false,muted);text(date,554,573,10,true,ink,{align:'right'});pdf.line(58,586,554,586);
 text('Receipt reference',58,610,10,false,muted);text(String(r.reference||'—').slice(0,38),554,610,10,true,ink,{align:'right'});
 rect(42,654,528,59,9,pale);text('Subscription information',57,673,10,true);
 wrapped('Your subscription renews according to the selected billing frequency. Keep this receipt for your records.',57,691,494,9,false,muted);
 rule(736);text('workrelief · One platform. Less busywork.',42,758,9,false,muted);text('workreliefapps.com',570,758,9,true,rgb,{align:'right'});
 const filename='workrelief-receipt-'+String(r.reference||'receipt').replace(/[^a-z0-9-]/gi,'')+'.pdf';
 const blob=pdf.output('blob');if(!blob||blob.size<1500)throw Error('Receipt PDF generation failed');
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}