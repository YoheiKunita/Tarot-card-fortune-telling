# タロット（三枚引き／本日の運勢）ドキュメント

## 概要
Electron で動作するタロット簡易アプリです。
- モード: 三枚引き（スリーカード）、本日の運勢（ワンオラクル）
- 画像: `img/` 配下の PNG を使用。無い場合は透明 PNG を表示。

## セットアップ／起動
- 依存関係インストール: `npm install`
- 起動: `npm start`

## 主な構成
- `main.js`（アプリメニュー／ウィンドウ）
- `preload.js`（IPC ブリッジ）
- `src/index.html`（ステージ／デッキ／スロット）
- `src/styles.css`（レイアウト・アニメ・背景・CSS変数）
- `src/renderer.js`（エントリ、モード切替）
- `src/modes/`（`shared.js` / `three-card.js` / `one-oracle.js`）
- `src/tarot-data.js`（カード定義）
- 画像: `img/back.png`（背面）, `img/background.png`（背景）, 各カード画像

## 画像とフォールバック
- カード画像: `img/<カード>.png`（無い場合は透明 PNG を表示）
- 背景画像: `img/background.png`（無い場合は単色背景）
- カード・背景とも `object-fit: cover` で自動リサイズ

## 更新履歴
- 2025-09-15: 変更要約を `doc/2025-09-15.md` に追加（アニメ安定化、70%速度、モジュール化、メニュー切替、「本日の運勢」、背景対応、説明文調整）。

