// AI 旅遊管家 Cloudflare Worker
// 只需要在 Cloudflare Worker 設定 OPENAI_API_KEY
// 可選：ALLOWED_ORIGIN = 你的 GitHub Pages 網址

const corsHeaders = (origin, env) => ({
  "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || origin || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
});

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "只接受 POST 請求。" }),
        { status: 405, headers }
      );
    }

    try {
      if (!env.OPENAI_API_KEY) {
        return new Response(
          JSON.stringify({ error: "Cloudflare 尚未設定 OPENAI_API_KEY。" }),
          { status: 500, headers }
        );
      }

      const body = await request.json();

      const days = Math.max(1, Math.min(10, Number(body.days) || 5));
      const destination = String(body.destination || "").trim();

      if (!destination) {
        return new Response(
          JSON.stringify({ error: "缺少目的地。" }),
          { status: 400, headers }
        );
      }

      const prompt = `
你是一位專業、務實、友善的旅遊規劃師。
請依照以下旅行條件，規劃 ${days} 天行程。

目的地：${destination}
出發日期：${body.date || "未指定"}
同行人數：${body.people || "未指定"}
預算：${body.budget || "未指定"}
旅行步調：${body.pace || "未指定"}
旅行興趣：${body.interest || "未指定"}

規則：
1. 行程要符合旅行步調，不要為了塞景點而過度密集。
2. 每天提供 3～5 個主要活動。
3. 不要捏造已確認的票價、營業時間或即時交通資訊。
4. 如果沒有即時資料，使用「建議查詢」等說法。
5. 使用繁體中文。
6. 回傳網站可以直接使用的 JSON。
`;

      const aiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          store: false,
          input: prompt,
          text: {
            format: {
              type: "json_schema",
              name: "travel_plan",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  overview: { type: "string" },
                  tags: {
                    type: "array",
                    items: { type: "string" }
                  },
                  days: {
                    type: "array",
                    minItems: 1,
                    maxItems: 10,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        title: { type: "string" },
                        summary: { type: "string" },
                        activities: {
                          type: "array",
                          items: { type: "string" }
                        }
                      },
                      required: ["title", "summary", "activities"]
                    }
                  }
                },
                required: ["title", "overview", "tags", "days"]
              }
            }
          }
        })
      });

      const aiData = await aiResponse.json();

      if (!aiResponse.ok) {
        const message =
          aiData?.error?.message ||
          aiData?.message ||
          "OpenAI API 錯誤";
        return new Response(
          JSON.stringify({ error: message }),
          { status: aiResponse.status || 500, headers }
        );
      }

      // Responses API 的原始 HTTP JSON 可能沒有 SDK 的 output_text 便利欄位。
      // 因此直接從 output 陣列取出模型產生的文字。
      let text = "";

      if (typeof aiData?.output_text === "string") {
        text = aiData.output_text;
      }

      if (!text && Array.isArray(aiData?.output)) {
        for (const item of aiData.output) {
          if (Array.isArray(item?.content)) {
            for (const content of item.content) {
              if (typeof content?.text === "string") {
                text += content.text;
              }
            }
          }
        }
      }

      if (!text) {
        throw new Error("AI 已回應，但找不到可顯示的文字內容。");
      }

      // 確認回傳的是合法 JSON，再交給前端。
      const parsed = JSON.parse(text);

      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers
      });

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error?.message || "伺服器發生錯誤。"
        }),
        { status: 500, headers }
      );
    }
  }
};
