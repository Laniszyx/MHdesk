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
- `legacy-mhd.html`：最早的舊版原型，僅供參考。
