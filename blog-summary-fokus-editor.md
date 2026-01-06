# AIと一緒に個人ブログを作り直した話 - Fokus Editorとブログサイトの開発記録

## はじめに

WordPressで運営していたブログを、Astro + Cloudflare Pagesに移行するプロジェクトに取り組みました。また、ブログ記事の編集を快適にするためのデスクトップアプリケーション「Fokus Editor」も同時に開発しています。

この記事では、開発中に直面した課題とその解決策、そして苦労したポイントをまとめます。

---

## 🎯 プロジェクトの目標

1. **WordPressからAstroへの移行** - 静的サイトジェネレーターへの乗り換え
2. **Cloudflare R2への画像配信** - 高速な画像CDN構築
3. **Fokus Editorの開発** - MDX記事を編集するためのデスクトップアプリ

---

## 🔧 取り組んだ主な作業

### 1. ブログサイトの構築・改善

#### 記事の内部リンク設定
記事間の相関関係を分析し、以下のカテゴリで相互リンクを設定：
- **E-Inkリーダー関連**: Xteink X3/X4、Kindle Paperwhite、Onyx Boox
- **HHKBキーボード関連**: HHKB Hybrid、Pro2などの相互リンク
- **Aerバッグ関連**: Tech Sling、Fit Pack、Go Slingなど

#### スペック表の作成
複数の製品レビュー記事にMarkdown形式のスペック表を追加：
- HHKB HYBRID / Pro2
- Steam Deck LCD
- Sony INZONE Buds
- RICOH GR
- Punkt. MP02
- April Pour Over Brewing Kit など

#### 追従型目次の実装
PCの画面幅（1152px以上）で、スクロールに連動してハイライトする目次を実装。IntersectionObserverを使用し、現在表示中のセクションを自動的にハイライトする機能を実現。

---

### 2. Cloudflare R2への画像移行

#### 苦労したポイント

**問題1: リモートビルド環境で画像が見つからない**

Gitリポジトリのサイズ削減のため、画像を`.gitignore`に追加した結果、Cloudflare Pagesのビルド環境で画像が参照できなくなるという問題が発生。

```
Error: Rollup failed to resolve import "@/assets/images/xxx/yyy.jpeg"
```

**解決策**: 画像をR2に事前アップロードし、MDX内の画像パスをR2のURLに書き換える方式に変更。

**問題2: シークレット情報の漏洩**

開発中に`.env.r2.example`ファイルに実際のAPIキーを記載してしまい、Gitの履歴に残ってしまった。

**解決策**: 
1. BFG Repo-Cleanerを使用してGit履歴からシークレットを削除
2. `.gitignore`に`.env.*`パターンを追加
3. R2のAPIトークンを再発行

**問題3: 並列アップロードの実装**

1,000枚以上の画像をR2にアップロードする際、逐次処理では時間がかかりすぎた。

**解決策**: 並列処理に改善し、アップロード時間を大幅に短縮。

---

### 3. ドメイン移行（Xserver → Cloudflare）

#### 苦労したポイント

**問題: ネームサーバー変更の反映待ち**

Xserverドメインのネームサーバーをcloudflareに変更後、1時間経過しても「無効なネームサーバー」と表示される問題が発生。

**調査結果**:
- `dig @8.8.8.8 ns shek-fokus.net` → Cloudflareのネームサーバーが確認できた
- Whois情報の更新には時間がかかる（最大24時間）

**結論**: 設定自体は正しく、Whois情報の反映待ちだった。

---

### 4. OGP（SNS共有時のサムネイル）対応

#### 苦労したポイント

**問題: 日本語タイトルの文字化け**

OG画像を自動生成する機能で、日本語タイトルが文字化けする問題が発生。

**原因**: 使用していたフォント「IBM Plex Mono」が日本語をサポートしていなかった。

**解決策**: フォントを「Noto Sans JP」に変更。

```typescript
// Before
font: "IBM+Plex+Mono"

// After
font: "Noto+Sans+JP"
```

#### OGテンプレートのリデザイン

ブログのデザインシステム（温かみのあるオフホワイト背景、ブラウン系アクセント）に合わせてOG画像テンプレートをリデザイン。

---

### 5. Fokus Editor LP（ランディングページ）の作成

#### 実装した機能
- 日本語/英語の言語切り替えボタン
- レスポンシブ対応（スマートフォン表示）
- OGP設定（SNS共有時のサムネイル）

---

## 📊 成果

### パフォーマンス改善
- **Lighthouseスコア**: パフォーマンス 91、アクセシビリティ 100、SEO 92
- **フォント最適化**: Noto Sans JP 2147kB → 265kB（87.6%削減）
- **画像配信**: R2 CDN経由で高速配信

### 開発環境の整備
- 20種類以上のWordPress移行スクリプトを作成
- R2画像アップローダーの実装
- 記事Frontmatterの一括更新ツール

---

## 💡 学んだこと

1. **静的サイトの利点と課題**: ビルド時に全てが確定するため、動的な処理には工夫が必要
2. **CDNの重要性**: 画像配信はCDN経由が圧倒的に速い
3. **ネームサーバー変更は待ちが必要**: 即座に反映されないことを理解しておく
4. **シークレット管理の重要性**: `.env`ファイルは絶対にコミットしない

---

## 🔜 今後の予定

- [ ] Fokus Editorのリリース
- [ ] 解析ツール（Cloudflare Web Analytics）の導入
- [ ] さらなるパフォーマンス最適化

---

## 関連リンク

- ブログ: [shek-fokus.com](https://shek-fokus.com)
- Fokus Editor LP: [shek-fokus.com/fokus-editor/](https://shek-fokus.com/fokus-editor/)
