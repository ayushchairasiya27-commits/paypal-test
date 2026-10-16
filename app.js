const DEMO_INVOICES = [
  {id:1,client:"Rahul Sharma",email:"rahul@example.com",amount:450,dueDate:"2026-10-10",paid:false},
  {id:2,client:"Priya Designs",email:"priya@example.com",amount:1200,dueDate:"2026-10-20",paid:false},
  {id:3,client:"Acme Studio",email:"billing@acme.example",amount:800,dueDate:"2026-10-05",paid:true},
  {id:4,client:"Nexa Tech",email:"accounts@nexa.example",amount:2300,dueDate:"2026-09-28",paid:false},
  {id:5,client:"Lotus Cafe",email:"owner@lotus.example",amount:150,dueDate:"2026-10-18",paid:false}
];
const TODAY = new Date("2026-10-16T12:00:00");
let invoices = DEMO_INVOICES.map(x=>({...x}));
let collected = invoices.filter(x=>x.paid).reduce((s,x)=>s+x.amount,0);
let pendingDraft = null;
let selectedInvoice = null;
let activity = [];
let toastTimer;
const $ = id => document.getElementById(id);
const money = n => "$"+Number(n).toLocaleString("en-US");
const dateLabel = s => new Date(s+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const daysLate = inv => Math.floor((TODAY-new Date(inv.dueDate+"T12:00:00"))/86400000);
const statusOf = inv => inv.paid ? "paid" : daysLate(inv)>0 ? "overdue" : "unpaid";
const riskOf = inv => {
  if(inv.paid) return "low";
  const late=daysLate(inv);
  if(late>14 || inv.amount>=2000) return "high";
  if(late>0 || inv.amount>=1000) return "medium";
  return "low";
};
const titleCase = s => s.charAt(0).toUpperCase()+s.slice(1);
const escapeHTML = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function showToast(message){
  const t=$("toast"); t.textContent=message; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"),2800);
}
function addActivity(title,detail){
  activity.unshift({title,detail,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})});
  activity=activity.slice(0,12); renderActivity();
}
function renderActivity(){
  const list=$("activity-list");
  if(!activity.length){list.innerHTML='<li class="activity-empty">No activity yet. Run the assistant to get started.</li>';return;}
  list.innerHTML=activity.map((a,i)=>`<li><span class="activity-marker">${i===0?"✦":"✓"}</span><strong>${escapeHTML(a.title)}</strong>${escapeHTML(a.detail)}<span class="activity-time">${escapeHTML(a.time)}</span></li>`).join("");
}
function animateNumber(el,target,isMoney=false){
  const start=performance.now(),duration=650;
  function frame(now){
    const p=Math.min((now-start)/duration,1),eased=1-Math.pow(1-p,3),v=Math.round(target*eased);
    el.textContent=isMoney?money(v):v;
    if(p<1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function updateStats(){
  const unpaid=invoices.filter(i=>!i.paid);
  const outstanding=unpaid.reduce((s,i)=>s+i.amount,0);
  const overdue=unpaid.filter(i=>statusOf(i)==="overdue").length;
  const high=unpaid.filter(i=>riskOf(i)==="high").length;
  animateNumber($("stat-outstanding"),outstanding,true);
  animateNumber($("stat-overdue"),overdue);
  animateNumber($("stat-risk"),high);
  animateNumber($("stat-collected"),collected,true);
  $("nav-invoice-count").textContent=unpaid.length;
  const paid=invoices.filter(i=>i.paid).length, unpaidSoon=unpaid.filter(i=>statusOf(i)==="unpaid").length;
  const pct=invoices.length?Math.round(paid/invoices.length*100):0;
  $("health-percent").textContent=pct+"%";
  $("health-progress").style.width=pct+"%";
  $("health-paid").textContent=paid;
  $("health-unpaid").textContent=unpaidSoon;
  $("health-overdue").textContent=overdue;
  if(chart){chart.data.datasets[0].data=[outstanding,overdue?unpaid.filter(i=>statusOf(i)==="overdue").reduce((s,i)=>s+i.amount,0):0,unpaidSoon?unpaid.filter(i=>statusOf(i)==="unpaid").reduce((s,i)=>s+i.amount,0):0];chart.data.datasets[1].data=[collected,paid?collected:0,0];chart.update();}
}
function renderInvoices(){
  const search=$("invoice-search").value.trim().toLowerCase(),status=$("status-filter").value,risk=$("risk-filter").value,sort=$("sort-filter").value;
  let filtered=invoices.filter(inv=>(inv.client+" "+inv.id+" "+inv.email).toLowerCase().includes(search)&&(status==="all"||statusOf(inv)===status)&&(risk==="all"||riskOf(inv)===risk));
  const riskRank={high:0,medium:1,low:2};
  filtered.sort((a,b)=>sort==="amount"?b.amount-a.amount:sort==="risk"?riskRank[riskOf(a)]-riskRank[riskOf(b)]:sort==="client"?a.client.localeCompare(b.client):new Date(a.dueDate)-new Date(b.dueDate));
  const tbody=$("invoice-body");
  if(!filtered.length){tbody.innerHTML='<tr><td colspan="6"><div class="empty-state"><strong>No invoices found</strong>Try changing your search or filters.</div></td></tr>';}
  else tbody.innerHTML=filtered.map((inv,i)=>{
    const status=statusOf(inv),risk=riskOf(inv),late=daysLate(inv);
    const due=inv.paid?"Settled":late>0?`${late} day${late===1?"":"s"} late`:late===0?"Due today":"In "+Math.abs(late)+" days";
    const initials=inv.client.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase();
    return `<tr><td><div class="client-cell"><span class="client-avatar color-${(inv.id-1)%5}">${escapeHTML(initials)}</span><span><span class="client-name">${escapeHTML(inv.client)}</span><span class="invoice-id">INV-${String(inv.id).padStart(4,"0")} · ${escapeHTML(due)}</span></span></div></td><td class="amount-cell">${money(inv.amount)}</td><td>${dateLabel(inv.dueDate)}</td><td><span class="badge risk-${risk}">${titleCase(risk)}</span></td><td><span class="badge status-${status}">${titleCase(status)}</span></td><td>${inv.paid?'<button class="row-action view" data-action="view" data-id="'+inv.id+'">View details</button>':'<button class="row-action" data-action="draft" data-id="'+inv.id+'">Draft reminder ↗</button>'}</td></tr>`;
  }).join("");
  $("invoice-count-label").textContent=`Showing ${filtered.length} of ${invoices.length} invoices`;
  updateStats();
}
function draftText(inv,tone){
  const late=Math.max(0,daysLate(inv));
  if(tone==="friendly") return `Hi ${inv.client},\n\nI hope you're doing well! This is a friendly reminder that invoice INV-${String(inv.id).padStart(4,"0")} for ${money(inv.amount)} is ${late>0?`${late} days overdue`:`due on ${dateLabel(inv.dueDate)}`}. When convenient, please review the invoice and arrange payment through your usual secure payment method.\n\nThank you for your time.`;
  if(tone==="firm") return `Hi ${inv.client},\n\nOur records show that invoice INV-${String(inv.id).padStart(4,"0")} for ${money(inv.amount)} ${late>0?`is now ${late} days overdue`:`is due on ${dateLabel(inv.dueDate)}`}. Could you please review the outstanding balance and let us know when we can expect payment?\n\nIf you've already paid, please disregard this reminder. Thank you.`;
  return `Hi ${inv.client},\n\nWe're following up again regarding invoice INV-${String(inv.id).padStart(4,"0")} for ${money(inv.amount)}, which is ${late} days overdue. Please review the outstanding balance and contact us if there is an issue or if you need to discuss a payment timeline.\n\nThank you for your prompt attention.`;
}
function openDraft(inv){
  pendingDraft=inv;
  const tone=daysLate(inv)>14||inv.amount>=2000?"final":daysLate(inv)>0||inv.amount>=1000?"firm":"friendly";
  $("draft-title").textContent=`Reminder for ${inv.client}`;
  $("draft-meta").textContent=`INV-${String(inv.id).padStart(4,"0")} · ${money(inv.amount)} · ${titleCase(riskOf(inv))} risk · ${inv.email}`;
  $("draft-tone").value=tone;
  $("draft-message").value=draftText(inv,tone);
  $("draft-backdrop").hidden=false;
  $("draft-tone").focus();
  addActivity("Reminder draft opened",`Prepared a ${tone} draft for ${inv.client}.`);
}
function closeDraft(){$("draft-backdrop").hidden=true;pendingDraft=null;}
function openInvoice(inv){
  selectedInvoice=inv;
  const status=statusOf(inv),risk=riskOf(inv),late=daysLate(inv);
  $("modal-title").textContent=inv.client;
  $("modal-content").innerHTML=`<div class="modal-detail-grid"><div class="detail-tile"><span>Invoice number</span><strong>INV-${String(inv.id).padStart(4,"0")}</strong></div><div class="detail-tile"><span>Amount</span><strong>${money(inv.amount)}</strong></div><div class="detail-tile"><span>Due date</span><strong>${dateLabel(inv.dueDate)}</strong></div><div class="detail-tile"><span>Status</span><strong>${titleCase(status)}</strong></div><div class="detail-tile"><span>Risk level</span><strong>${titleCase(risk)}</strong></div><div class="detail-tile"><span>Payment timing</span><strong>${inv.paid?"Settled":late>0?late+" days late":late===0?"Due today":"Due in "+Math.abs(late)+" days"}</strong></div></div><p class="modal-note"><strong>Demo risk explanation:</strong> ${inv.paid?"This invoice is marked as paid in the sample data.":risk==="high"?"This invoice is flagged because it is significantly overdue or its amount is at least $2,000.":risk==="medium"?"This invoice is flagged because it is overdue or its amount is at least $1,000.":"This invoice has a lower demo risk based on its due date and amount."}<br><br>Contact: ${escapeHTML(inv.email)}<br>These are sample records, not live PayPal transactions.</p>`;
  $("modal-draft").style.display=inv.paid?"none":"inline-flex";
  $("modal-backdrop").hidden=false;
}
function closeInvoice(){$("modal-backdrop").hidden=true;selectedInvoice=null;}
function runAgent(){
  const unpaid=invoices.filter(i=>!i.paid);
  if(!unpaid.length){showToast("No unpaid demo invoices found.");return;}
  addActivity("AI assistant scan completed",`Reviewed ${invoices.length} sample invoices and found ${unpaid.filter(i=>statusOf(i)==="overdue").length} overdue.`);
  const overdue=unpaid.filter(i=>statusOf(i)==="overdue");
  const high=unpaid.filter(i=>riskOf(i)==="high");
  $("assistant-result").hidden=false;
  $("assistant-result").textContent=`Scan complete — demo analysis only\n\n• ${unpaid.length} unpaid invoice(s) need tracking.\n• ${overdue.length} invoice(s) are overdue.\n• ${high.length} account(s) are marked high risk by the demo rules.\n\nRecommended next step: review high-risk invoices first, then prepare a reminder for each client. Nothing has been sent.`;
  $("assistant-result").scrollIntoView({behavior:"smooth",block:"nearest"});
  showToast("Demo scan complete — review the recommendations.");
}
function assistantPrompt(kind){
  const unpaid=invoices.filter(i=>!i.paid),overdue=unpaid.filter(i=>statusOf(i)==="overdue"),high=unpaid.filter(i=>riskOf(i)==="high");
  const result=$("assistant-result");result.hidden=false;
  if(kind==="overdue")result.textContent=overdue.length?`Overdue invoices (${overdue.length})\n\n${overdue.map(i=>`• ${i.client} — ${money(i.amount)}, ${daysLate(i)} days overdue.`).join("\n")}\n\nSuggested next step: open each invoice and review a reminder draft.`:"Great news — no unpaid invoices are overdue in this sample data.";
  if(kind==="risk")result.textContent=high.length?`High-risk accounts (${high.length})\n\n${high.map(i=>`• ${i.client} — ${money(i.amount)}. ${daysLate(i)>14?`${daysLate(i)} days overdue.`:"Flagged because the invoice amount is at least $2,000."}`).join("\n")}\n\nRisk is calculated using simple demo rules, not a trained AI model.`:"No high-risk unpaid accounts found in this sample.";
  if(kind==="draft"){
    if(!unpaid.length){result.textContent="No unpaid invoices to draft reminders for.";return;}
    openDraft(unpaid[0]);result.textContent=`You can prepare a reminder for ${unpaid[0].client} in the editor. Use each invoice's Draft reminder button to review the others.`;
  }
  addActivity("Assistant suggestion viewed",kind==="overdue"?"Reviewed overdue invoices.":kind==="risk"?"Reviewed high-risk explanations.":"Opened reminder drafting.");
}
function exportCSV(){
  const rows=[["Invoice","Client","Email","Amount USD","Due date","Risk","Status"],...invoices.map(i=>[`INV-${String(i.id).padStart(4,"0")}`,i.client,i.email,i.amount,i.dueDate,riskOf(i),statusOf(i)])];
  const csv=rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="paypilot-demo-invoices.csv";a.click();URL.revokeObjectURL(url);
  addActivity("Invoice data exported","Downloaded the sample invoice list as a CSV.");showToast("CSV export downloaded.");
}
let chart=null;
function initChart(){
  const canvas=$("collections-chart");
  if(!canvas||!window.Chart)return;
  chart=new Chart(canvas,{type:"bar",data:{labels:["Portfolio","Overdue","Due soon"],datasets:[{label:"Outstanding",data:[4100,2750,1350],backgroundColor:"#1682f3",borderRadius:5,maxBarThickness:24},{label:"Collected",data:[800,800,0],backgroundColor:"#17b78b",borderRadius:5,maxBarThickness:24}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:"#081c4b",padding:11,displayColors:true,callbacks:{label:ctx=>`${ctx.dataset.label}: ${money(ctx.raw)}`}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{color:"#8c99ae",font:{family:"DM Sans",size:10}}},y:{beginAtZero:true,grid:{color:"#edf1f7",drawTicks:false},border:{display:false,dash:[3,4]},ticks:{color:"#9aa5b8",font:{family:"DM Sans",size:9},callback:v=>v>=1000?"$"+(v/1000)+"k":"$"+v}}}}});
}
$("run-agent-btn").addEventListener("click",runAgent);
$("invoice-search").addEventListener("input",renderInvoices);
["status-filter","risk-filter","sort-filter"].forEach(id=>$(id).addEventListener("change",renderInvoices));
$("invoice-body").addEventListener("click",e=>{
  const btn=e.target.closest("button[data-action]");if(!btn)return;
  const inv=invoices.find(i=>i.id===Number(btn.dataset.id));if(!inv)return;
  btn.dataset.action==="draft"?openDraft(inv):openInvoice(inv);
});
document.querySelectorAll("[data-prompt]").forEach(btn=>btn.addEventListener("click",()=>assistantPrompt(btn.dataset.prompt)));
document.querySelectorAll("[data-scroll]").forEach(btn=>btn.addEventListener("click",()=>document.querySelector(btn.dataset.scroll)?.scrollIntoView({behavior:"smooth"})));
$("export-btn").addEventListener("click",exportCSV);
$("modal-close").addEventListener("click",closeInvoice);$("modal-cancel").addEventListener("click",closeInvoice);
$("modal-backdrop").addEventListener("click",e=>{if(e.target===$("modal-backdrop"))closeInvoice();});
$("modal-draft").addEventListener("click",()=>{const inv=selectedInvoice;closeInvoice();if(inv)openDraft(inv);});
$("draft-close").addEventListener("click",closeDraft);$("draft-cancel").addEventListener("click",closeDraft);
$("draft-backdrop").addEventListener("click",e=>{if(e.target===$("draft-backdrop"))closeDraft();});
$("draft-tone").addEventListener("change",()=>{if(pendingDraft)$("draft-message").value=draftText(pendingDraft,$("draft-tone").value);});
$("save-draft").addEventListener("click",()=>{
  if(!pendingDraft)return;
  const client=pendingDraft.client;const message=$("draft-message").value.trim();
  if(!message){showToast("Please write a reminder before saving.");return;}
  addActivity("Reminder saved for review",`Saved an editable ${$("draft-tone").value} reminder for ${client}.`);
  closeDraft();showToast("Draft saved in this demo session. Nothing was sent.");
});
$("clear-activity").addEventListener("click",()=>{activity=[];renderActivity();showToast("Activity list cleared.");});
$("reset-demo").addEventListener("click",()=>{
  invoices=DEMO_INVOICES.map(x=>({...x}));collected=invoices.filter(x=>x.paid).reduce((s,x)=>s+x.amount,0);
  activity=[];$("invoice-search").value="";$("status-filter").value="all";$("risk-filter").value="all";$("sort-filter").value="due";
  $("assistant-result").hidden=true;renderActivity();renderInvoices();showToast("Demo data reset to its original state.");
});
$("notifications-button").addEventListener("click",()=>showToast("You're all caught up in this demo."));
$("mobile-menu").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
document.querySelectorAll(".nav-link").forEach(a=>a.addEventListener("click",()=>{$("sidebar").classList.remove("open");document.querySelectorAll(".nav-link").forEach(n=>n.classList.remove("active"));a.classList.add("active");}));
$("draft-message").addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")$("save-draft").click();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeInvoice();closeDraft();$("sidebar").classList.remove("open");}});
renderInvoices();renderActivity();initChart();
