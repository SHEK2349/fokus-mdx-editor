# Fokus. Editor

![Fokus Editor Screenshot](landing/images/screenshot15.png)

**Astroブログのためのミニマルな MDX エディタ**

## 特徴

- ✍️ **MDX対応** - Astroブログの全Frontmatterフィールドをサポート
- 👁️ **リアルタイムプレビュー** - 書いた内容を即座にプレビュー
- 🔄 **Git統合** - コミット・プッシュがアプリ内で完結
- ⚡ **軽量・高速** - Rust + Tauriで構築、ネイティブ並みの高速動作
- 🌙 **ダーク/ライトモード** - システム設定に自動対応

## ダウンロード

- [macOS (Apple Silicon)](https://github.com/SHEK2349/fokus-mdx-editor/releases)

---

## 使い方

### 1. リポジトリの準備

Fokus Editorを使用するには、**Astroブログのリポジトリが必要**です。

```bash
# 既存のリポジトリをクローン（または新規作成）
git clone https://github.com/あなたのユーザー名/あなたのブログ.git
```

> **重要**: リポジトリに`origin`リモートが設定されている必要があります。

### 2. 初回設定

アプリ起動後、以下を設定します：

| 項目 | 説明 | 例 |
|------|------|-----|
| リポジトリパス | Gitリポジトリのルートディレクトリ | `/Users/you/my-blog` |
| 記事パス | MDXファイルがあるディレクトリ（相対パス） | `src/data/blog` |

### 3. 記事の編集と公開

1. 左サイドバーから記事を選択、または「新規記事」をクリック
2. エディタで記事を編集
3. `Cmd + S` で保存
4. Gitパネルでコミットメッセージを入力してコミット
5. 「プッシュ」ボタンでリモートに送信

### 4. デプロイ（Cloudflare Pages等）

プッシュ先はリポジトリの`origin`リモートになります。

**Cloudflare PagesやVercelと連携する場合：**
1. GitHubリポジトリをCloudflare Pages/Vercelに接続
2. Fokus Editorからプッシュ → 自動的にデプロイが開始

---

## 開発

### 必要環境
- Node.js 18+
- Rust 1.70+
- macOS 11+

### セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run tauri dev

# ビルド
npm run tauri build
```

## 技術スタック

- **フロントエンド**: React + TypeScript + Vite
- **バックエンド**: Rust (Tauri Commands)
- **エディタ**: MDXEditor
- **プレビュー**: react-markdown

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照

## 作者

SHEK - [Blog](https://shek-fokus.com) | [X](https://x.com/Shek_Fokus)
