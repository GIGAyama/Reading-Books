# 使い方マニュアル — 画面写真の撮り方

`manual.md` が本文、`images/` が画面写真（44 枚）です。
本文の書式は `.claude/skills/giga-manual/`、撮影は `note-article` スキルの
`capture.mjs` を使いました。ポータル（giga-school.com）が毎朝 `manual.md` を
取ってきて `/apps/reading-books/manual/` に組み直します。

## 撮り方

```bash
npm i --no-save playwright
node -e "import('./tests/server.mjs').then(m=>m.startServer(process.cwd(),4180))"
node <skill>/scripts/capture.mjs shots.mjs --base http://127.0.0.1:4180/ --out shots
```

- 390×844 の端末を 2 倍の細かさで撮り、256 色に落として 1 枚 150KB 未満に
  してあります（`npm run check` の F3 の上限）
- 記録は「じぶんで かいて きろくする」と同じ形で 43 冊を先に入れてから撮りました。
  題名は実在する絵本ですが、ページ数とねだんは見た目をそろえるための値で、
  奥付とは合いません
- 押す場所の赤い枠は、撮影時に測った要素の位置から描き足しています。
  画面の中の文字はなぞっていません

## 実機と違うところ（撮り直すときに知っておくこと）

- `10-scan.png` … 撮影機にカメラが無いので、ブラウザの検査用の映像
  （1280×720 に描いた ねだんのバーコード 192…）を写しています。
  わく・案内の文・「ねだんのバーコードだよ」の吹き出しは本物の動作です
- `11-entry-found.png` … 撮影環境から書誌サービス（openBD 等）に出られないため、
  openBD の返事だけを「ぐりとぐら」の形で差し替えて「みつけた！」を出しました。
  画面の組み立ては本物ですが、著者名の表記は差し替えた返事のままです
- `03-install-menu.png` … 「アプリとして インストール」の行は、ブラウザが
  合図（beforeinstallprompt）を出したときだけ出ます。撮影では行を表示させて
  撮っています
- `44-update-bar.png` … 配信中の `sw.js` を書き替えて再読み込みし、本物の
  更新のお知らせを出して撮りました
- 「よめました！」（読めた瞬間の 0.3 秒の表示）は撮れていません
