# GIGA Standard v4 ロールアウト記録

## 進捗

| リポジトリ | 型 | P0 | P1（表示/PWA） | P2 | P3 | ゲート | 備考 |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| Reading-Books | A | ✅ | ✅ | ✅ | ✅ | ✅ | **オフラインで起動しない不具合を発見・修正**（下記） |

## このリポジトリでやったこと

| フェーズ | コミット | 内容 |
|---|---|---|
| 監査 | `aab52b8` | `AUDIT.md`（A〜G の実測） |
| P0 | `aab52b8` | LICENSE / .gitignore / dependabot.yml |
| P1 | `516fb15` | オフライン起動の修正・CSP・フォント自己ホスト・印刷・PWA一式・a11y |
| P2 | `0ef82c1` | 512px アイコン2枚の圧縮（91KB→23KB / 75KB→22KB） |
| P3 | `6283d66` | MANUAL.md 作成・README に不足節を追記 |
| P4 | `35a3368` | `scripts/check-project.mjs` + `quality.config.json` + CI |

## ほかのリポジトリへ持っていくべき知見

### 1. 【最優先】Cache API に入れる前に Content-Encoding を落とす

**同じ構成のリポジトリは、ほぼ確実に同じ不具合を持っています。**

サーバー（GitHub Pages を含む）は HTML や JS を gzip / brotli で縮めて返します。
`fetch` は中身をもどしてから渡してくれますが、「縮めてあります」という
`Content-Encoding` ヘッダーだけが Response に残ります。
これを `cache.add()` や `cache.put(req, res.clone())` でそのまま保存し、
圏外のときにページとして返すと、ブラウザはヘッダーを信じてもう一度ほどこうとして
失敗し、**真っ白なエラー画面**になります。

「PWA にしてあるのにオフラインで起動しない」なら、まずこれを疑ってください。

確かめかた（実機・Chromium）：

```sh
npx serve . -p 8000          # リポジトリ名のディレクトリの下で配信する
# ブラウザで開いて Service Worker が有効になるのを待ってから、
# サーバーのプロセスを本当に kill して、再読み込みする
```

直しかた … `sw.js` の `stripEncodingHeaders()` をそのまま移植する。

### 2. ページ遷移のハンドラで preloadResponse をそのまま返さない

navigation preload を有効にしていると、圏外では
`event.preloadResponse` が「失敗した返事」を返すことがあります。
`if (preload)` の truthy 判定だけで返してしまうと、それが真っ白の原因になります。
`preload.ok` まで見てください。

### 3. beforeinstallprompt は `<head>` の最上部の外部ファイルで受ける

このリポジトリでは 2,742行目の `<script>` で待っていました。
Chrome はページの ごく早い段階で 1回だけ合図を出すため、
通信のおそい端末では取りこぼし、「インストール」ボタンが出ませんでした。
`js/pwa-early.js` をそのまま移植できます。

### 4. 日本語 Web フォントの自己ホストは「分割された woff2 をそのまま持ってくる」

Google Fonts の日本語フォントは `unicode-range` で 120本前後に分割されており、
**画面に出た文字のぶんだけ**ダウンロードされます。
これをそのまま `fonts/` に持ってくると、

- 全体は数MBになるが、**初回に落ちるのは数十KBのまま**
- サブセット化しないので、児童が入力した文字や本の題名が豆腐にならない
- 学校のネットワークで外部ドメインが遮断されても字体が変わらない

先読み（precache）の対象には**入れないでください**。
校内Wi-Fi で 40人ぶんが一斉に流れます。

実際に使っている太さだけを配ること（このアプリは 700 と 900 だけ。500 は未使用でした）。

### 5. タップ領域は「見た目を変えずに `::after` で広げる」

`min-height: 44px` を直接あてるとデザインが崩れます。
見た目の大きさはそのままに、透明な `::after` で押せる範囲だけ広げると
規約を満たしつつ配色・寸法を変えずに済みます。

```css
.btn-sm{position:relative}
.btn-sm::after{
  content:"";position:absolute;left:50%;top:50%;
  width:max(100%, 44px);height:44px;transform:translate(-50%,-50%);
}
```

### 6. 品質ゲートは「自分自身」と「vendor」を中身の検査から外す

検査スクリプトは禁止パターンの正規表現を持っているので、自分にひっかかります。
また「`localStorage.clear()` は つかわない」という**注意書きのコメント**を
違反として数えてしまうので、コメントを除いてから判定してください。

## 次に回すときの順番

推奨順（GIGA Standard v4 Part III より）のうち、
**第2群（学習ログ系）は上の1〜4がそのまま効きます。**
とくに 1（Content-Encoding）は、PWA 化してあるすべてのリポジトリで確認してください。

## 作業開始前に人間が決めること（未決）

- `School_plan_note` と `SchoolPlan_Editor` のどちらを正本にするか
- `online-manuscript-paper` / `-lite` / `-pro` / `Online-Publisher-pro` の4系統の整理方針
- `studyLog.js` の正本をどのリポジトリに置くか
  （このリポジトリのものはロジック版 1.1。書きかえていません）
