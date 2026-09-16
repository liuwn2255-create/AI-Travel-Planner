/*
  AI endpoint:
  - GitHub Pages cannot safely hold an OpenAI API key.
  - Set this to your deployed Cloudflare Worker URL, e.g.
    https://ai-travel-planner-api.example.workers.dev/api/plan
*/
const API_URL = "https://weathered-dew-b2c0.liuwn2255.workers.dev/api/plan";

const form=document.getElementById("plannerForm");
const result=document.getElementById("result");
const summary=document.getElementById("tripSummary");
const daysList=document.getElementById("daysList");
const statusEl=document.getElementById("status");
const submitBtn=document.getElementById("submitBtn");

form.addEventListener("submit", async (event)=>{
  event.preventDefault();
  const payload={
    destination: document.getElementById("destination").value.trim(),
    days: Number(document.getElementById("days").value),
    date: document.getElementById("date").value,
    people: document.getElementById("people").value,
    budget: document.getElementById("budget").value,
    pace: document.getElementById("pace").value,
    interest: document.getElementById("interest").value.trim()
  };
  if(!payload.destination){statusEl.textContent="請先輸入目的地。";return;}
  if(API_URL.includes("YOUR-WORKER-DOMAIN")){
    statusEl.textContent="網站骨架已完成，但還沒有設定 AI 後端網址。請先部署 worker，再把 API_URL 換成你的網址。";
    return;
  }

  submitBtn.disabled=true;
  submitBtn.textContent="✨ AI 正在規劃中…";
  statusEl.textContent="正在整理你的旅行條件，請稍候。";
  try{
    const response=await fetch(API_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    const data=await response.json();
    if(!response.ok) throw new Error(data.error||"AI 服務暫時無法使用");
    renderTrip(data);
    result.classList.remove("hidden");
    result.scrollIntoView({behavior:"smooth",block:"start"});
    statusEl.textContent="完成！";
  }catch(error){
    statusEl.textContent="目前無法取得 AI 行程："+error.message;
  }finally{
    submitBtn.disabled=false;
    submitBtn.textContent="✨ 請 AI 幫我規劃";
  }
});

function renderTrip(trip){
  summary.innerHTML=`
    <div class="summary-title">✈️ ${escapeHtml(trip.title||"AI 旅行計畫")}</div>
    <p style="margin-top:6px">${escapeHtml(trip.overview||"已依照你的條件產生旅行草案。")}</p>
    <div class="summary-meta">
      ${(trip.tags||[]).map(tag=>`<span class="tag">${escapeHtml(tag)}</span>`).join("")}
    </div>`;
  daysList.innerHTML="";
  (trip.days||[]).forEach((day,index)=>{
    const card=document.createElement("article");
    card.className="day-card";
    card.innerHTML=`
      <div class="day-number">DAY ${index+1}</div>
      <h3>${escapeHtml(day.title||"今日行程")}</h3>
      <p>${escapeHtml(day.summary||"")}</p>
      <ul>${(day.activities||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
    daysList.appendChild(card);
  });
}
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
