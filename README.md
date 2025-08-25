# HoloSync (MVP)

YouTube の複数ライブ配信を最小限の操作で一括操作（再生/停止/ミュート/音量）できる Chrome 拡張（Manifest V3）。

## 機能（MVP）
- 手動で YouTube URL を追加（watch / youtu.be / live / embed に対応）
- 一括操作: 全て再生・全て一時停止・全てミュート・全てミュート解除・音量調整
- タイル表示レイアウト（レスポンシブ）
- 保存機能: 追加した動画URL（ID）と音量設定を `chrome.storage.local` に保存/復元

> 注意: Autoplay 制限により、初回の「全て再生」はミュートから開始されます。

## セットアップ（ローカルで読み込み）
1. Chrome を開き、`chrome://extensions/` へ。
2. 右上の「デベロッパーモード」を ON。
3. 「パッケージ化されていない拡張機能を読み込む」→ 本ディレクトリ（HoloSync）を選択。
4. ツールバーの拡張アイコンをクリック → HoloSync をピン留め。
5. HoloSync のアイコンをクリックすると、アプリページ（app.html）が新しいタブで開きます。

## 使い方（テスト手順）
1. HoloSync タブを開く。
2. YouTube のライブ配信または動画 URL を入力し「追加」。
3. プレイヤーがタイルで並んだら、以下を確認:
   - 「全て再生」: 全プレイヤーが再生される（初回はミュートで開始）。
   - 「全て一時停止」: 全プレイヤーが一時停止する。
   - 「全てミュート / 全てミュート解除」: 全プレイヤーのミュート状態が切り替わる。
   - 音量スライダー: 全プレイヤーの音量が 0–100 で変化。
4. レイアウトがウィンドウ幅に応じて 16:9 のタイルで崩れないことを確認。
5. タブを更新（リロード）して、追加済みの動画と音量設定が自動復元されることを確認。

## 実装メモ
- YouTube IFrame Player API のラッパー（`YT.Player`）は読み込まず、`postMessage` による直接コマンドで一括制御しています。
- 各 iframe は `enablejsapi=1` を付与。
- `chrome.storage.local` に URL リスト（動画ID）と音量を保存/復元。
- 将来拡張: レイアウトプリセット、音声解析による自動同期など。

## ドキュメント（手動生成）
- 環境制約により CI/Pipelines を使わず、ローカルで Doxygen を実行して `docs/` に HTML を生成します。
- 生成手順（Windows PowerShell）:
  1. Docker もしくはローカルの Doxygen を用意
  2. 次を実行: `pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\gen-docs.ps1`
  3. 生成結果: `docs/index.html` をブラウザで開く
- 生成物はコミット可能です。main へ push すれば、GitLab 上のリポジトリから直接 `docs/index.html` を閲覧できます（Pages は未使用）。
- 将来的に CI が利用可能になったら、GitLab Pages での自動公開に切り替えます。

### トラブルシュート（Doxygen 生成）
- __doxygen イメージが見つからない__
  - 事前に手動で pull: `docker pull doxygen/doxygen:1.9.8`
  - 代替: `docker pull doxygen/doxygen:latest` または `docker pull alpine:3.19`
- __Windows のパスをマウントできない__
  - 例1（Windowsパス）: `-v "C:\\Users\\<you>\\path\\HoloSync:/work"`
  - 例2（WSL形式）: `-v "/c/Users/<you>/path/HoloSync:/work"`
  - 例3（PowerShell 変数）: `$p=$PWD.Path; docker run --rm -v "$p:/work" -w /work doxygen/doxygen:1.9.8 doxygen Doxyfile`
- __ログの場所__
  - スクリプトは詳細ログを標準出力に表示。
  - 警告ログ（設定時）: `docs/doxygen_warnings.log`
  - 注: 警告が発生しない場合、このファイルは生成されません（存在しなくても正常です）。

## ライセンス
- TBD
