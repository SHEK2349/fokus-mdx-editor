# Fokus. Mobile - 実装計画書

**バージョン**: 1.0.0
**最終更新**: 2026-01-21
**開発期間**: 18週間（MVP: 8週間）

---

## 1. プロジェクト概要

### 1.1 目標

Fokus MDX EditorのモバイルアプリをFlutterで開発し、**2026年Q2にiOS/Android同時リリース**を目指す。

### 1.2 開発体制（推奨）

| 役割 | 人数 | スキル要件 |
|------|------|-----------|
| **PM/PO** | 1名 | プロジェクト管理、要件定義 |
| **Flutterエンジニア** | 2名 | Dart/Flutter, Riverpod, UI実装 |
| **バックエンドエンジニア** | 1名 | Git操作（Rust/FFI）, libgit2 |
| **UI/UXデザイナー** | 1名 | モバイルデザイン、Figma |
| **QAエンジニア** | 1名 | テスト設計、自動化 |

**合計**: 6名

### 1.3 開発環境

| ツール | 用途 |
|--------|------|
| **VS Code / Android Studio** | IDE |
| **Flutter SDK 3.19+** | フレームワーク |
| **Xcode 15+** | iOS ビルド |
| **Android Studio** | Android ビルド |
| **Figma** | デザイン |
| **GitHub** | バージョン管理、CI/CD |
| **Firebase** | アナリティクス、クラッシュレポート |

---

## 2. 開発フェーズ

### Phase 1: MVP (Minimum Viable Product) - 8週間

#### Week 1-2: プロジェクトセットアップ
- [x] Flutter プロジェクト初期化
- [ ] 依存ライブラリ導入
  - `riverpod`, `freezed`, `isar`, `libgit2_dart`
  - `flutter_secure_storage`, `connectivity_plus`
- [ ] フォルダ構成設計
```
lib/
├── main.dart
├── app.dart
├── core/
│   ├── constants/
│   ├── theme/
│   └── utils/
├── data/
│   ├── models/
│   ├── repositories/
│   └── datasources/
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── usecases/
└── presentation/
    ├── screens/
    ├── widgets/
    └── providers/
```
- [ ] CI/CD パイプライン構築（GitHub Actions）
- [ ] Firebase プロジェクト作成

**成果物**:
- 起動可能なFlutterアプリ（空白画面）
- ビルド自動化

---

#### Week 3-4: データ層実装
- [ ] データモデル定義（`Article`, `Frontmatter`, `RepositoryConfig`）
- [ ] Freezed コード生成
- [ ] Isar データベーススキーマ
- [ ] CRUD操作実装
  - 記事の作成・読み込み・更新・削除
  - ローカルストレージ管理
- [ ] YAML パース/生成（Frontmatter）
- [ ] テスト作成（単体テスト）

**成果物**:
- ローカルDB動作確認
- テストカバレッジ80%以上

---

#### Week 5-6: Git統合（基本機能）
- [ ] libgit2_dart 統合
- [ ] リポジトリクローン（Shallow Clone）
- [ ] ファイル読み込み
- [ ] コミット機能
- [ ] プッシュ機能（PAT認証）
- [ ] プル機能
- [ ] エラーハンドリング
- [ ] テスト作成

**成果物**:
- コマンドライン経由でGit操作動作確認
- 認証情報保存（Secure Storage）

---

#### Week 7-8: UI実装（記事一覧・編集）
- [ ] デザインシステム構築
  - カラーパレット
  - タイポグラフィ
  - コンポーネント（ボタン、カード、入力フィールド）
- [ ] 記事一覧画面
  - カードリスト表示
  - プルトゥリフレッシュ
  - 記事選択
- [ ] 記事編集画面
  - Frontmatter フォーム
  - Markdown エディタ
  - 保存ボタン
- [ ] ナビゲーション（タブバー）
- [ ] ダークモード対応
- [ ] 統合テスト

**成果物**:
- MVPデモ動画
- TestFlightビルド（iOS）
- 内部テスト配布（Android）

---

### Phase 2: エンハンスメント - 6週間

#### Week 9-10: プレビュー機能
- [ ] リアルタイムプレビュー実装
  - Markdown → HTML レンダリング
  - スタイル適用（デスクトップ版準拠）
- [ ] スワイプジェスチャー
  - エディタ ⇄ プレビュー切替
  - アニメーション調整
- [ ] 画像表示最適化
  - 遅延読み込み
  - キャッシュ

**成果物**:
- プレビュー機能デモ

---

#### Week 11-12: 画像・メディア機能
- [ ] カメラ連携
  - 写真撮影
  - ギャラリー選択
- [ ] 画像最適化
  - リサイズ（1200px幅）
  - WebP変換
- [ ] 画像挿入フロー
  - エディタへのMarkdown挿入
  - ローカル保存
  - Git追跡
- [ ] Cloudflare R2アップロード（オプション）
  - 直接アップロード
  - URL取得

**成果物**:
- 画像挿入デモ

---

#### Week 13-14: オフライン対応・同期
- [ ] オフライン編集
  - ローカルキャッシュ
  - 同期ステータス管理（`SyncStatus`）
- [ ] バックグラウンド同期
  - WorkManager (Android)
  - BackgroundTasks (iOS)
- [ ] 同期エンジン実装
  - 自動コミット・プッシュ
  - Wi-Fi接続確認
  - バッテリー残量確認
- [ ] 競合検出
  - プッシュ失敗時の通知
  - 競合UI（次フェーズ）

**成果物**:
- オフライン→オンライン復帰時の自動同期

---

### Phase 3: 高度な機能 - 4週間

#### Week 15-16: 競合解決UI
- [ ] 競合検出フロー
  - プッシュ失敗時の通知
  - 競合ファイル一覧表示
- [ ] 3-way マージUI
  - ローカル・リモート・ベース表示
  - 手動マージエディタ
  - プレビュー
- [ ] 自動マージ（オプション）
  - 非競合部分の自動マージ
  - ユーザー確認

**成果物**:
- 競合解決デモ

---

#### Week 17-18: 追加機能・最終調整
- [ ] プッシュ通知
  - 同期完了通知
  - 競合検出通知
- [ ] ウィジェット（iOS/Android）
  - 下書き数表示
  - クイック作成
- [ ] 音声入力（オプション）
  - Speech-to-Text
  - Markdown変換
- [ ] パフォーマンスチューニング
  - 起動時間最適化
  - メモリ使用量削減
- [ ] バグ修正
- [ ] ローカライゼーション（日本語・英語）
- [ ] アクセシビリティ対応

**成果物**:
- リリース候補版（RC）

---

## 3. タスク詳細

### 3.1 プロジェクトセットアップ（Week 1-2）

#### タスクリスト
```
[Week 1]
- [ ] Flutter SDKインストール（3.19+）
- [ ] プロジェクト作成: `flutter create fokus_mobile`
- [ ] パッケージ追加（pubspec.yaml）
  - [ ] riverpod: ^2.5.0
  - [ ] freezed: ^2.4.0
  - [ ] isar: ^3.1.0
  - [ ] libgit2_dart: ^1.0.0
  - [ ] flutter_secure_storage: ^9.0.0
  - [ ] connectivity_plus: ^5.0.0
  - [ ] permission_handler: ^11.0.0
- [ ] フォルダ構成作成
- [ ] 開発環境設定（VS Code / Android Studio）

[Week 2]
- [ ] GitHub リポジトリ作成
- [ ] CI/CD パイプライン構築
  - [ ] .github/workflows/ci.yml
  - [ ] Flutter test
  - [ ] Flutter build
- [ ] Firebase プロジェクト作成
  - [ ] iOS アプリ追加
  - [ ] Android アプリ追加
  - [ ] Crashlytics 有効化
- [ ] 初回コミット・プッシュ
```

---

### 3.2 データ層実装（Week 3-4）

#### 実装順序

1. **エンティティ定義** (`lib/domain/entities/`)
```dart
// article.dart
@freezed
class Article with _$Article {
  const factory Article({...}) = _Article;
  factory Article.fromJson(Map<String, dynamic> json) => ...;
}

// frontmatter.dart
@freezed
class Frontmatter with _$Frontmatter {
  const factory Frontmatter({...}) = _Frontmatter;

  factory Frontmatter.fromYaml(YamlMap yaml) {...}
  YamlMap toYaml() {...}
}
```

2. **データベーススキーマ** (`lib/data/datasources/local/`)
```dart
// article_entity.dart
@collection
class ArticleEntity {
  Id id = Isar.autoIncrement;
  String slug;
  String frontmatterJson;
  String content;
  ...
}
```

3. **リポジトリ実装** (`lib/data/repositories/`)
```dart
// article_repository_impl.dart
class ArticleRepositoryImpl implements ArticleRepository {
  final Isar _isar;

  @override
  Future<List<Article>> getAllArticles() async {
    final entities = await _isar.articleEntitys.where().findAll();
    return entities.map((e) => e.toArticle()).toList();
  }

  @override
  Future<void> saveArticle(Article article) async {
    await _isar.writeTxn(() async {
      await _isar.articleEntitys.put(article.toEntity());
    });
  }
}
```

4. **テスト**
```dart
void main() {
  group('ArticleRepository', () {
    test('should save and retrieve article', () async {...});
    test('should update existing article', () async {...});
    test('should delete article', () async {...});
  });
}
```

---

### 3.3 Git統合（Week 5-6）

#### 実装手順

1. **認証サービス**
```dart
// lib/data/datasources/remote/git_auth_service.dart
class GitAuthService {
  Future<void> savePAT(String token) async {...}
  Future<String?> getPAT() async {...}
  Future<bool> validatePAT(String token) async {...}
}
```

2. **Git リポジトリ**
```dart
// lib/data/datasources/remote/git_repository.dart
class GitRepository {
  Future<void> clone(String url, Credentials credentials) async {...}
  Future<void> commitArticle(Article article, String message) async {...}
  Future<PushResult> push(Credentials credentials) async {...}
  Future<void> pull() async {...}
}
```

3. **統合テスト**
```bash
# テスト用リポジトリ作成
git init /tmp/test_repo
cd /tmp/test_repo
git add .
git commit -m "Initial commit"

# Flutter テスト実行
flutter test test/integration/git_repository_test.dart
```

---

### 3.4 UI実装（Week 7-8）

#### コンポーネント作成順序

1. **デザインシステム**
```dart
// lib/core/theme/app_theme.dart
class AppTheme {
  static ThemeData light() => ThemeData(...);
  static ThemeData dark() => ThemeData(...);
}

// lib/core/theme/app_colors.dart
class AppColors {
  static const background = Color(0xFFFAF8F5);
  static const foreground = Color(0xFF3D3D3D);
  ...
}
```

2. **基本コンポーネント** (`lib/presentation/widgets/`)
```
- app_button.dart
- app_card.dart
- app_text_field.dart
- app_loading.dart
```

3. **画面実装** (`lib/presentation/screens/`)
```
- article_list/
  - article_list_screen.dart
  - article_card.dart
  - article_list_provider.dart
- article_editor/
  - article_editor_screen.dart
  - frontmatter_form.dart
  - markdown_editor.dart
  - editor_provider.dart
- settings/
  - settings_screen.dart
```

4. **ナビゲーション**
```dart
// lib/presentation/navigation/app_router.dart
final appRouter = GoRouter(
  routes: [
    GoRoute(path: '/', builder: (context, state) => ArticleListScreen()),
    GoRoute(path: '/editor/:id', builder: (context, state) => EditorScreen(...)),
  ],
);
```

---

## 4. テスト計画

### 4.1 テスト種別

| テスト種別 | ツール | カバレッジ目標 |
|-----------|--------|---------------|
| **単体テスト** | Flutter Test | 80%以上 |
| **ウィジェットテスト** | Flutter Test | 主要画面すべて |
| **統合テスト** | Integration Test | 主要フローすべて |
| **E2Eテスト** | Maestro / Patrol | クリティカルパス |
| **パフォーマンステスト** | Flutter DevTools | 起動時間<2秒 |

### 4.2 テストシナリオ

#### シナリオ1: 新規記事作成→保存→同期
```gherkin
Feature: 新規記事作成

  Scenario: オンライン環境で新規記事作成
    Given アプリを起動している
    And ネットワーク接続がある
    When 「新規記事」ボタンをタップする
    And タイトルに「テスト記事」と入力する
    And 本文に「# 見出し」と入力する
    And 「保存」ボタンをタップする
    Then 記事が保存される
    And コミットが作成される
    And リモートにプッシュされる
    And 「同期完了」通知が表示される
```

#### シナリオ2: オフライン編集→オンライン復帰→同期
```gherkin
Feature: オフライン編集

  Scenario: オフライン時の編集とオンライン復帰後の同期
    Given アプリを起動している
    And ネットワーク接続がない
    When 記事を選択する
    And 本文を編集する
    And 「保存」ボタンをタップする
    Then ローカルに保存される
    And 同期ステータスが「未同期」になる

    When ネットワーク接続が復帰する
    Then バックグラウンド同期が開始される
    And リモートにプッシュされる
    And 同期ステータスが「同期済み」になる
```

---

## 5. リリース計画

### 5.1 ベータテスト

#### Week 16-17: クローズドベータ
- **対象**: 社内メンバー5名
- **配布**: TestFlight (iOS) / Internal Testing (Android)
- **フィードバック収集**: Google Forms
- **期間**: 2週間

#### Week 18: パブリックベータ
- **対象**: 希望者50名（Twitter募集）
- **配布**: TestFlight / Open Testing
- **期間**: 1週間

### 5.2 リリース手順

#### iOS App Store
```bash
# 1. ビルド
flutter build ios --release

# 2. Xcode でアーカイブ
open ios/Runner.xcworkspace

# 3. App Store Connect にアップロード
# Xcode → Product → Archive → Distribute App

# 4. レビュー申請
# App Store Connect でアプリ情報入力
```

#### Google Play Store
```bash
# 1. ビルド
flutter build appbundle --release

# 2. Google Play Console にアップロード
# Production トラックに配布

# 3. レビュー申請
```

### 5.3 ローンチ日程

| 日付 | マイルストーン |
|------|--------------|
| **Week 18** | パブリックベータ開始 |
| **Week 19** | バグ修正、最終調整 |
| **Week 20** | リリース候補版完成 |
| **Week 21** | ストア審査申請 |
| **Week 22** | 🚀 **正式リリース** |

---

## 6. リスク管理

### 6.1 技術リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| **libgit2統合の複雑さ** | 高 | 早期PoC実施、代替案（HTTP API）検討 |
| **パフォーマンス問題** | 中 | プロファイリング、最適化スプリント確保 |
| **プラットフォーム差異** | 中 | iOS/Android並行テスト、条件分岐 |
| **Git競合解決の複雑さ** | 高 | シンプルなマージUIから開始 |

### 6.2 スケジュールリスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| **機能追加による遅延** | 高 | MVP機能を明確化、Phase分割 |
| **バグ修正の長期化** | 中 | テストカバレッジ80%維持 |
| **ストア審査リジェクト** | 中 | ガイドライン事前確認、予備日確保 |

---

## 7. 成功指標（KPI）

### 7.1 開発KPI

| 指標 | 目標 |
|------|------|
| **コードカバレッジ** | 80%以上 |
| **バグ解決率** | 90%以上（リリース時） |
| **アプリサイズ** | 50MB以下 |
| **起動時間** | 2秒以内 |

### 7.2 ビジネスKPI（リリース後）

| 指標 | 目標（3ヶ月後） |
|------|----------------|
| **ダウンロード数** | 1,000件 |
| **DAU（日次アクティブ）** | 100名 |
| **記事投稿数** | 500記事 |
| **App Store評価** | ★4.5以上 |

---

## 8. 次のステップ

### v2.0: コラボレーション機能（2026 Q4）
- [ ] リアルタイム共同編集（CRDT）
- [ ] コメント・レビュー機能
- [ ] 変更履歴可視化
- [ ] チーム管理

### v3.0: AI統合（2027 Q2）
- [ ] AI校正（文法・表現チェック）
- [ ] タイトル提案
- [ ] SEO最適化提案
- [ ] 翻訳機能

---

## 9. 参考資料

### 9.1 技術ドキュメント
- [Flutter Documentation](https://flutter.dev/docs)
- [Riverpod Documentation](https://riverpod.dev/)
- [libgit2 API Reference](https://libgit2.org/libgit2/)
- [Isar Database](https://isar.dev/)

### 9.2 デザインリファレンス
- [Material Design 3](https://m3.material.io/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [iA Writer for Mobile](https://ia.net/writer)

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0.0 | 2026-01-21 | 初版作成 |
