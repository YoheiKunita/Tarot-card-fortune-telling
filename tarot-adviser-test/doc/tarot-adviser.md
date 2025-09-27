# tarot-adviser モジュール説明

本モジュールは、タロット占いの「質問」「引いたカード（位置含む）」「スプレッド情報」から、LLM（大規模言語モデル）用プロンプトを生成し、モデル出力（JSON）を検証して読み物（Reading）として返すユースケースを提供します。ネットワーク不要のスタブ LLM クライアントが付属しており、ローカルで動作・テスト可能です。

## 構成（レイヤ）
- Domain（純ロジック）
  - 概念: `Card`, `Spread`, `Reading`（いずれもプレーンオブジェクト）
- PromptBuilder（入力→プロンプト）
  - 質問とカード、スプレッドを中間構造に整形し、JSON スキーマのヒントとともに LLM へ渡すプロンプト文字列を生成
- LLMClient（外部サービス抽象）
  - `StubLLMClient` を同梱（ネットワーク不要）。後日 `openai` 実装に差し替え可能な構造
  - リトライ/レート制御等は必要に応じて拡張
- Parser/Validator（出力検証）
  - 返却テキストを JSON パースし、簡易スキーマ検証
  - 不正時はフォールバックで安全な `Reading` を生成
- UseCase/Application（ユースケース）
  - `GenerateReadingUseCase` が主役。キャッシュ（同一入力の再利用）と簡易ログ（所要時間・概算トークン）を付与

## ディレクトリ / ファイル
- `lib/tarot-adviser/`
  - `index.js` エクスポート集約
  - `domain.js` ドメイン型定義（JSDoc）
  - `promptBuilder.js` プロンプト生成
  - `llmClient.js` LLM 抽象＋スタブ実装
  - `parser.js` 出力パースと検証・フォールバック
  - `usecase.js` `GenerateReadingUseCase` 実装
- `doc/tarot-adviser-test/`
  - 実行可能なサンプル／テストスクリプト一式（スタブで動作）

## 出力スキーマ（概略）
```json
{
  "summary": "string",
  "cards": [
    {
      "cardName": "string",
      "position": "upright" | "reversed",
      "meaning": "string",
      "advice": "string (optional)"
    }
  ]
}
```

## 使い方（CommonJS）
```js
const { createClient, GenerateReadingUseCase } = require("./lib/tarot-adviser");

async function main() {
  const llm = createClient("stub", { mode: "valid" }); // ネット不要
  const usecase = new GenerateReadingUseCase({ llmClient: llm });

  const question = "転職活動は今進めるべきですか？";
  const cards = [
    { name: "The Fool", position: "upright", slot: "present" },
    { name: "The Hermit", position: "reversed", slot: "challenge" },
    { name: "The Sun", position: "upright", slot: "outcome" },
  ];
  const spread = { name: "Three Card", slots: ["present", "challenge", "outcome"] };

  const res = await usecase.execute({ question, cards, spread, userId: "demo-user" });
  console.log(res.reading.summary);
}

main();
```

### 返り値
- `reading`: 上記スキーマの `Reading` オブジェクト
- `valid`: モデル出力がスキーマ準拠か（`true/false`）
- `meta`: 監査用メタデータ
  - `inferenceId`: 実行 ID
  - `userId`: 呼出元ユーザ ID（任意）
  - `durationMs`: 実行時間（ms）
  - `approxTokens`: 概算トークン数（簡易見積）
  - `cached`: キャッシュヒット有無
  - `reason`: 非準拠時の理由（`non_json` / `schema_mismatch` など）

## エラーハンドリング / フォールバック
- モデル出力が JSON でない、またはスキーマ不一致の場合でも、入力カードと質問を元に簡易なフォールバック `Reading` を返します（`valid=false`）。

## テストの実行
- コマンドプロンプトでリポジトリ直下から：
  - まとめて実行: `doc\tarot-adviser-test\run-all.cmd`
  - 個別: `node doc\tarot-adviser-test\run-sample.js` など
- すべてスタブ LLM を使用するためネットワーク不要です。

## 実装差し替え（将来）
- `llmClient.js` の `createClient("openai")` 実装を追加すれば、同じユースケースで実運用モデルに接続可能です。

