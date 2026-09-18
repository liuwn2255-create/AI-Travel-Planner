export default {
  async fetch(request, env) {
    const headers = {
      "Content-Type": "application/json; charset=UTF-8",
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

    const url = new URL(request.url);

    if (url.pathname === "/api/weather" && request.method === "GET") {
      try {
        const destination = (url.searchParams.get("destination") || "").trim();
        const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 5, 1), 10);
        const date = url.searchParams.get("date") || "";
        if (!destination) return json({ error: "請提供旅遊目的地。" }, 400, headers);

        const aliases = {
          "台中": "Taichung", "台中市": "Taichung", "臺中": "Taichung", "臺中市": "Taichung",
          "台北": "Taipei", "台北市": "Taipei", "臺北": "Taipei", "臺北市": "Taipei",
          "新北": "New Taipei City", "新北市": "New Taipei City",
          "桃園": "Taoyuan", "桃園市": "Taoyuan",
          "台南": "Tainan", "台南市": "Tainan", "臺南": "Tainan", "臺南市": "Tainan",
          "高雄": "Kaohsiung", "高雄市": "Kaohsiung",
          "基隆": "Keelung", "基隆市": "Keelung",
          "新竹": "Hsinchu", "新竹市": "Hsinchu", "新竹縣": "Hsinchu County",
          "苗栗": "Miaoli", "苗栗縣": "Miaoli County",
          "彰化": "Changhua", "彰化縣": "Changhua County",
          "南投": "Nantou", "南投縣": "Nantou County",
          "雲林": "Yunlin", "雲林縣": "Yunlin County",
          "嘉義": "Chiayi", "嘉義市": "Chiayi", "嘉義縣": "Chiayi County",
          "屏東": "Pingtung", "屏東縣": "Pingtung County",
          "宜蘭": "Yilan", "宜蘭縣": "Yilan County",
          "花蓮": "Hualien", "花蓮縣": "Hualien County",
          "台東": "Taitung", "台東縣": "Taitung County", "臺東": "Taitung", "臺東縣": "Taitung County",
          "澎湖": "Penghu", "金門": "Kinmen", "連江": "Lienchiang County", "馬祖": "Matsu"
        };
        const geoName = aliases[destination] || destination;
        const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
        geoUrl.searchParams.set("name", geoName);
        geoUrl.searchParams.set("count", "1");
        geoUrl.searchParams.set("language", "en");
        geoUrl.searchParams.set("countryCode", "TW");
        geoUrl.searchParams.set("format", "json");
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        const place = geoData?.results?.[0];
        if (!place) return json({ error: `找不到「${destination}」的地理位置，請換一個目的地名稱。` }, 404, headers);

        const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
        weatherUrl.searchParams.set("latitude", place.latitude);
        weatherUrl.searchParams.set("longitude", place.longitude);
        weatherUrl.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset,relative_humidity_2m_mean");
        weatherUrl.searchParams.set("timezone", "auto");
        weatherUrl.searchParams.set("forecast_days", "16");
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();
        if (!weatherResponse.ok || !weatherData?.daily?.time) return json({ error: "天氣服務目前無法取得資料。" }, 502, headers);

        const times = weatherData.daily.time;
        let startIndex = date ? times.indexOf(date) : 0;
        if (startIndex < 0 && date) startIndex = times.findIndex(d => d >= date);
        if (startIndex < 0) return json({ error: "出發日期超出目前可查詢的預報範圍，請改查較近的日期。" }, 400, headers);

        const codes = weatherData.daily.weather_code || [];
        const descriptions = {
          0:"晴朗",1:"大致晴朗",2:"局部多雲",3:"多雲",45:"有霧",48:"霧凇",
          51:"小毛毛雨",53:"毛毛雨",55:"較強毛毛雨",61:"小雨",63:"中雨",65:"大雨",
          71:"小雪",73:"中雪",75:"大雪",77:"雪粒",80:"短暫陣雨",81:"陣雨",82:"強陣雨",
          85:"小陣雪",86:"強陣雪",95:"雷雨",96:"雷雨伴冰雹",99:"強雷雨伴冰雹"
        };
        const icon = code => code >= 95 ? "⛈️" : code >= 80 ? "🌦️" : code >= 61 ? "🌧️" : code >= 51 ? "🌦️" : code >= 45 ? "🌫️" : code >= 1 ? "⛅" : "☀️";
        const result = [];
        for (let i = startIndex; i < Math.min(startIndex + days, times.length); i++) {
          result.push({
            date: times[i],
            description: descriptions[codes[i]] || "天氣變化",
            icon: icon(codes[i] ?? 0),
            min: weatherData.daily.temperature_2m_min?.[i],
            max: weatherData.daily.temperature_2m_max?.[i],
            rain: weatherData.daily.precipitation_probability_max?.[i] ?? null,
            wind: weatherData.daily.wind_speed_10m_max?.[i] ?? null,
            sunrise: weatherData.daily.sunrise?.[i] || null,
            sunset: weatherData.daily.sunset?.[i] || null,
            humidity: weatherData.daily.relative_humidity_2m_mean?.[i] ?? null
          });
        }
        return json({ location: place.name || destination, days: result }, 200, headers);
      } catch (error) {
        return json({ error: error?.message || "天氣查詢發生錯誤。" }, 500, headers);
      }
    }

    if (url.pathname !== "/api/plan") return json({ error: "找不到 API 路徑。" }, 404, headers);
    if (request.method !== "POST") return json({ error: "只接受 POST 請求。" }, 405, headers);

    try {
      if (!env.OPENAI_API_KEY) return json({ error: "找不到 OPENAI_API_KEY。請確認 Cloudflare Worker Secret 已設定。" }, 500, headers);
      const body = await request.json();
      const destination = body.destination || "";
      const days = Number(body.days) || 3;
      const date = body.date || "";
      const people = body.people || "";
      const budget = body.budget || "";
      const pace = body.pace || "";
      const interest = body.interest || "";
      if (!destination) return json({ error: "請提供旅遊目的地。" }, 400, headers);

      const prompt = `你是一位專業的 AI 旅遊管家。\n請根據使用者提供的條件，規劃一份實用、合理、容易執行的旅遊行程。\n\n【旅遊條件】\n目的地：${destination}\n旅遊天數：${days} 天\n日期：${date || "未指定"}\n同行人數：${people || "未指定"}\n預算：${budget || "未指定"}\n旅行步調：${pace || "未指定"}\n興趣：${interest || "未指定"}\n\n【規劃要求】\n1. 使用繁體中文。\n2. 每一天安排合理，不要塞入過多景點。\n3. 每一天依照早上、下午、晚上安排時間。\n4. 景點之間要考慮實際交通與地理位置。\n5. 提供適合的交通方式。\n6. 提供早餐、午餐、晚餐或當地特色餐飲建議。\n7. 提供當日大約花費。\n8. 提供實用的旅遊提醒。\n9. 不要虛構已經確定的訂位、票券或即時營業狀態。\n10. 如果資訊不足，可以明確標示「建議確認」。\n11. 行程要適合一般旅客實際使用。\n請嚴格依照指定的 JSON 格式輸出，不要加入 Markdown，不要加入 JSON 以外的文字。`;

      const aiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: "gpt-5.6-luna", store: false, input: prompt, text: { format: { type: "json_schema", name: "travel_plan", strict: true, schema: {
          type:"object", additionalProperties:false,
          properties:{ title:{type:"string"}, overview:{type:"string"}, tags:{type:"array",items:{type:"string"}}, days:{type:"array",minItems:1,maxItems:10,items:{type:"object",additionalProperties:false,properties:{title:{type:"string"},summary:{type:"string"},activities:{type:"array",items:{type:"string"}},schedule:{type:"array",items:{type:"string"}},transport:{type:"array",items:{type:"string"}},meals:{type:"array",items:{type:"string"}},budget:{type:"string"},tips:{type:"array",items:{type:"string"}}},required:["title","summary","activities","schedule","transport","meals","budget","tips"]}}},
          required:["title","overview","tags","days"]
        }}}})
      });
      const aiData = await aiResponse.json();
      if (!aiResponse.ok) return json({ error: aiData?.error?.message || "OpenAI API 發生錯誤。" }, aiResponse.status, headers);
      let text = aiData.output_text || "";
      if (!text && Array.isArray(aiData.output)) for (const item of aiData.output) if (Array.isArray(item.content)) for (const content of item.content) if (typeof content.text === "string") text += content.text;
      if (!text) throw new Error("AI 沒有回傳可顯示的內容。");
      return new Response(text, { status: 200, headers });
    } catch (error) {
      return json({ error: error?.message || "伺服器發生錯誤。" }, 500, headers);
    }
  }
};

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}
