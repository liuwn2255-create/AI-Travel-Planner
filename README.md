# AI 旅遊管家 v2：AI 核心版

這一版完成：
- 原本的網站版面
- 旅行需求表單
- 真正的 AI API 呼叫架構
- AI 回傳 JSON 後自動變成每日行程卡片
- API Key 不放在 GitHub Pages 前端

## 重要
GitHub Pages 是靜態網站，不能安全地把 OPENAI_API_KEY 寫進前端。
本專案使用 Cloudflare Worker 當安全後端。

## 部署步驟（第一次做）
1. 建立 Cloudflare Worker。
2. 把 `worker/worker.js` 貼進 Worker。
3. 在 Worker 的 Secrets / Environment Variables 加：
   `OPENAI_API_KEY` = 你的 OpenAI API Key
4. 建議再設定：
   `ALLOWED_ORIGIN` = 你的 GitHub Pages 網址，例如 `https://你的帳號.github.io`
5. 部署 Worker，取得 Worker 網址。
6. 打開 `js/app.js`，把：
   `https://YOUR-WORKER-DOMAIN.workers.dev/api/plan`
   換成你的 Worker API 網址。
7. 把整個網站上傳 GitHub Pages。

## 注意
API Key 絕對不要放進 `index.html`、`app.js` 或公開 GitHub repository。

## 下一階段
先測試「真正 AI 產生行程」成功後，再一次加入：
- 行程重新生成 / 修改
- 地圖
- 天氣
- 交通
- 預算


## 已完成連線
本版本已經把你的 Cloudflare Worker 網址設定完成：
https://weathered-dew-b2c0.liuwn2255.workers.dev/api/plan

因此你不需要自己修改 `js/app.js` 的 API_URL。
