# AdviserService 設計意向（ドラフト）

本書は、既存の adviser モジュール設計（`createClient`, `GenerateReadingUseCase`）を踏まえ、UI から一貫した契約で呼べる「安定 API」を提供する `AdviserService` の設計方針をまとめます。目的は「UI に例外を漏らさない」「環境差（Electron/ブラウザ）に左右されない」「テスト容易性の高い」中心コンポーネントの確立です。

## 目的と原則
- UI からは常に同一の非同期関数 `generate()` を呼ぶだけで結果が得られる。
- 失敗時も `Promise` を reject せず、必ず resolve（`valid:false` を返す）する契約。
- バックエンド（OpenAI/スタブ）の切替・リトライ・フォールバックはサービス内部で完結。
- 依存注入（DI）により LLM クライアントを差し替え可能。ユニットテストが容易。
- i18n（日本語/英語）を意識した出力制御（`locale` オプション）。

## 公開 API（安定契約）
```ts
type AdviserServiceOptions = {
  backend?: 'auto' | 'openai' | 'stub';     // 既定: 'auto'（apiKey の有無で切替）
  apiKey?: string;                          // OpenAI 利用時のみ
  model?: string;                           // 例: 'gpt-4o-mini'
  timeoutMs?: number;                       // 既定: 20_000ms
  retry?: { max: number; baseMs: number; factor: number; jitter?: boolean }; // 既定: {max:2, baseMs:500, factor:2}
  locale?: 'ja' | 'en';                     // 既定: 'ja'
  logger?: { debug(...a:any[]):void; info(...a:any[]):void; warn(...a:any[]):void; error(...a:any[]):void };
  // 依存注入（省略時は内部デフォルトを使用）
  llmFactory?: (kind: 'openai'|'stub', opts: any) => LLMClient;
  now?: () => number;                       // 時刻供給（テスト用）
  uuid?: () => string;                      // 推論ID生成（テスト用）
  cache?: { get(key:string):any|undefined; set(key:string, v:any, ttlMs?:number):void } | null; // 既定: null
};

type GenerateInput = {
  question?: string;
  cards: Array<{ name: string; position?: 'upright'|'reversed'; slot?: string }>;
  spread?: { name?: string; slots?: string[] } | null;
  userId?: string | null;
  locale?: 'ja'|'en';        // 呼出し単位で上書き可能
  apiKey?: string;           // 呼出し単位の一時キー（任意）
  model?: string;            // 呼出し単位で上書き可能
};

type GenerateResult = {
  valid: boolean;                         // true: 読み取り成功（実orスタブ）
  reading?: { summary: string; cards: Array<{ cardName: string; position: string; meaning?: string; advice?: string }> };
  error?: { code: string; message: string; retryable?: boolean };
  meta: { inferenceId: string; backend: 'openai'|'stub'; durationMs: number; approxTokens?: number; cached: boolean; reason?: string|null };
};

class AdviserService {
  constructor(opts?: AdviserServiceOptions)
  async generate(input: GenerateInput): Promise<GenerateResult>
}
```

## 入力正規化・バリデーション
- `question`: 文字列化（最大長の安全ガード、例: 2,000 文字）。
- `cards`: 必須。`name` は必須、`position` は既定 `'upright'`、`slot` は任意。空配列は `valid:false` として扱うが、スタブは返せるようにする。
- `spread`: 任意。`{name, slots}` の形に正規化。
- `locale`: 既定 `'ja'`。
- `apiKey`/`model`: 呼出し時の上書き値を優先し、サービス既定へフォールバック。

## 失敗時の方針（絶対に reject しない）
- どの経路でも例外は catch し、`{ valid:false, error, meta }` で返す。
- OpenAI 側で失敗した場合：
  - `retry` ポリシーで一定回数再試行。
  - 全滅時は「スタブでの簡易サマリ」に自動フォールバック（ユーザー体験を止めない）。
  - UI に通知するのは `result.valid` と `meta.reason` 程度（アラートは原則不要）。

## バックエンド切替と DI
- `backend: 'auto'` のとき：`apiKey` が有効なら `openai`、無ければ `stub`。
- 既存モジュール互換：
  - `llmFactory` 省略時、内部で `createClient(kind, opts)` に相当するファクトリを使用。
  - 既存の `GenerateReadingUseCase` がある場合はアダプタ層を用意：
    - `usecase.execute({ question, cards, spread, userId })` を内部で呼び、結果を `GenerateResult` に整形。

## リトライ・タイムアウト
- タイムアウト：`timeoutMs` で `Promise.race()`。タイムアウトは `code: 'TIMEOUT'`。
- リトライ：指数バックオフ（`baseMs`, `factor`）。429/5xx 相当のみ再試行。`jitter` で ±20% 揺らし。

## キャッシュ・単一フライト
- 任意で `cache` を注入可能（デフォルト無効）。キーは `hash(question,cards,spread,model,locale)`。
- 単一フライト（同一キーでの同時呼出し合流）を簡易実装（メモリ内 `Map`）。

## ロギング / メトリクス
- `logger`（`debug/info/warn/error`）を注入可能。PII を含まない粒度でログ化。
- `meta` に `durationMs`, `backend`, `cached`, `reason` を格納。障害解析と UI 表示に活用。

## i18n 方針
- `locale: 'ja'|'en'`。プロンプトやスタブ出力の言語を切替。
- 既定は日本語（`'ja'`）。

## セキュリティ
- API Key は `AdviserService` に渡すのみ（永続化は UI 側の責務）。
- ログに Key を出さない。エラーもメッセージ整形して漏洩防止。

## 既存モジュールとの接続（preload / ブラウザ）
- Electron（preload）
  - `preload.js` 内で `const service = new AdviserService({ backend:'auto', apiKey, model, ... })`。
  - `contextBridge.exposeInMainWorld('adviser', { generate: (input) => service.generate(input) })`。
- ブラウザ直実行
  - `index.html` のインライン・スタブを `AdviserService` ベースの簡易版に置換可能（同一契約）。

## 返却モデル（例）
```json
{
  "valid": true,
  "reading": {
    "summary": "いまの状況を俯瞰し、小さな一歩から始めましょう。",
    "cards": [
      { "cardName": "The Fool", "position": "upright", "meaning": "新しい旅立ち", "advice": "好奇心を大切に" }
    ]
  },
  "meta": { "inferenceId": "abc-123", "backend": "openai", "durationMs": 842, "cached": false }
}
```

失敗＋自動フォールバック（スタブ）例：
```json
{
  "valid": true,
  "reading": {
    "summary": "フォールバック生成: まずはできる範囲の実行から。",
    "cards": [ { "cardName": "The Tower", "position": "reversed" } ]
  },
  "meta": { "inferenceId": "stub-456", "backend": "stub", "durationMs": 5, "cached": false, "reason": "OPENAI_ERROR" }
}
```

完全失敗（入力不足など）例：
```json
{
  "valid": false,
  "error": { "code": "NO_CARDS", "message": "カードが選択されていません" },
  "meta": { "inferenceId": "n/a", "backend": "stub", "durationMs": 1, "cached": false }
}
```

## 擬似コード（骨子）
```js
class AdviserService {
  constructor(opts = {}) { /* オプション統合・依存準備 */ }

  async generate(input) {
    const started = this.now();
    const inferenceId = this.uuid();
    const normalized = normalizeInput(input, this.defaults);
    if (normalized.cards.length === 0) return invalid('NO_CARDS');

    const key = this.cacheKey(normalized);
    const inflight = this.joinInFlight(key);
    if (inflight) return inflight;

    const p = this._generateCore(normalized, inferenceId, started);
    this.setInFlight(key, p);
    const res = await p.finally(() => this.clearInFlight(key));
    return res;
  }

  async _generateCore(n, inferenceId, started) {
    const backend = this.pickBackend(n);
    const llm = this.llmFactory(backend, this.clientOpts(backend, n));
    const run = () => this.usecase(llm).execute({ question:n.question, cards:n.cards, spread:n.spread, userId:n.userId });
    const withTimeout = timeout(this.timeoutMs, run);
    try {
      const res = await retry(withTimeout, this.retryPolicy, isRetryableError);
      return ok(mapUsecaseResult(res), meta(inferenceId, backend, started));
    } catch (e) {
      this.logger?.warn('[adviser] openai error, fallback:', safeMsg(e));
      const fb = stubResult(n);
      return ok(fb, meta(inferenceId, 'stub', started, 'OPENAI_ERROR'));
    }
  }
}
```

## テスト観点
- 入力正規化（`cards` 必須、`position` 既定、長文 `question` 切詰め）。
- 失敗時も `resolve`（reject しない）を確認。
- リトライ回数・タイムアウト動作の検証（モック時計/LLM）。
- キャッシュ命中・単一フライトの重複抑止。
- ロケール別の出力言語（スタブ含む）。
- OpenAI 経路 → スタブへの自動フォールバック時の `meta.reason` セット。

## 段階的導入案
1) `AdviserService` を追加し、preload で `window.adviser.generate` に接続。
2) 既存のブラウザ向けスタブも同じ契約に合わせる。
3) UI（renderer）は契約どおり結果を描画するだけに単純化。
4) ユニットテスト追加、ログ計測で安定性を可視化。

