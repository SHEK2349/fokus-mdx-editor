# Fokus Editor 開発タイムライン - 要件と実装機能

## 📋 プロジェクト概要

**目的**: Astroブログ（Fokus.）用のMDXファイルを効率的に作成・編集するためのデスクトップアプリケーション

**技術スタック**: 
- フロントエンド: React + TypeScript
- エディタ: Monaco Editor
- デスクトップ: Tauri 2.0
- バックエンド: FastAPI
- スタイリング: Tailwind CSS

---

## 🗓️ 開発フェーズ（時系列）

### Phase 0: 企画・要件定義

#### 📝 要件定義書の作成
**元の要望**: 
> MDXファイルを編集するためのソフトを作成したい。Pythonベースでの作成を考えている。

**技術選定の検討**:

| 案 | 構成 | 評価結果 |
|:--|:--|:--|
| **案A** | PyQt6（純正Python） | 開発速度★★★★☆、UI品質★★★☆☆ |
| **案B** | FastAPI + React + Tauri | 開発速度★★★☆☆、UI品質★★★★★ |

**決定**: 案B（FastAPI + React + Tauri）を採用
- iA Writer準拠のMarkdownショートカット
- Git連携機能
- `.app`形式での配布

---

### Phase 1: MVP開発

#### 1.1 プロジェクトセットアップ
- [x] Tauri + React プロジェクト初期化
- [x] FastAPI バックエンド構築
- [x] 開発環境設定（hot reload等）
- [x] デザイン仕様書の作成（ブログとの統一）

#### 1.2 記事管理機能
- [x] MDXファイル一覧取得API
- [x] MDXファイル読み込み（Frontmatter分離）
- [x] MDXファイル保存
- [x] サイドバー記事一覧UI

#### 1.3 エディタ機能
- [x] Monaco Editor統合
- [x] Markdown シンタックスハイライト
- [x] iA Writer準拠ショートカット実装

| ショートカット | 機能 |
|:--|:--|
| `Cmd+B` | **太字** |
| `Cmd+I` | *斜体* |
| `Cmd+K` | リンク挿入 |
| `Cmd+1` ~ `Cmd+6` | 見出しレベル |
| `Cmd+L` | 箇条書きリスト |
| `Cmd+Shift+C` | コードブロック |
| `Cmd+'` | 引用 |

#### 1.4 Frontmatterエディタ
- [x] フォームUI（タイトル、日時、タグ等）
- [x] タグオートコンプリート
- [x] draft/featuredトグル

---

### Phase 2: Git連携機能

#### 2.1 Git操作機能
- [x] 変更ファイル検出
- [x] コミットUI（メッセージ入力）
- [x] プッシュ機能
- [x] ステータス表示（未保存/未コミット）

#### 2.2 コミットメッセージ自動生成
**追加要件**:
> コミットコメントに、自動で修正・追加対象のファイル名を入力する

**フォーマット例**:
```
[ユーザー入力のメッセージ]

変更ファイル:
- src/data/blog/new-article.mdx (追加)
- src/data/blog/existing-article.mdx (変更)
```

---

### Phase 3: UX強化・バグ修正

#### 3.1 ライブプレビュー
- [x] Markdown→HTMLレンダリング
- [x] カスタムCSSスタイル適用
- [x] スクロール同期

#### 3.2 UX改善
- [x] 自動保存（30秒間隔）
- [x] 未保存警告
- [x] ダークモード

#### 3.3 🐛 Monaco Editor読み込み問題
**問題**: 本番ビルドでMonaco Editorが読み込まれない

**原因**: CDNからのロードがContent Security Policy (CSP) に違反

**解決策**: ローカルバンドルからロードするよう設定変更
```typescript
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

loader.config({ monaco });
```

#### 3.4 🐛 pubDatetimeの未来日時問題
**問題**: 日本時間で入力した日時が未来の日付として保存される

**原因**: UTCへの変換処理が不適切

**解決策**: FrontmatterEditorでローカル時間→UTC変換を正しく実装

---

### Phase 4: ビルド・配布

#### 4.1 アプリビルド
- [x] macOS `.app` ビルド
- [ ] コード署名（オプション）
- [ ] 自動更新（オプション）

#### 4.2 ランディングページ作成
- [x] 日本語版LP (`/fokus-editor/`)
- [x] 英語版LP (`/fokus-editor/en/`)
- [x] 言語切り替えボタン
- [x] OGP設定（SNS共有時のサムネイル）
- [x] レスポンシブ対応

---

## 📁 ファイル構成

```
fokus-mdx-editor/
├── src-tauri/              # Tauri (Rust) 設定
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/main.rs
├── src/                    # React フロントエンド
│   ├── components/
│   │   ├── Editor/         # Monaco エディタ
│   │   ├── Frontmatter/    # メタデータフォーム
│   │   ├── Sidebar/        # 記事一覧
│   │   └── Preview/        # ライブプレビュー
│   ├── hooks/
│   ├── utils/
│   └── App.tsx
├── backend/                # FastAPI バックエンド
│   ├── main.py
│   ├── routers/
│   │   ├── articles.py     # 記事CRUD
│   │   ├── git.py          # Git操作
│   │   └── tags.py         # タグ管理
│   └── services/
│       ├── mdx_parser.py   # MDX解析
│       └── git_service.py  # Git操作
└── landing/                # ランディングページ
```

---

## 🎨 デザインシステム

ブログ（shek-fokus.com）とデザインを統一

### カラーパレット

| モード | 背景 | テキスト | アクセント |
|:--|:--|:--|:--|
| ライト | `#faf8f5` | `#3d3d3d` | `#7b6d5d` |
| ダーク | `#1a1a1a` | `#e0dcd5` | `#c9a87c` |

### デザイン原則
1. **ミニマリズム**: 不要な装飾を排除
2. **温かみ**: オフホワイトとブラウン系の配色
3. **読みやすさ**: モノスペースフォント、適切な行間
4. **一貫性**: 同じカラーパレット・スペーシングを使用

---

## 📊 API設計

### 記事API
```
GET    /api/articles          # 記事一覧
GET    /api/articles/{slug}   # 記事取得
POST   /api/articles          # 新規作成
PUT    /api/articles/{slug}   # 更新
DELETE /api/articles/{slug}   # 削除
```

### Git API
```
GET    /api/git/status        # 変更状態
POST   /api/git/commit        # コミット
POST   /api/git/push          # プッシュ
GET    /api/git/log           # 履歴
```

---

## 🔜 今後の予定

- [ ] R2画像アップロード機能
- [ ] 画像管理UI
- [ ] WebP自動変換
- [ ] コード署名
- [ ] 自動更新機能
