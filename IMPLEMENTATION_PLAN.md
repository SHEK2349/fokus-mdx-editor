# MDXエディタ 実装計画書

## 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|-----------|
| バックエンド | FastAPI | 0.109+ |
| フロントエンド | React + TypeScript | 18+ |
| エディタ | Monaco Editor | latest |
| デスクトップ | Tauri | 2.0 |
| スタイリング | Tailwind CSS | 3.4+ |
| Git操作 | GitPython (Python) | 3.1+ |

---

## プロジェクト構造

```
fokus-mdx-editor/
├── src-tauri/              # Tauri (Rust) 設定
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       └── main.rs
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
│   ├── services/
│   │   ├── mdx_parser.py   # MDX解析
│   │   └── git_service.py  # Git操作
│   └── models/
├── package.json
└── requirements.txt
```

---

## Phase 1: MVP（2-3週間）

### 1.1 プロジェクトセットアップ
- [ ] Tauri + React プロジェクト初期化
- [ ] FastAPI バックエンド構築
- [ ] 開発環境設定（hot reload等）

### 1.2 記事管理
- [ ] MDXファイル一覧取得API
- [ ] MDXファイル読み込み（Frontmatter分離）
- [ ] MDXファイル保存
- [ ] サイドバー記事一覧UI

### 1.3 エディタ
- [ ] Monaco Editor統合
- [ ] Markdown シンタックスハイライト
- [ ] **iA Writer準拠ショートカット実装**

### 1.4 Frontmatterエディタ
- [ ] フォームUI（タイトル、日時、タグ等）
- [ ] タグオートコンプリート
- [ ] draft/featuredトグル

---

## iA Writer準拠ショートカット

| ショートカット | 機能 |
|----------------|------|
| `Cmd+B` | **太字** |
| `Cmd+I` | *斜体* |
| `Cmd+K` | リンク挿入 |
| `Cmd+Shift+K` | 画像挿入 |
| `Cmd+1` ~ `Cmd+6` | 見出しレベル |
| `Cmd+L` | 箇条書きリスト |
| `Cmd+Shift+L` | 番号付きリスト |
| `Cmd+Shift+C` | コードブロック |
| `Cmd+'` | 引用 |
| `Cmd+D` | 取り消し線 |
| `Cmd+/` | コメントアウト |

---

## Phase 2: Git連携（1週間）

### 2.1 Git機能
- [ ] 変更ファイル検出
- [ ] コミットUI（メッセージ入力）
- [ ] プッシュ機能
- [ ] ステータス表示（未保存/未コミット）

### 2.2 ヒストリー
- [ ] コミット履歴表示
- [ ] 差分プレビュー

---

## Phase 3: プレビュー & UX強化（1週間）

### 3.1 ライブプレビュー
- [ ] Markdown→HTMLレンダリング
- [ ] カスタムCSSスタイル適用
- [ ] スクロール同期

### 3.2 UX改善
- [ ] 自動保存（30秒）
- [ ] 未保存警告
- [ ] ダークモード

---

## Phase 4: ビルド & 配布

### 4.1 アプリビルド
- [ ] macOS `.app` ビルド
- [ ] コード署名（オプション）
- [ ] 自動更新（オプション）

---

## API設計

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

### タグAPI

```
GET    /api/tags              # 全タグ一覧
```

---

## 設定ファイル

```json
{
  "blogDirectory": "/Users/shek/Desktop/dev/wp-to-astro-sheklog-02",
  "articlesPath": "src/data/blog",
  "defaultAuthor": "SHEK",
  "defaultTimezone": "Asia/Tokyo",
  "autoSaveInterval": 30000
}
```

---

## 次のステップ

1. 新規プロジェクトディレクトリを作成
2. Tauri + React + FastAPI のボイラープレート構築
3. Phase 1の実装開始

---

## Git連携の追加仕様

### コミットメッセージの自動生成

コミット時に、変更・追加されたファイル名を自動的にコミットメッセージに含める。

**フォーマット例:**

```
[ユーザー入力のメッセージ]

変更ファイル:
- src/data/blog/new-article.mdx (追加)
- src/data/blog/existing-article.mdx (変更)
```

**実装方法:**

```python
# backend/services/git_service.py

def generate_commit_message(user_message: str) -> str:
    """変更ファイル一覧を含むコミットメッセージを生成"""
    import subprocess
    
    # ステージされたファイルを取得
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-status"],
        capture_output=True, text=True
    )
    
    files = []
    for line in result.stdout.strip().split("\n"):
        if line:
            status, filename = line.split("\t", 1)
            status_text = {
                "A": "追加",
                "M": "変更", 
                "D": "削除",
                "R": "名前変更"
            }.get(status[0], "変更")
            files.append(f"- {filename} ({status_text})")
    
    if files:
        return f"{user_message}\n\n変更ファイル:\n" + "\n".join(files)
    return user_message
```

**UIフロー:**
1. ユーザーがコミットメッセージを入力
2. 変更ファイル一覧がプレビュー表示される
3. コミット実行時に自動的にファイル一覧が追加される
