# Piggy Math

子ども向けの、筆算による足し算練習アプリです。React やビルドツールを使わない、依存関係ゼロの静的 Web アプリとして動作します。

## 使い方

`index.html` をブラウザで直接開くだけで遊べます。`npm install` やビルド、Web サーバーは必要ありません。

## 機能

- 2桁・3桁の足し算レベル
- 繰り上がりあり／なしの段階的なレベル
- 答えを右の桁から左の桁へ入力
- 答えの入力に合わせた繰り上がりの自動表示
- 15秒・20秒・30秒から選べるタイマー
- 1セッション10問
- スコア、メダル、ベストスコア
- 成績に応じたレベル解放
- Piggy Math のテーマ、効果音、レスポンシブ表示
- 進捗をブラウザの `localStorage` に保存

## ファイル構成

```text
index.html  画面の土台
style.css   デザインとレスポンシブ表示
script.js   ゲームロジックと画面制御
README.md   この説明
```

## GitHub Pages で公開する

GitHub リポジトリの **Settings → Pages** で次のように設定します。

1. Source を **Deploy from a branch** にする
2. Branch を **main**、フォルダーを **/(root)** にする
3. **Save** を押す

設定後は、main ブランチ直下の `index.html` がそのまま公開されます。
