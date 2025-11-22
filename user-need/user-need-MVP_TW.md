# 🎵 AI Learning Song Creator — MVP 產品規格書

---

# 1. 使用者需求（User Needs）

本產品的核心族群包括學生、教師與自學者，主要目標是協助他們將知識內容轉換成容易記憶且有趣的歌曲。

## 使用者主要需求

1. **將學習內容變成容易記住的歌曲**：使用者貼上教材內容（文字），系統會自動將內容轉換為適合歌唱、易記的歌詞，並進一步生成歌曲。
2. **能在短時間內獲得可播放的學習歌曲**：過程簡單，不需要懂音樂。
3. **可編輯歌詞**：生成後仍可手動調整詞句。
4. **能播放、下載歌曲**：直接聽、分享、保存。
5. 歌曲風格自訂（MVP版本 先給幾種預設值供選擇）

## MVP 階段不需要

- 會員註冊/登入（使用 Firebase，可用匿名登入）
- 上傳 PDF、DOCX（未來版本）
- 多語言歌曲（未來版本）



---

# 2. 頁面規劃與頁面功能（UI & UX Flow）

MVP 僅需三個頁面。

---

# 3. 使用技術（Tech Stack）

## 前端（Frontend）

- **React + TypeScript**：作為主要前端框架
- **Zustand**：前端狀態管理（比 Redux 更輕量、簡單）
- **react-query**：統一管理 API 請求、快取、loading/error 狀態
- **Vite**：前端建置工具，不需要 SWC
- **TailwindCSS + shadcn/ui**：UI Framework

## 後端（Backend）

- **Python + FastAPI**：作為主要後端框架
  - FastAPI + Pydantic
    - 自動生成 API docs（/docs）
    - 清晰的 schema 驗證
    - 適合 REST API 結構

## Firebase（適合 MVP 的後端雲服務）

- **Firestore**：儲存內容、summary、歌詞、生成紀錄
- **Firebase Storage**：存放音檔（若不想依賴 Suno 的 URL）
- **Firebase Hosting**：部署 React 前端
- **Firebase Functions（未來版）**：可作為後端邏輯的一部分

## 多步驟處理（AI Pipeline）

使用 **LangGraph / LangChain** 建立可視化流程：

```
clean_text(content)
summarize(content)
convert_to_lyrics(summary)
send_to_suno(lyrics)
```

## 音樂生成（Music Generation）

- **Suno API**（主要功能）：
  - 生成歌詞（可選）
  - 依歌詞生成歌曲
  - 回傳音檔 URL、任務狀態等

---

---

## **頁面 A：首頁 / 文本輸入頁**

**目的：輸入教材內容 → 送出 → 系統生成歌詞**

### 功能

- 文本輸入框（貼上教材）
- 「**生成歌詞**」按鈕
- Loading 狀態顯示

### 背後流程

1. 前端將輸入文字送往 Python 後端API
2. 後端使用 Langraph 整理、摘要、壓縮
3. 後端呼叫 LLM 生成歌詞
4. 回傳歌詞給前端

---

## **頁面 B：歌詞編輯頁**

**目的：顯示 AI 產生的歌詞，讓使用者可自由修改**

### 功能

- 歌詞顯示區
- 可編輯文字欄位
- 「生成歌曲」按鈕
- 風格選擇（MVP 可固定或提供 8 種簡易選擇）

### 背後流程

1. 前端將歌詞送往後端 API
2. 後端動態呼叫 Suno API 建立歌曲生成任務
3. 回傳歌曲任務 ID
4. 前端開始輪詢或等待歌曲完成

---

## **頁面 C：歌曲播放頁**

**目的：播放 Suno 回傳的音樂**

### 功能

- 音樂播放器（播放、暫停、下載）
- 歌詞同步顯示（隨播放滾動）
- 「重新生成歌曲」按鈕（optional）

### 背後流程

1. 前端請求後端取得 Suno 音樂 URL
2. 播放器載入 URL

---

# 3. 使用技術架構（Tech Stack）

依你的要求設計：React Typescript 前端 + Python 後端 + Firebase 基礎架構。

---

## **前端（React + Typescript）**

- React + Vite
- TailwindCSS / shadcn UI
- Axios（呼叫後端 API）
- HTML5 Audio 或 Wavesurfer.js
- Oxlint(平時), ESlint(最終檢測測)
- Jest

---

## **後端（Python）**

- FastAPI（輕量、快速、非常適合 MVP）
  - Firestore（歌曲紀錄、歌詞紀錄）
  - Firebase Storage（儲存歌曲）

---

## **AI 技術（Content → Song Lyrics）**

- **Clean Text** → 去除格式、標籤
- **Summarize** → 萃取重點
- **Lyricify** → 用押韻、節奏的寫法重新編寫

---

## **音樂生成技術（Suno API）**

### 必用 API

1. **Generate Music API**（主 API）

   - 輸入：歌詞（text）、風格（可預設）、title
   - 回傳：task ID

2. **Get Music Task Status API**

   - 用 task ID 查詢音樂生成進度

3. **Get Generated Audio URL**（任務完成後）

   - 回傳 mp3 音樂檔 URL



---

## **DevOps / Hosting**

- Firebase Hosting (前端)
- &#x20;Firebase Functions(後端)

---

# 4. 未來可開發功能（Non-MVP Feature List）

這些是未來可加入、但目前不會開發的功能。

## A. 更多檔案來源

- 上傳 PDF、DOCX、自動擷取文字
- URL 抓取教材

## B. 風格擴充

- 使用者自訂歌曲長度、節奏、語言

## C. 歌詞進階編輯

- 自動押韻建議
- 自動簡化詞句
- 自動添加副歌/Bridge

## D. 課程歌曲管理

- 我的歌曲列表
- 教師分享歌曲給學生

## E. 完整會員系統

- Google/Email 登入
- 個人檔案、歷史紀錄

## F. AI 解說模式

- 使用Nano banana Pro 生成關於歌曲內容的解說Slides
- 生成一段唱歌的影片與音樂做結合

---

# ✔️ 本文件狀態

此為 **完整 MVP 規格書**：

- 僅包含必要流程
- 前端 React + TS
- 後端 Python
- 使用 Firebase 作為部署與儲存
- 使用 langraph 處理文本 → 歌詞
- 使用 Suno API 生成歌曲

如果你需要：

- API 介面格式（request/response）
- ERD + 系統架構圖
- UI Wireframe 草圖
- 實際代碼範例 我可以下一步協助你補上。

