# フェーズα仕様: 検索導線とプリセット機能

最終更新: 2025-10-19 21:20 (JST)
作成者: Cascade (AIアシスタント)
関連ドキュメント: `choices-driven-development.md`, `docs/ISSUES.md`, `AI_CONTEXT.md`, `docs/TESTING.md`

---

## 1. 概要
- 目的: URL貼付のみの動画追加手段を拡張し、検索・レコメンド・プリセット読込を提供する。
- 対象バージョン: フェーズα（2025Q4目標）。
- スコープ: フロントエンドWebアプリ (`index.html`, `scripts/main.js`, `styles/main.css`) に対する追加機能。

## 2. 背景
- 現状: `scripts/main.js` はURL解析→動画追加のみ対応し、YouTube Data API等を未利用。
- ユーザー要望: 簡単操作、関連動画検索、プリセット保存/読込。
- ドキュメント整備済み: `docs/ISSUES.md` バックログ、`docs/TESTING.md` ケース13〜15。

## 3. ゴール / 非ゴール
- ゴール
  - 検索UIから動画を追加できる。
  - 検索結果の選択が現在の動画リストへ即時反映される。
  - 動画セットをプリセットとして保存/読込できる。
  - 永続化ストレージのフォールバック（`chrome.storage` → `localStorage`）を実装する。
- 非ゴール
  - フェーズβ以降のレイアウトDrag & DropやAI編集機能。
  - サーバサイドAPIの新規構築（本フェーズはクライアントのみ）。

## 4. ユースケース
- UC-1: 利用者が検索キーワードから候補動画を確認し、クリックでタイルへ追加する。
- UC-2: 過去の視聴構成をプリセットとして保存し、別セッションで復元する。
- UC-3: プリセット一覧から共有リンク（URLパラメータ）を生成する。

## 5. 機能要件
- **検索UI**
  - フォームにキーワード入力→サジェスト（最大10件）。
  - 候補にはサムネイル、タイトル、チャンネル名、再生時間を表示。
  - 選択時: `parseYouTubeId()` と同様のID検証を通過させ、既存重複チェックに連動。
  - オフライン/レート超過時は再試行案内メッセージを表示。
- **プリセット管理**
  - 現在の動画IDリストを名前付きで保存。
  - 保存先優先度: `chrome.storage.local` → `localStorage` → URLパラメータ。
  - プリセット選択で既存タイルをクリアし、保存時状態を生成。
  - 保存上限（初期値10件）とMRU入替を実装。
- **設定永続化**
  - Volume/プレイリストに加え、プリセットメタデータと検索履歴（最新5件）を保存。

## 6. 技術詳細
### 6.1 検索エンジン候補
- Option A: YouTube Data API (Search:list)
  - `part=snippet`, `type=video`, `maxResults=10`。
  - 必要: APIキー、日次10kユニット制限。
- Option B: OEmbed + トレンドリスト
  - `https://www.youtube.com/oembed` で1件ずつメタ取得。
  - メリット: キー不要。デメリット: 一括検索不可。
- Option C: ローカル履歴/プリセットベース
  - 使用頻度の高い動画IDから候補生成。

**採用方針**: 短期PoCでは Option A を主軸、B/Cをフォールバックに利用。

### 6.2 APIキー管理
- フロント埋め込み禁止。`.env.local` のようなローカル設定 or ブラウザ入力で保持。
- テスト・検証用キーと本番キーを分離。
- キーは `window.sessionStorage` に保持し自動送信せず、ユーザー入力時のみAPI呼び出し。
- Rate limit 超過イベントをトラッキング（`console.warn`→今後のロギング基盤連携）。

### 6.3 UIコンポーネント（草案）
- `index.html` サイドバーに以下を追加:
  - 検索フォーム (`input#searchInput`, `button#searchButton`).
  - 結果リスト (`ul#searchResults`), 選択ボタン。
  - プリセットセクション（一覧、保存ボタン、共有リンク生成）。
- `styles/main.css`:
  - `.search-panel`, `.preset-panel` のレイアウトとレスポンシブ調整。
- アクセシビリティ:
  - ARIAロール/ラベル付与。
  - キーボード操作（上下キーで検索候補移動、Enterで選択）。

### 6.4 データモデル
```ts
interface SearchResult {
  id: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
  duration: string; // ISO 8601 (PT#M#S)
}

interface PresetEntry {
  id: string; // uuid
  name: string;
  videoIds: string[];
  createdAt: number;
  updatedAt: number;
}
```

### 6.5 ストレージ抽象化
- `storageAdapter` モジュール（新規）を `scripts/storage.js` として追加予定。
- 優先度: `chrome.storage.local` → `localStorage` → URLクエリ。
- メソッド例:
  - `loadSettings(): Promise<AppSettings>`
  - `savePreset(entry: PresetEntry): Promise<void>`
  - `listPresets(): Promise<PresetEntry[]>`

### 6.6 エラーハンドリング
- 検索失敗: メッセージ表示 + リトライボタン。
- プリセット保存重複: 既存名称に追記確認。
- ストレージ容量オーバー: 古いプリセットを削除 or ユーザーへ通知。

### 6.7 パフォーマンス
- 検索結果キャッシュを `Map<string, SearchResult[]>` で短期保持（5分）。
- Lazy render（結果10件固定）。
- プリセット保存時に不要な`persistVideos()`呼び出しを抑制。

### 6.8 セキュリティ
- APIキーは永続保存しない。
- 共有リンク生成時は動画IDのみ含め、個人情報・クエリ履歴を含めない。
- XSS対策: サニタイズ/`textContent`利用徹底。

## 7. テスト計画
- `docs/TESTING.md` ケース13: 検索UIの基本動作テスト。
- ケース14: プリセット保存/読込。
- ケース15: レイアウトプリセット切替（フェーズβ機能と連携予定）。
- 追加予定の自動テスト（検討）:
  - Playwrightで検索→選択→追加のE2E。
  - プリセットの保存と復元を構成差分で検証。

## 8. タスク分解（案）
1. ストレージ抽象化レイヤー実装 (`scripts/storage.js`, `scripts/main.js` 修正)。
2. 検索UIプロトタイプ＆YouTube Data API連携。
3. プリセット保存/読込ロジックとUI。
4. 共有リンク生成とURLパラメータ復元。
5. lint/test更新 (`docs/TESTING.md`, `docs/ISSUES.md` チェックボックス管理)。

## 9. リスク・課題
- YouTube APIキー漏洩リスク → ユーザー入力方式で暫定対応。
- Rate limitにより検索が頻繁に失敗する可能性 → キャッシュとバックオフ。
- プリセット保存によるストレージ容量制限 → 旧データ整理/SaaSへの移行検討。
- UI複雑化に伴う可読性低下 → コンポーネント分割やテンプレート導入検討。

## 10. 今後の拡張余地
- フェーズβ: レイアウトDrag & Drop、詳細なプリセットメタ情報。
- フェーズγ: AIによる自動チャプター生成結果をプリセットへ含める。
- 将来: サーバレスAPIで検索を代理しAPIキーをサーバ管理に移行。

## 11. 次アクション
- Issue作成: 検索UI実装、ストレージ抽象化、プリセットUI、共有リンク。
- `AI_CONTEXT.md` に進捗ログを追加し、`docs/ISSUES.md` の進行中へリンク。
- 主要選択肢のPoC期間と判定基準を定義（例: 2週間でレスポンス遅延 < 1s を達成）。

---

> メモ: 本仕様はフェーズαに限定。変更が生じた場合は `docs/ISSUES.md` に反映し、当ドキュメントの更新履歴を追記すること。
