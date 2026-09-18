const API_URL = "https://divine-shape-943e.liuwn2255.workers.dev/api/plan";

const form = document.getElementById("plannerForm");
const result = document.getElementById("result");
const summary = document.getElementById("tripSummary");
const daysList = document.getElementById("daysList");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");

const regenerateBtn = document.getElementById("regenerateBtn");
const copyTripBtn = document.getElementById("copyTripBtn");
const favoriteTripBtn = document.getElementById("favoriteTripBtn");
const favoritesListBtn = document.getElementById("favoritesListBtn");
const topFavoritesBtn = document.getElementById("topFavoritesBtn");
const tripsFavoritesBtn = document.getElementById("tripsFavoritesBtn");
const favoritesPanel = document.getElementById("favoritesPanel");
const tripsSummary = document.getElementById("tripsSummary");
const shareTripBtn = document.getElementById("shareTripBtn");
const downloadTripBtn = document.getElementById("downloadTripBtn");
const printTripBtn = document.getElementById("printTripBtn");
const weatherTripBtn = document.getElementById("weatherTripBtn");
const weatherPanel = document.getElementById("weatherPanel");

let currentTrip = null;
let currentTripConditions = null;
const FAVORITES_KEY = "aiTravelFavorites";

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch (error) {
    console.error("Favorites Read Error:", error);
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}



/* ================================
   AI 產生旅遊行程
================================ */

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

  if (regenerateBtn) {
    regenerateBtn.disabled = true;
  }

  if (copyTripBtn) {
    copyTripBtn.disabled = true;
  }


  submitBtn.textContent = "✨ AI 正在規劃中…";

  statusEl.textContent =
    "正在整理你的旅行條件，請稍候。";


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


    currentTripConditions = payload;
    try { localStorage.setItem("aiTravelLastConditions", JSON.stringify(payload)); } catch (e) {}
    renderTrip(data);


    result.classList.remove("hidden");


    result.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });


    statusEl.textContent = "完成！";


  } catch (error) {

    console.error(
      "AI Travel Planner Error:",
      error
    );


    statusEl.innerHTML =
      `❌ 目前無法取得 AI 行程<br>
      <span style="font-size:14px;color:#b42318;">
      ${escapeHtml(error.message || String(error))}
      </span>`;


  } finally {

    submitBtn.disabled = false;

    if (regenerateBtn) {
      regenerateBtn.disabled = false;
    }

    if (copyTripBtn) {
      copyTripBtn.disabled = false;
    }

    submitBtn.textContent =
      "✨ 請 AI 幫我規劃";

  }

});


/* ================================
   🔄 重新規劃
================================ */

if (regenerateBtn) {

  regenerateBtn.addEventListener("click", () => {

    /*
      保留目前所有旅遊條件，
      直接重新請 AI 規劃。
    */

    form.requestSubmit();

  });

}


/* ================================
   📋 複製完整行程
================================ */

if (copyTripBtn) {

  copyTripBtn.addEventListener(
    "click",
    async () => {

      if (!currentTrip) {

        statusEl.textContent =
          "請先產生旅遊行程。";

        return;
      }


      const text =
        buildTripText(currentTrip);


      try {

        await navigator.clipboard.writeText(text);


        const originalText =
          copyTripBtn.textContent;


        copyTripBtn.textContent =
          "✅ 已複製完整行程";


        setTimeout(() => {

          copyTripBtn.textContent =
            originalText;

        }, 2000);


      } catch (error) {

        console.error(
          "Copy Trip Error:",
          error
        );


        statusEl.textContent =
          "無法自動複製，請確認瀏覽器的剪貼簿權限。";

      }

    }
  );

}


/* ================================
   ⬇️ 下載完整行程
================================ */

if (downloadTripBtn) {
  downloadTripBtn.addEventListener("click", () => {
    if (!currentTrip) {
      statusEl.textContent = "請先產生旅遊行程。";
      return;
    }

    const text = buildTripText(currentTrip);
    const blob = new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const rawTitle = currentTrip.title || "AI旅行行程";
    const safeTitle = rawTitle.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);

    link.href = url;
    link.download = `${safeTitle || "AI旅行行程"}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    const originalText = downloadTripBtn.textContent;
    downloadTripBtn.textContent = "✅ 已下載行程";
    statusEl.textContent = "完整行程已下載到你的電腦。";
    setTimeout(() => { downloadTripBtn.textContent = originalText; }, 2000);
  });
}


/* ================================
   建立可複製的完整行程文字
================================ */


/* ================================
   🖨️ 列印完整行程
================================ */

if (printTripBtn) {
  printTripBtn.addEventListener("click", () => {
    if (!currentTrip) {
      statusEl.textContent = "請先產生旅遊行程。";
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      statusEl.textContent = "瀏覽器阻擋了列印視窗，請允許彈出視窗後再試一次。";
      return;
    }

    const title = escapeHtml(currentTrip.title || "AI 旅遊計畫");
    const overview = escapeHtml(currentTrip.overview || "");
    const tags = (currentTrip.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("");

    const daysHtml = (currentTrip.days || []).map((day, index) => `
      <section class="print-day">
        <div class="day-number">DAY ${index + 1}</div>
        <h2>${escapeHtml(day.title || "今日行程")}</h2>
        <p>${escapeHtml(day.summary || "")}</p>
        <h3>📍 景點行程</h3>
        <ul>${(day.activities || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
        <h3>⏰ 時間安排</h3>
        <ul>${(day.schedule || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
        <h3>🚆 交通方式</h3>
        <ul>${(day.transport || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
        <h3>🍜 餐飲建議</h3>
        <ul>${(day.meals || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
        <h3>💰 今日預估花費</h3>
        <p>${escapeHtml(day.budget || "請依實際消費情況估算。")}</p>
        <h3>💡 旅遊提醒</h3>
        <ul>${(day.tips || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </section>
    `).join("");

    printWindow.document.write(`<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><title>${title}</title>
      <style>
        body{font-family:Arial,"Microsoft JhengHei",sans-serif;color:#172033;line-height:1.7;margin:0;padding:28px;}
        h1{font-size:28px;margin:0 0 8px;} h2{font-size:21px;margin:8px 0;} h3{font-size:16px;margin:18px 0 6px;}
        p{margin:6px 0;} .meta{margin:14px 0 20px;} .tag{display:inline-block;border:1px solid #cfd8ef;border-radius:999px;padding:3px 10px;margin:3px;font-size:12px;}
        .print-day{border-top:2px solid #e5e9f0;padding:18px 0;page-break-inside:avoid;} .day-number{font-size:12px;font-weight:bold;letter-spacing:1px;color:#315efb;}
        ul{margin:4px 0 0;padding-left:22px;} li{margin:3px 0;}
        .note{margin-top:28px;padding-top:12px;border-top:1px solid #e5e9f0;font-size:12px;color:#687386;}
        @media print{body{padding:0 10mm;} .print-day{break-inside:avoid;}}
      </style></head><body>
      <h1>✈️ ${title}</h1><p>${overview}</p><div class="meta">${tags}</div>
      ${daysHtml}
      <div class="note">AI 旅遊管家｜行程僅供參考，實際交通、營業時間與票券資訊請於出發前再次確認。</div>
      <script>window.onload=function(){window.print();};</script>
      </body></html>`);
    printWindow.document.close();
    statusEl.textContent = "已開啟列印預覽。";
  });
}


/* ================================
   📤 分享完整行程
================================ */

if (shareTripBtn) {
  shareTripBtn.addEventListener("click", async () => {
    if (!currentTrip) {
      statusEl.textContent = "請先產生旅遊行程。";
      return;
    }

    const text = buildTripText(currentTrip);
    const shareData = {
      title: currentTrip.title || "AI 旅遊管家行程",
      text
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        statusEl.textContent = "完整行程已分享。";
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        statusEl.textContent = "完整行程已複製，可以貼到 LINE、Messenger 或 Email 分享。";
      } else {
        window.prompt("請複製下面的完整行程：", text);
      }
    } catch (error) {
      if (error && error.name !== "AbortError") {
        console.error("Trip Share Error:", error);
        statusEl.textContent = "分享失敗，請再試一次。";
      }
    }
  });
}


/* ================================
   🌤️ 旅遊天氣
================================ */

const WEATHER_CODES = {
  0: "晴朗", 1: "大致晴朗", 2: "局部多雲", 3: "多雲",
  45: "有霧", 48: "霧凇",
  51: "小毛毛雨", 53: "毛毛雨", 55: "較強毛毛雨",
  61: "小雨", 63: "中雨", 65: "大雨",
  71: "小雪", 73: "中雪", 75: "大雪", 77: "雪粒",
  80: "短暫陣雨", 81: "陣雨", 82: "強陣雨",
  85: "小陣雪", 86: "強陣雪",
  95: "雷雨", 96: "雷雨伴冰雹", 99: "強雷雨伴冰雹"
};

function formatWeatherDate(dateText) {
  const date = new Date(`${dateText}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateText;
  return date.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric", weekday: "short" });
}

function formatWeatherTime(dateTimeText) {
  const date = new Date(dateTimeText);
  if (Number.isNaN(date.getTime())) return dateTimeText;
  return date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
}

async function loadTravelWeather() {
  if (statusEl) statusEl.textContent = "正在準備查詢旅遊天氣…";
  if (weatherPanel) {
    weatherPanel.classList.remove("hidden");
    weatherPanel.innerHTML = `<div class="weather-loading">🌤️ 正在連線查詢天氣，請稍候…</div>`;
  }

  let savedConditions = null;
  try { savedConditions = JSON.parse(localStorage.getItem("aiTravelLastConditions") || "null"); } catch (e) {}
  const conditions = currentTripConditions || savedConditions || {};
  const destination = (conditions.destination || document.getElementById("destination")?.value.trim() || "").trim();
  const startDate = conditions.date || document.getElementById("date")?.value || "";
  const days = Number(conditions.days || document.getElementById("days")?.value || currentTrip?.days?.length || 5);

  if (!destination) {
    if (statusEl) statusEl.textContent = "請先輸入目的地。";
    if (weatherPanel) weatherPanel.innerHTML = `<div class="weather-error">請先輸入目的地，再查詢天氣。</div>`;
    return;
  }

  if (weatherTripBtn) {
    weatherTripBtn.disabled = true;
    weatherTripBtn.textContent = "🌤️ 查詢中…";
  }

  try {
    const params = new URLSearchParams({
      destination,
      days: String(Math.min(Math.max(days, 1), 10))
    });
    if (startDate) params.set("date", startDate);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(`${API_URL.replace(/\/api\/plan$/, "")}/api/weather?${params.toString()}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) {
      throw new Error(data?.error || `天氣查詢失敗（HTTP ${response.status}）。`);
    }
    if (!Array.isArray(data.days) || !data.days.length) {
      throw new Error("目前沒有可顯示的天氣資料。");
    }

    const rows = data.days.map(day => `
      <div class="weather-day">
        <div class="weather-date">${escapeHtml(formatWeatherDate(day.date))}</div>
        <div class="weather-icon">${day.icon || "🌤️"}</div>
        <div class="weather-desc">${escapeHtml(day.description || "天氣變化")}</div>
        <div class="weather-temp">${Number.isFinite(Number(day.min)) ? Math.round(day.min) : "—"}° ～ ${Number.isFinite(Number(day.max)) ? Math.round(day.max) : "—"}°C</div>
        <div class="weather-rain">🌧️ 降雨機率 ${day.rain == null ? "—" : `${Math.round(day.rain)}%`}</div>
        <div class="weather-extra">💧 濕度 ${day.humidity == null ? "—" : `${Math.round(day.humidity)}%`}<br>💨 最大風速 ${day.wind == null ? "—" : `${Math.round(day.wind)} km/h`}</div>
        <div class="weather-sun">🌅 ${day.sunrise ? formatWeatherTime(day.sunrise) : "—"}　🌇 ${day.sunset ? formatWeatherTime(day.sunset) : "—"}</div>
      </div>`);

    weatherPanel.innerHTML = `
      <div class="weather-header">
        <div><span class="eyebrow">WEATHER</span><h3>🌤️ ${escapeHtml(data.location || destination)} 旅遊天氣</h3></div>
        <p>資料來源：Open-Meteo｜預報會隨時間更新，出發前請再次確認。</p>
      </div>
      <div class="weather-grid">${rows.join("")}</div>
      <div class="weather-note">🧳 <strong>旅遊提醒：</strong>若降雨機率較高，建議攜帶雨具並預留室內景點；實際天氣仍可能變化，出發前再查一次最準確。</div>
    `;
    if (statusEl) statusEl.textContent = "旅遊天氣查詢完成。";
  } catch (error) {
    console.error("Weather Error:", error);
    const message = error?.name === "AbortError"
      ? "天氣服務連線逾時，請稍後再試。"
      : (error?.message || "天氣查詢失敗。");
    if (weatherPanel) weatherPanel.innerHTML = `<div class="weather-error">🌦️ ${escapeHtml(message)}<br><small>請確認電腦可以連上網路；如果出發日期太遠，也可能超出目前預報範圍。</small></div>`;
    if (statusEl) statusEl.textContent = "天氣查詢未完成。";
  } finally {
    if (weatherTripBtn) {
      weatherTripBtn.disabled = false;
      weatherTripBtn.textContent = "🌤️ 查詢旅遊天氣";
    }
  }
}
if (weatherTripBtn) {
  weatherTripBtn.addEventListener("click", loadTravelWeather);
}

/* ================================
   ⭐ 收藏行程
================================ */

if (favoriteTripBtn) {
  favoriteTripBtn.addEventListener("click", () => {
    if (!currentTrip) {
      statusEl.textContent = "請先產生旅遊行程。";
      return;
    }

    const favorites = getFavorites();
    const exists = favorites.some(item =>
      JSON.stringify(item.trip) === JSON.stringify(currentTrip)
    );

    if (exists) {
      favoriteTripBtn.textContent = "✅ 已收藏";
      statusEl.textContent = "這份行程已經收藏過了。";
      return;
    }

    favorites.unshift({
      id: Date.now(),
      title: currentTrip.title || "AI 旅行計畫",
      savedAt: new Date().toLocaleString("zh-TW"),
      trip: JSON.parse(JSON.stringify(currentTrip)),
      conditions: currentTripConditions ? JSON.parse(JSON.stringify(currentTripConditions)) : null
    });

    saveFavorites(favorites.slice(0, 20));
    favoriteTripBtn.textContent = "✅ 已收藏";
    statusEl.textContent = "收藏成功！";
    renderFavorites();
  });
}

function showFavorites() {
  if (!favoritesPanel) return;
  renderFavorites();
  favoritesPanel.classList.remove("hidden");
  favoritesPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

if (favoritesListBtn) {
  favoritesListBtn.addEventListener("click", showFavorites);
}

if (topFavoritesBtn) {
  topFavoritesBtn.addEventListener("click", (event) => {
    event.preventDefault();
    showFavorites();
  });
}

if (tripsFavoritesBtn) {
  tripsFavoritesBtn.addEventListener("click", () => {
    if (!favoritesPanel) return;
    if (favoritesPanel.classList.contains("hidden")) {
      showFavorites();
    } else {
      favoritesPanel.classList.add("hidden");
    }
  });
}

function renderFavorites() {
  const favorites = getFavorites();
  if (favoritesPanel) {
    if (!favorites.length) {
      favoritesPanel.innerHTML = `
        <div class="favorites-header"><h3>📚 我的收藏</h3><p>目前還沒有收藏的旅程。</p></div>
      `;
    } else {
      favoritesPanel.innerHTML = `
        <div class="favorites-header"><h3>📚 我的收藏</h3><p>共 ${favorites.length} 份旅遊行程</p></div>
        <div class="favorites-list">
          ${favorites.map((item, index) => `
            <article class="favorite-card">
              <div class="favorite-number">收藏 ${index + 1}</div>
              <h4>${escapeHtml(item.title || "AI 旅行計畫")}</h4>
              <p>${escapeHtml(item.trip?.overview || "")}</p>
              <div class="favorite-card-actions">
                <button type="button" class="btn btn-secondary" data-favorite-view="${item.id}">👀 查看</button>
                <button type="button" class="btn btn-secondary" data-favorite-delete="${item.id}">🗑️ 刪除</button>
              </div>
            </article>
          `).join("")}
        </div>
      `;

      favoritesPanel.querySelectorAll("[data-favorite-view]").forEach(button => {
        button.addEventListener("click", () => {
          const id = Number(button.dataset.favoriteView);
          const item = getFavorites().find(x => x.id === id);
          if (!item) return;
          renderTrip(item.trip);
          currentTripConditions = item.conditions || null;
          result.classList.remove("hidden");
          statusEl.textContent = "已開啟收藏的旅遊行程。";
          result.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });

      favoritesPanel.querySelectorAll("[data-favorite-delete]").forEach(button => {
        button.addEventListener("click", () => {
          const id = Number(button.dataset.favoriteDelete);
          saveFavorites(getFavorites().filter(x => x.id !== id));
          renderFavorites();
          statusEl.textContent = "已刪除收藏。";
        });
      });
    }
  }

  if (tripsSummary) {
    if (!favorites.length) {
      tripsSummary.innerHTML = `<div class="empty-icon">🧳</div><h3>目前還沒有收藏的旅程</h3><p>產生行程後，按「⭐ 收藏這份行程」即可保存。</p>`;
    } else {
      tripsSummary.innerHTML = `<div class="empty-icon">📚</div><h3>已收藏 ${favorites.length} 份旅遊行程</h3><p>按上方「📚 我的收藏」即可查看。</p>`;
    }
  }
}

renderFavorites();

function buildTripText(trip) {

  let text = "";


  text +=
    `✈️ ${trip.title || "AI 旅行計畫"}\n`;


  text +=
    `${trip.overview || ""}\n`;


  if (
    trip.tags &&
    trip.tags.length
  ) {

    text +=
      `\n${trip.tags.map(
        tag => `#${tag}`
      ).join(" ")}\n`;

  }


  text +=
    "\n====================\n";


  (trip.days || []).forEach(
    (day, index) => {

      text +=
        `\n📅 DAY ${index + 1}｜${day.title || "今日行程"}\n`;


      text +=
        `${day.summary || ""}\n`;


      text +=
        "\n📍 景點行程\n";


      (day.activities || []).forEach(
        item => {

          text +=
            `・${item}\n`;

        }
      );


      text +=
        "\n⏰ 時間安排\n";


      (day.schedule || []).forEach(
        item => {

          text +=
            `・${item}\n`;

        }
      );


      text +=
        "\n🚆 交通方式\n";


      (day.transport || []).forEach(
        item => {

          text +=
            `・${item}\n`;

        }
      );


      text +=
        "\n🍜 餐飲建議\n";


      (day.meals || []).forEach(
        item => {

          text +=
            `・${item}\n`;

        }
      );


      text +=
        "\n💰 今日預估花費\n";


      text +=
        `${day.budget || "請依實際消費情況估算。"}\n`;


      text +=
        "\n💡 旅遊提醒\n";


      (day.tips || []).forEach(
        item => {

          text +=
            `・${item}\n`;

        }
      );


      text +=
        "\n--------------------\n";

    }
  );


  text +=
    "\nAI 旅遊規劃器｜行程僅供參考，實際資訊請出發前再次確認。";


  return text;

}


/* ================================
   顯示 AI 行程
================================ */

function renderTrip(trip) {

  currentTrip = trip;
  if (weatherPanel) {
    weatherPanel.classList.add("hidden");
    weatherPanel.innerHTML = "";
  }

  if (favoriteTripBtn) {
    const exists = getFavorites().some(item => JSON.stringify(item.trip) === JSON.stringify(trip));
    favoriteTripBtn.textContent = exists ? "✅ 已收藏" : "⭐ 收藏這份行程";
  }


  summary.innerHTML = `

    <div class="summary-title">
      ✈️ ${escapeHtml(
        trip.title ||
        "AI 旅行計畫"
      )}
    </div>

    <p style="margin-top:6px">

      ${escapeHtml(
        trip.overview ||
        "已依照你的條件產生旅行草案。"
      )}

    </p>

    <div class="summary-meta">

      ${(trip.tags || [])
        .map(
          tag =>
            `<span class="tag">
              ${escapeHtml(tag)}
            </span>`
        )
        .join("")}

    </div>

  `;


  daysList.innerHTML = "";


  (trip.days || []).forEach(
    (day, index) => {

      const card =
        document.createElement(
          "article"
        );


      card.className =
        "day-card";


      card.innerHTML = `

        <div class="day-number">
          DAY ${index + 1}
        </div>


        <h3>
          ${escapeHtml(
            day.title ||
            "今日行程"
          )}
        </h3>


        <p>
          ${escapeHtml(
            day.summary || ""
          )}
        </p>


        <div class="trip-section">

          <h4>
            📍 景點行程
          </h4>

          <ul>

            ${(day.activities || [])
              .map(
                x =>
                  `<li class="activity-map-item">
                    <span>${escapeHtml(x)}</span>
                    <button type="button" class="activity-map-btn" data-map-place="${encodeURIComponent(String(x))}" aria-label="在 Google 地圖查看 ${escapeHtml(x)}">📍 地圖</button>
                    <button type="button" class="activity-nav-btn" data-nav-place="${encodeURIComponent(String(x))}" aria-label="導航到 ${escapeHtml(x)}">🧭 導航</button>
                  </li>`
              )
              .join("")}

          </ul>

          <div class="day-map-controls">
            <select class="day-map-mode" aria-label="選擇今日地圖交通方式">
              <option value="driving">🚗 開車</option>
              <option value="transit">🚆 大眾運輸</option>
              <option value="walking">🚶 步行</option>
              <option value="bicycling">🚲 騎自行車</option>
            </select>
            <button type="button" class="btn btn-secondary day-map-btn" data-map-day="${encodeURIComponent(JSON.stringify(day.activities || []))}">🗺️ 查看今日地圖</button>
            <button type="button" class="btn btn-secondary day-map-location-btn" data-map-day-location="${encodeURIComponent(JSON.stringify(day.activities || []))}">📍 從我的位置出發</button>
            <button type="button" class="btn btn-secondary day-map-share-btn" data-share-day="${encodeURIComponent(JSON.stringify(day.activities || []))}">📤 分享今日路線</button>
          </div>

        </div>


        <div class="trip-section">

          <h4>
            ⏰ 時間安排
          </h4>

          <ul>

            ${(day.schedule || [])
              .map(
                x =>
                  `<li>
                    ${escapeHtml(x)}
                  </li>`
              )
              .join("")}

          </ul>

        </div>


        <div class="trip-section">

          <h4>
            🚆 交通方式
          </h4>

          <ul>

            ${(day.transport || [])
              .map(
                x =>
                  `<li>
                    ${escapeHtml(x)}
                  </li>`
              )
              .join("")}

          </ul>

        </div>


        <div class="trip-section">

          <h4>
            🍜 餐飲建議
          </h4>

          <ul>

            ${(day.meals || [])
              .map(
                x =>
                  `<li>
                    ${escapeHtml(x)}
                  </li>`
              )
              .join("")}

          </ul>

        </div>


        <div class="trip-section">

          <h4>
            💰 今日預估花費
          </h4>

          <p>

            ${escapeHtml(
              day.budget ||
              "請依實際消費情況估算。"
            )}

          </p>

        </div>


        <div class="trip-section">

          <h4>
            💡 旅遊提醒
          </h4>

          <ul>

            ${(day.tips || [])
              .map(
                x =>
                  `<li>
                    ${escapeHtml(x)}
                  </li>`
              )
              .join("")}

          </ul>

        </div>

      `;


      daysList.appendChild(card);

    }
  );

}


/* ================================
   🗺️ 每日地圖
================================ */

daysList.addEventListener("click", async (event) => {
  const shareButton = event.target.closest("[data-share-day]");
  if (shareButton) {
    let places = [];
    try {
      places = JSON.parse(decodeURIComponent(shareButton.dataset.shareDay || "[]"));
    } catch (error) {
      console.error("Map Share Data Error:", error);
    }
    places = Array.isArray(places) ? places.map(place => String(place).trim()).filter(Boolean) : [];
    if (!places.length) {
      statusEl.textContent = "今天沒有可分享的景點資料。";
      return;
    }

    const routeText = `今日旅遊路線\n${places.map((place, index) => `${index + 1}. ${place}`).join("\n")}`;
    const shareData = {
      title: "AI 旅遊管家－今日旅遊路線",
      text: routeText
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        statusEl.textContent = "今日路線已分享。";
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(routeText);
        statusEl.textContent = "今日路線已複製，可以貼到 LINE 或其他地方分享。";
      } else {
        window.prompt("請複製下面的今日路線：", routeText);
      }
    } catch (error) {
      if (error && error.name !== "AbortError") {
        console.error("Map Share Error:", error);
        statusEl.textContent = "分享失敗，請再試一次。";
      }
    }
    return;
  }

  const navButton = event.target.closest("[data-nav-place]");
  if (navButton) {
    const place = decodeURIComponent(navButton.dataset.navPlace || "").trim();
    if (place) {
      const controls = navButton.closest(".day-map-controls");
      const modeSelect = controls ? controls.querySelector(".day-map-mode") : null;
      const mode = modeSelect ? modeSelect.value : "driving";
      const params = new URLSearchParams({
        api: "1",
        destination: place,
        travelmode: mode
      });
      window.open(`https://www.google.com/maps/dir/?${params.toString()}`, "_blank", "noopener,noreferrer");
    }
    return;
  }

  const placeButton = event.target.closest("[data-map-place]");
  if (placeButton) {
    const place = decodeURIComponent(placeButton.dataset.mapPlace || "").trim();
    if (place) {
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
      window.open(mapUrl, "_blank", "noopener,noreferrer");
    }
    return;
  }

  const locationButton = event.target.closest("[data-map-day-location]");
  if (locationButton) {
    let places = [];
    try {
      places = JSON.parse(decodeURIComponent(locationButton.dataset.mapDayLocation || "[]"));
    } catch (error) {
      console.error("Map Location Data Error:", error);
    }
    places = Array.isArray(places) ? places.map(place => String(place).trim()).filter(Boolean) : [];
    if (!places.length) {
      statusEl.textContent = "今天沒有可開啟地圖的景點資料。";
      return;
    }
    const destination = places[places.length - 1];
    const waypoints = places.slice(0, -1).join("|");
    const controls = locationButton.closest(".day-map-controls");
    const modeSelect = controls ? controls.querySelector(".day-map-mode") : null;
    const travelmode = modeSelect && ["driving", "transit", "walking", "bicycling"].includes(modeSelect.value)
      ? modeSelect.value
      : "driving";

    if (!navigator.geolocation) {
      statusEl.textContent = "目前瀏覽器不支援定位，已改用一般地圖路線。";
      const params = new URLSearchParams({ api: "1", origin: places[0], destination, travelmode });
      if (waypoints) params.set("waypoints", waypoints);
      window.open(`https://www.google.com/maps/dir/?${params.toString()}`, "_blank", "noopener,noreferrer");
      return;
    }

    statusEl.textContent = "正在取得你目前的位置…";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = `${position.coords.latitude},${position.coords.longitude}`;
        const params = new URLSearchParams({ api: "1", origin, destination, travelmode });
        if (waypoints) params.set("waypoints", waypoints);
        window.open(`https://www.google.com/maps/dir/?${params.toString()}`, "_blank", "noopener,noreferrer");
        statusEl.textContent = "已用你目前的位置建立今日路線。";
      },
      () => {
        statusEl.textContent = "無法取得目前位置，已改用第一個景點作為起點。";
        const params = new URLSearchParams({ api: "1", origin: places[0], destination, travelmode });
        if (waypoints) params.set("waypoints", waypoints);
        window.open(`https://www.google.com/maps/dir/?${params.toString()}`, "_blank", "noopener,noreferrer");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
    return;
  }

  const button = event.target.closest("[data-map-day]");
  if (!button) return;

  let places = [];

  try {
    places = JSON.parse(decodeURIComponent(button.dataset.mapDay || "[]"));
  } catch (error) {
    console.error("Map Data Error:", error);
  }

  places = Array.isArray(places)
    ? places.map(place => String(place).trim()).filter(Boolean)
    : [];

  if (!places.length) {
    statusEl.textContent = "今天沒有可開啟地圖的景點資料。";
    return;
  }

  // 只有一個景點：直接開啟 Google 地圖搜尋。
  if (places.length === 1) {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(places[0])}`;
    window.open(mapUrl, "_blank", "noopener,noreferrer");
    return;
  }

  // 兩個以上景點：依照 AI 排定的順序建立 Google 地圖路線。
  // 第一個景點＝起點，最後一個景點＝終點，中間景點＝依序經過。
  const origin = places[0];
  const destination = places[places.length - 1];
  const waypoints = places.slice(1, -1).join("|");
  const controls = button.closest(".day-map-controls");
  const modeSelect = controls ? controls.querySelector(".day-map-mode") : null;
  const travelmode = modeSelect && ["driving", "transit", "walking", "bicycling"].includes(modeSelect.value)
    ? modeSelect.value
    : "driving";

  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode
  });

  if (waypoints) {
    params.set("waypoints", waypoints);
  }

  const mapUrl = `https://www.google.com/maps/dir/?${params.toString()}`;
  window.open(mapUrl, "_blank", "noopener,noreferrer");
});


/* ================================
   防止 HTML 注入
================================ */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(
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