const API_URL = "https://divine-shape-943e.liuwn2255.workers.dev/api/plan";

const form = document.getElementById("plannerForm");
const result = document.getElementById("result");
const summary = document.getElementById("tripSummary");
const daysList = document.getElementById("daysList");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    destination: document.getElementById("destination").value.trim(),
    days: Number(document.getElementById("days").value),
    date: document.getElementById("date").value,
    people: document.getElementById("people").value,
    budget: document.getElementById("budget").value,
    pace: document.getElementById("pace").value,
    interest: document.getElementById("interest").value.trim()
  };

  if (!payload.destination) {
    statusEl.textContent = "請先輸入目的地。";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "✨ AI 正在規劃中…";
  statusEl.textContent = "正在整理你的旅行條件，請稍候。";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch (e) {
      throw new Error(
        `HTTP ${response.status}：伺服器回傳的內容不是 JSON：${raw.slice(0, 800)}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}：${data.error || raw.slice(0, 800)}`
      );
    }

    if (!data || !Array.isArray(data.days)) {
      throw new Error(
        `AI 回傳格式不正確：${raw.slice(0, 800)}`
      );
    }

    renderTrip(data);

    result.classList.remove("hidden");

    result.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    statusEl.textContent = "完成！";

  } catch (error) {
    console.error("AI Travel Planner Error:", error);

    statusEl.innerHTML =
      `❌ 目前無法取得 AI 行程<br>
      <span style="font-size:14px;color:#b42318;">
      ${escapeHtml(error.message || String(error))}
      </span>`;

  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "✨ 請 AI 幫我規劃";
  }
});


function renderTrip(trip) {

  summary.innerHTML = `
    <div class="summary-title">
      ✈️ ${escapeHtml(trip.title || "AI 旅行計畫")}
    </div>

    <p style="margin-top:6px">
      ${escapeHtml(
        trip.overview || "已依照你的條件產生旅行草案。"
      )}
    </p>

    <div class="summary-meta">
      ${(trip.tags || [])
        .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join("")}
    </div>
  `;

  daysList.innerHTML = "";

  (trip.days || []).forEach((day, index) => {

    const card = document.createElement("article");

    card.className = "day-card";

    card.innerHTML = `

      <div class="day-number">
        DAY ${index + 1}
      </div>

      <h3>
        ${escapeHtml(day.title || "今日行程")}
      </h3>

      <p>
        ${escapeHtml(day.summary || "")}
      </p>


      <!-- 景點行程 -->

      <div class="trip-section">

        <h4>📍 景點行程</h4>

        <ul>
          ${(day.activities || [])
            .map(x => `<li>${escapeHtml(x)}</li>`)
            .join("")}
        </ul>

      </div>


      <!-- 時間安排 -->

      <div class="trip-section">

        <h4>⏰ 時間安排</h4>

        <ul>
          ${(day.schedule || [])
            .map(x => `<li>${escapeHtml(x)}</li>`)
            .join("")}
        </ul>

      </div>


      <!-- 交通方式 -->

      <div class="trip-section">

        <h4>🚆 交通方式</h4>

        <ul>
          ${(day.transport || [])
            .map(x => `<li>${escapeHtml(x)}</li>`)
            .join("")}
        </ul>

      </div>


      <!-- 餐飲建議 -->

      <div class="trip-section">

        <h4>🍜 餐飲建議</h4>

        <ul>
          ${(day.meals || [])
            .map(x => `<li>${escapeHtml(x)}</li>`)
            .join("")}
        </ul>

      </div>


      <!-- 預估花費 -->

      <div class="trip-section">

        <h4>💰 今日預估花費</h4>

        <p>
          ${escapeHtml(
            day.budget || "請依實際消費情況估算。"
          )}
        </p>

      </div>


      <!-- 旅遊提醒 -->

      <div class="trip-section">

        <h4>💡 旅遊提醒</h4>

        <ul>
          ${(day.tips || [])
            .map(x => `<li>${escapeHtml(x)}</li>`)
            .join("")}
        </ul>

      </div>

    `;

    daysList.appendChild(card);

  });
}


function escapeHtml(value) {

  return String(value ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c])
  );

}
