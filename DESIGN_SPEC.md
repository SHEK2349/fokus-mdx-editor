# Fokus. デザイン仕様書

MDXエディタとブログのデザインを統一するための仕様書です。

---

## 1. カラーパレット

### ライトモード

| 用途 | CSS変数 | カラーコード | 説明 |
|------|---------|-------------|------|
| 背景 | `--background` | `#faf8f5` | 温かみのあるオフホワイト |
| テキスト | `--foreground` | `#3d3d3d` | ダークグレー |
| アクセント | `--accent` | `#7b6d5d` | ブラウン/トープ |
| ミュート | `--muted` | `#ebe7e0` | 薄いベージュ（背景用） |
| ボーダー | `--border` | `#ddd8d0` | 薄いグレー |

### ダークモード

| 用途 | CSS変数 | カラーコード | 説明 |
|------|---------|-------------|------|
| 背景 | `--background` | `#1a1a1a` | ダークグレー |
| テキスト | `--foreground` | `#e0dcd5` | 温かみのあるライトグレー |
| アクセント | `--accent` | `#c9a87c` | ゴールド/ブラウン |
| ミュート | `--muted` | `#2d2d2d` | ダークグレー |
| ボーダー | `--border` | `#404040` | ミディアムグレー |

---

## 2. タイポグラフィ

### フォントファミリー

```css
font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

- **本文**: モノスペースフォント
- **OG画像**: Noto Sans JP（日本語対応）

### フォントサイズスケール

| 用途 | サイズ | ウェイト |
|------|--------|---------|
| h1 | 2.25rem (36px) | 700 |
| h2 | 1.5rem (24px) | 700 |
| h3 | 1.25rem (20px) | 600 |
| 本文 | 1rem (16px) | 400 |
| 小テキスト | 0.875rem (14px) | 400 |
| キャプション | 0.75rem (12px) | 400 |

---

## 3. スペーシング

```
4px  - 0.25rem (xs)
8px  - 0.5rem  (sm)
12px - 0.75rem (md)
16px - 1rem    (base)
24px - 1.5rem  (lg)
32px - 2rem    (xl)
48px - 3rem    (2xl)
64px - 4rem    (3xl)
```

---

## 4. コンポーネントスタイル

### ボタン

```css
/* プライマリボタン */
.btn-primary {
  background: var(--accent);
  color: var(--background);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: opacity 0.2s ease;
}

.btn-primary:hover {
  opacity: 0.9;
}

/* セカンダリボタン */
.btn-secondary {
  background: transparent;
  color: var(--foreground);
  border: 1px solid var(--border);
  padding: 0.5rem 1rem;
  border-radius: 4px;
}

.btn-secondary:hover {
  background: var(--muted);
}
```

### 入力フィールド

```css
.input {
  background: var(--background);
  color: var(--foreground);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  outline: none;
}

.input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(123, 109, 93, 0.25);
}
```

### カード

```css
.card {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
}

.card:hover {
  border-color: var(--accent);
}
```

---

## 5. アイコン

- スタイル: 線画（stroke）ベース
- 太さ: 1.5px - 2px
- サイズ: 16px / 20px / 24px
- 推奨ライブラリ: Lucide Icons, Heroicons

---

## 6. アニメーション

```css
/* トランジション */
transition: all 0.2s ease;

/* ホバーエフェクト */
transform: translateY(-2px);

/* フェードイン */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

---

## 7. レイアウト

### 最大幅

```css
max-width: 768px; /* 48rem - コンテンツ幅 */
```

### サイドバー幅

```
240px - 280px（推奨）
```

---

## 8. CSS変数（Tailwind CSS用）

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-accent: var(--accent);
  --color-muted: var(--muted);
  --color-border: var(--border);
}
```

---

## 9. デザインの原則

1. **ミニマリズム**: 不要な装飾を排除
2. **温かみ**: オフホワイトとブラウン系の配色
3. **読みやすさ**: モノスペースフォント、適切な行間
4. **一貫性**: 同じカラーパレット・スペーシングを使用
5. **アクセシビリティ**: コントラスト比を確保

---

## 10. 参考ファイル

- ブログCSS: `wp-to-astro-sheklog-02/src/styles/global.css`
- タイポグラフィ: `wp-to-astro-sheklog-02/src/styles/typography.css`
