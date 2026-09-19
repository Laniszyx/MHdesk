# 開發用工具

遊戲本身用 ES module 撰寫，瀏覽器不能用 `file://` 直接開，要透過本機伺服器：

```
python -m http.server 8765
```

然後開啟：

| 網址 | 用途 |
|---|---|
| `http://localhost:8765/` | 遊戲本體 |
| `http://localhost:8765/dev/test.html` | 引擎規則測試，左側顯示 PASS / FAIL |
| `http://localhost:8765/dev/sim.html?n=20&w=gs` | 平衡模擬：用簡單 AI 跑所有劇情任務，列出勝率與平均回合 |
| `http://localhost:8765/#quick` | 直接開一場雙人自由對戰 |
| `http://localhost:8765/#quick1` | 直接開一場單人自由對戰 |
| `http://localhost:8765/#story` | 直接進劇情模式 |

`sim.html` 的 `w` 可填 `gs,sns,lance,hammer,ls`（大劍、片手劍、長槍、大錘、太刀），不填則五種都跑。

## 檔案結構

- `js/data/`：魔物、武器、卡牌、素材、任務、工房配方。調整數值只要改這裡。
- `js/engine/`：六角格數學與戰鬥規則，不碰畫面。
- `js/ui/`：各畫面。`battle-view.js` 畫戰鬥，`story.js` 是劇情模式，`tutorial.js` 是新手教學腳本。
- `js/save.js`：localStorage 存檔（狩獵紀錄沿用舊版的 `mhdesk_save_v1`）。
- `js/icons.js`：SVG 圖示。`icon('名稱')` 是單色版，大小與顏色跟著文字，用在行內文字與小按鈕；`micon('名稱')` 是仿魔物圖示的雙色圖騰版，要放在白色方塊（`.tile`、`.card-ic`、`.mat-ico`）裡。遊戲物件用 game-icons.net（CC BY 3.0），介面操作用 Lucide（ISC）。每個圖示的配色在 `dev/build-icons.py` 的 `TONE` 表。
- `js/icon-data.js`：圖示資料，由 `python dev/build-icons.py` 產生（需要網路），要加圖示就改那支腳本再重跑。

## 介面規範

- 不用 emoji，一律用 `icon()`／`micon()`。
- 視覺主題在 `css/tapestry.css`（織錦：布紋底、金線圖騰框、鋸齒分隔線），只覆蓋顏色與材質；版面規則在 `style.css`。改主題色請改 `tapestry.css` 的 `:root`。
- 色調：暗色皮革底（`--bg`、`--panel`）配青銅框（`--line2`）與金色強調（`--amber`），文字米白；Tailwind 的灰階與強調色都在 `style.css` 末段改成暖色，新加的顏色也請走同一套。
- 按鈕：`btn` 加上 `btn-primary`（主要）、`btn-secondary`（次要）、`btn-danger`（危險）、`btn-danger-soft`（次要危險）、`btn-link`（文字連結）；尺寸 `btn-lg`（頁面底部）、`btn-sm`（清單內）、`btn-icon`（標題列圖示鈕）、`btn-sq`（加減鈕）。
- 頁面標題用 `page({title, icon})`，頁內小標用 `<div class="sec">`，選單項目用 `menuBtn()`。
- `legacy-mhd.html`：最早的舊版原型，僅供參考。
