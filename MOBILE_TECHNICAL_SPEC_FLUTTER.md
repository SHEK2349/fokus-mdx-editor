# Fokus. Mobile - 技術仕様書

**バージョン**: 1.0.0
**最終更新**: 2026-01-21
**技術スタック**: Flutter 3.x + Dart 3.x

---

## 1. アーキテクチャ概要

### 1.1 システム構成図

```
┌──────────────────────────────────────────────────┐
│                 Fokus Mobile App                 │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────┐│
│  │ UI Layer    │  │ Logic Layer  │  │ Data    ││
│  │ (Flutter)   │→│ (Riverpod)   │→│ Layer   ││
│  └─────────────┘  └──────────────┘  └─────────┘│
│                                                  │
├──────────────────────────────────────────────────┤
│                 Platform Services                │
├──────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ libgit2  │  │ Secure   │  │ File System  │  │
│  │ (Rust)   │  │ Storage  │  │ (Platform)   │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
└──────────────────────────────────────────────────┘
         ↓                ↓                ↓
┌──────────────────────────────────────────────────┐
│        GitHub / GitLab / Gitea (Remote)          │
└──────────────────────────────────────────────────┘
```

### 1.2 レイヤー構成

#### Presentation Layer (UI)
- **責務**: ユーザー操作、画面表示
- **技術**: Flutter Widgets, Material/Cupertino Design
- **パターン**: MVVM (ViewModel = Riverpod Notifier)

#### Domain Layer (Business Logic)
- **責務**: ビジネスルール、状態管理
- **技術**: Riverpod, Freezed (Immutable Data Classes)
- **パターン**: Repository Pattern, Use Case Pattern

#### Data Layer
- **責務**: データ永続化、Git操作、API通信
- **技術**: Isar DB, libgit2 FFI, HTTP Client
- **パターン**: Repository Pattern, DTO Mapping

---

## 2. 技術選定詳細

### 2.1 コアライブラリ

| ライブラリ | バージョン | 用途 | 選定理由 |
|-----------|-----------|------|---------|
| **flutter** | ^3.19.0 | UIフレームワーク | 高速、クロスプラットフォーム |
| **riverpod** | ^2.5.0 | 状態管理 | 型安全、テスタブル |
| **freezed** | ^2.4.0 | コード生成 | Immutableデータクラス |
| **isar** | ^3.1.0 | ローカルDB | 高速、NoSQL |
| **libgit2_dart** | ^1.0.0 | Git操作 | ネイティブ、フル機能 |
| **flutter_secure_storage** | ^9.0.0 | 認証情報保存 | OS標準暗号化 |
| **flutter_quill** | ^9.0.0 | リッチエディタ | Markdown対応 |

### 2.2 Git操作ライブラリ

#### libgit2_dart（推奨）

```dart
dependencies:
  libgit2_dart: ^1.0.0

// Rust FFI経由でlibgit2を呼び出し
import 'package:libgit2_dart/libgit2_dart.dart';

// リポジトリオープン
final repo = Repository.open('/path/to/repo');

// コミット
repo.add(['article.mdx']);
repo.commit('Update article', author: Signature(...));

// プッシュ
repo.push('origin', 'main', credentials: Credentials.sshKey(...));
```

**メリット**:
- ネイティブパフォーマンス
- フル機能（clone, fetch, merge, rebase）
- 安定性（libgit2は成熟したライブラリ）

**デメリット**:
- バイナリサイズ増加（約5MB）
- プラットフォーム依存

#### 代替案: Git HTTP API

```dart
// GitHub API経由でコミット（軽量）
import 'package:http/http.dart' as http;

Future<void> commitViaAPI(String content) async {
  final response = await http.put(
    Uri.parse('https://api.github.com/repos/user/blog/contents/article.mdx'),
    headers: {
      'Authorization': 'token $githubToken',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'message': 'Update article',
      'content': base64Encode(utf8.encode(content)),
      'sha': fileSha,  // 既存ファイルのSHA
    }),
  );
}
```

**メリット**:
- 軽量（HTTP通信のみ）
- プラットフォーム非依存

**デメリット**:
- 機能制限（GitHub依存、複雑なマージ不可）
- レート制限

---

## 3. データモデル

### 3.1 エンティティ定義

#### Article (記事)

```dart
@freezed
class Article with _$Article {
  const factory Article({
    required String id,  // UUID
    required String slug,
    required Frontmatter frontmatter,
    required String content,
    required String filepath,
    required DateTime localModifiedAt,
    required DateTime remoteModifiedAt,
    @Default(SyncStatus.synced) SyncStatus syncStatus,
    String? conflictSha,  // 競合時のリモートSHA
  }) = _Article;

  factory Article.fromJson(Map<String, dynamic> json) =>
      _$ArticleFromJson(json);
}

enum SyncStatus {
  synced,      // 同期済み
  modified,    // ローカル変更あり
  syncing,     // 同期中
  conflict,    // 競合検出
  error,       // エラー
}
```

#### Frontmatter (メタデータ)

```dart
@freezed
class Frontmatter with _$Frontmatter {
  const factory Frontmatter({
    required String title,
    required DateTime pubDatetime,
    required String description,
    DateTime? modDatetime,
    @Default(false) bool featured,
    @Default(true) bool draft,
    @Default('SHEK') String author,
    @Default([]) List<String> tags,
    String? dek,
    String? ogImage,
    String? canonicalURL,
    @Default(false) bool hideEditPost,
    @Default('Asia/Tokyo') String timezone,
  }) = _Frontmatter;

  factory Frontmatter.fromYaml(YamlMap yaml) {
    // YAML解析ロジック
  }

  YamlMap toYaml() {
    // YAML生成ロジック
  }
}
```

#### Repository Configuration

```dart
@freezed
class RepositoryConfig with _$RepositoryConfig {
  const factory RepositoryConfig({
    required String remoteUrl,
    required String articlesPath,
    required String branch,
    required AuthMethod authMethod,
    required Credentials credentials,
    @Default(true) bool autoSync,
    @Default(true) bool wifiOnly,
  }) = _RepositoryConfig;
}

enum AuthMethod {
  pat,     // Personal Access Token
  ssh,     // SSH Key
  oauth,   // OAuth (GitHub App)
}

@freezed
class Credentials with _$Credentials {
  const factory Credentials.pat({
    required String token,
    required DateTime expiresAt,
  }) = PatCredentials;

  const factory Credentials.ssh({
    required String publicKey,
    required String privateKey,
    String? passphrase,
  }) = SshCredentials;

  const factory Credentials.oauth({
    required String accessToken,
    required String refreshToken,
    required DateTime expiresAt,
  }) = OAuthCredentials;
}
```

### 3.2 データベーススキーマ (Isar)

```dart
@collection
class ArticleEntity {
  Id id = Isar.autoIncrement;

  @Index(unique: true)
  String slug;

  String frontmatterJson;  // Frontmatter を JSON シリアライズ
  String content;
  String filepath;

  @Index()
  DateTime localModifiedAt;

  DateTime remoteModifiedAt;

  @enumerated
  SyncStatus syncStatus;

  String? conflictSha;

  // 検索用インデックス
  @Index(type: IndexType.value, caseSensitive: false)
  List<String> tags;

  @Index(type: IndexType.value, caseSensitive: false)
  String title;
}

// リポジトリ設定
@collection
class RepositoryConfigEntity {
  Id id = 0;  // 単一レコード

  String remoteUrl;
  String articlesPath;
  String branch;

  @enumerated
  AuthMethod authMethod;

  String credentialsJson;  // 暗号化してJSON保存

  bool autoSync;
  bool wifiOnly;
}
```

---

## 4. Git統合実装

### 4.1 認証フロー

#### Personal Access Token (PAT)

```dart
class GitAuthService {
  final FlutterSecureStorage _storage;

  // PAT保存
  Future<void> savePAT(String token) async {
    await _storage.write(key: 'github_pat', value: token);

    // 検証
    final isValid = await validatePAT(token);
    if (!isValid) throw Exception('Invalid PAT');
  }

  // PAT検証
  Future<bool> validatePAT(String token) async {
    final response = await http.get(
      Uri.parse('https://api.github.com/user'),
      headers: {'Authorization': 'token $token'},
    );
    return response.statusCode == 200;
  }

  // PAT取得
  Future<String?> getPAT() async {
    return await _storage.read(key: 'github_pat');
  }
}
```

#### SSH Key認証

```dart
class GitSSHService {
  // SSH鍵ペア生成
  Future<SshKeyPair> generateKeyPair() async {
    // libsodium / pointycastle を使用
    final keyPair = await RsaKeyPairGenerator().generate();

    return SshKeyPair(
      publicKey: keyPair.publicKey.toPem(),
      privateKey: keyPair.privateKey.toPem(),
    );
  }

  // SSH鍵保存
  Future<void> saveKeyPair(SshKeyPair keyPair, String passphrase) async {
    // 秘密鍵を暗号化して保存
    final encrypted = await _encrypt(keyPair.privateKey, passphrase);
    await _storage.write(key: 'ssh_private_key', value: encrypted);
    await _storage.write(key: 'ssh_public_key', value: keyPair.publicKey);
  }
}
```

### 4.2 Git操作実装

#### リポジトリクローン

```dart
class GitRepository {
  final String localPath;
  late Repository _repo;

  // 初回クローン（Shallow Clone）
  Future<void> clone(String remoteUrl, Credentials credentials) async {
    await Repository.clone(
      url: remoteUrl,
      localPath: localPath,
      cloneOptions: CloneOptions(
        bare: false,
        checkout: true,
        fetchOptions: FetchOptions(
          depth: 1,  // Shallow Clone
          prune: true,
        ),
      ),
      credentials: _toLibgit2Credentials(credentials),
    );

    _repo = Repository.open(localPath);

    // Sparse Checkout（記事ディレクトリのみ）
    await _configureSparseCheckout();
  }

  // Sparse Checkout設定
  Future<void> _configureSparseCheckout() async {
    final configFile = File('$localPath/.git/info/sparse-checkout');
    await configFile.writeAsString('src/data/blog/*\n');

    await _repo.config.set('core.sparseCheckout', 'true');
  }
}
```

#### コミット・プッシュ

```dart
class GitRepository {
  // 記事保存 → コミット
  Future<void> commitArticle(Article article, String message) async {
    // ファイル書き込み
    final file = File('$localPath/${article.filepath}');
    await file.writeAsString(article.toMDX());

    // ステージング
    final index = _repo.index;
    index.add(article.filepath);
    index.write();

    // コミット
    final tree = await index.writeTree();
    final signature = Signature(
      name: 'Fokus Mobile',
      email: 'mobile@fokus.dev',
      time: DateTime.now(),
    );

    await _repo.commit(
      message: message,
      tree: tree,
      parents: [_repo.head.target],
      author: signature,
      committer: signature,
    );
  }

  // プッシュ
  Future<PushResult> push(Credentials credentials) async {
    try {
      await _repo.remotes.push(
        'origin',
        ['refs/heads/${_repo.head.name}'],
        credentials: _toLibgit2Credentials(credentials),
      );

      return PushResult.success();
    } on GitException catch (e) {
      if (e.code == GitError.NonFastForward) {
        // 競合検出
        return PushResult.conflict();
      }
      return PushResult.error(e.message);
    }
  }
}

@freezed
class PushResult with _$PushResult {
  const factory PushResult.success() = PushSuccess;
  const factory PushResult.conflict() = PushConflict;
  const factory PushResult.error(String message) = PushError;
}
```

#### 競合解決

```dart
class GitConflictResolver {
  // プル + マージ
  Future<MergeResult> pullAndMerge(GitRepository repo) async {
    // フェッチ
    await repo.fetch('origin');

    // マージ
    final mergeResult = await repo.merge('origin/${repo.branch}');

    if (mergeResult.hasConflicts) {
      return MergeResult.conflict(
        conflicts: mergeResult.conflicts.map((c) => c.path).toList(),
      );
    }

    return MergeResult.success();
  }

  // 3-way マージUI用データ取得
  Future<ConflictData> getConflictData(
    GitRepository repo,
    String filepath,
  ) async {
    final localContent = await File('${repo.localPath}/$filepath').readAsString();
    final remoteContent = await repo.getRemoteFileContent(filepath);
    final baseContent = await repo.getMergeBaseContent(filepath);

    return ConflictData(
      local: localContent,
      remote: remoteContent,
      base: baseContent,
    );
  }

  // マージ解決後のコミット
  Future<void> resolveConflict(
    GitRepository repo,
    String filepath,
    String resolvedContent,
  ) async {
    await File('${repo.localPath}/$filepath').writeAsString(resolvedContent);
    await repo.commitArticle(
      Article.fromFile(filepath),
      'Merge conflict resolved',
    );
  }
}
```

### 4.3 オフライン同期

#### 同期エンジン

```dart
class SyncEngine {
  final GitRepository _repo;
  final IsarDatabase _db;
  final ConnectivityService _connectivity;

  // バックグラウンド同期（定期実行）
  Future<void> syncInBackground() async {
    if (!await _shouldSync()) return;

    try {
      // ローカル変更をコミット
      final modifiedArticles = await _db.getModifiedArticles();
      for (final article in modifiedArticles) {
        await _repo.commitArticle(article, 'Auto-commit from mobile');
      }

      // プッシュ
      final pushResult = await _repo.push(_credentials);

      pushResult.when(
        success: () async {
          // 同期完了、DBステータス更新
          await _db.updateSyncStatus(modifiedArticles, SyncStatus.synced);
          _showNotification('同期完了', '${modifiedArticles.length}件の記事を更新');
        },
        conflict: () async {
          // 競合検出、通知
          _showNotification('競合検出', 'タップして解決してください', isError: true);
        },
        error: (message) async {
          // エラー、リトライキューに追加
          await _db.addToRetryQueue(modifiedArticles);
        },
      );
    } catch (e) {
      logger.error('Sync failed: $e');
    }
  }

  // 同期条件チェック
  Future<bool> _shouldSync() async {
    // Wi-Fi接続確認
    if (_config.wifiOnly) {
      final connectionType = await _connectivity.getConnectionType();
      if (connectionType != ConnectionType.wifi) return false;
    }

    // バッテリー残量確認
    final batteryLevel = await Battery().batteryLevel;
    if (batteryLevel < 20) return false;

    // 変更あり確認
    final hasChanges = await _db.hasModifiedArticles();
    return hasChanges;
  }
}
```

#### WorkManager (Android) / BackgroundTasks (iOS)

```dart
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    final syncEngine = await DependencyInjection.get<SyncEngine>();
    await syncEngine.syncInBackground();
    return true;
  });
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // バックグラウンドタスク登録
  Workmanager().initialize(callbackDispatcher);
  Workmanager().registerPeriodicTask(
    'sync_task',
    'sync',
    frequency: Duration(hours: 1),  // 1時間ごと
    constraints: Constraints(
      networkType: NetworkType.connected,
      requiresBatteryNotLow: true,
    ),
  );

  runApp(MyApp());
}
```

---

## 5. 状態管理 (Riverpod)

### 5.1 Provider構成

```dart
// リポジトリ
final gitRepositoryProvider = Provider<GitRepository>((ref) {
  return GitRepository(localPath: '/path/to/repo');
});

// 記事一覧
final articlesProvider = FutureProvider<List<Article>>((ref) async {
  final db = ref.watch(databaseProvider);
  return await db.getAllArticles();
});

// 現在の記事
final currentArticleProvider = StateProvider<Article?>((ref) => null);

// 同期ステータス
final syncStatusProvider = StreamProvider<SyncStatus>((ref) {
  final syncEngine = ref.watch(syncEngineProvider);
  return syncEngine.statusStream;
});

// エディタ状態
final editorStateProvider = StateNotifierProvider<EditorNotifier, EditorState>(
  (ref) => EditorNotifier(),
);

class EditorState {
  final String content;
  final int cursorPosition;
  final bool hasUnsavedChanges;

  EditorState({
    required this.content,
    required this.cursorPosition,
    required this.hasUnsavedChanges,
  });
}
```

### 5.2 Use Case実装

```dart
// 記事保存ユースケース
class SaveArticleUseCase {
  final GitRepository _repo;
  final IsarDatabase _db;

  Future<void> execute(Article article) async {
    // ローカルDB保存
    await _db.saveArticle(article.copyWith(
      localModifiedAt: DateTime.now(),
      syncStatus: SyncStatus.modified,
    ));

    // オンラインの場合は即座にコミット・プッシュ
    if (await _connectivity.isOnline()) {
      await _repo.commitArticle(article, 'Update ${article.slug}');
      final result = await _repo.push(_credentials);

      result.when(
        success: () async {
          await _db.updateSyncStatus([article], SyncStatus.synced);
        },
        conflict: () => throw ConflictException(),
        error: (msg) => throw GitException(msg),
      );
    }
  }
}

// 使用例（ViewModel）
class ArticleEditorNotifier extends StateNotifier<AsyncValue<Article>> {
  final SaveArticleUseCase _saveArticleUseCase;

  Future<void> saveArticle(Article article) async {
    state = const AsyncValue.loading();

    try {
      await _saveArticleUseCase.execute(article);
      state = AsyncValue.data(article);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}
```

---

## 6. パフォーマンス最適化

### 6.1 エディタ最適化

```dart
class OptimizedMarkdownEditor extends StatefulWidget {
  @override
  _OptimizedMarkdownEditorState createState() =>
      _OptimizedMarkdownEditorState();
}

class _OptimizedMarkdownEditorState extends State<OptimizedMarkdownEditor> {
  final TextEditingController _controller = TextEditingController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    // デバウンス処理（300ms後にシンタックスハイライト更新）
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      setState(() {
        // ハイライト更新
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      maxLines: null,
      // パフォーマンス設定
      enableInteractiveSelection: true,
      toolbarOptions: const ToolbarOptions(
        copy: true,
        cut: true,
        paste: true,
        selectAll: true,
      ),
    );
  }
}
```

### 6.2 画像最適化

```dart
class ImageOptimizer {
  // 画像リサイズ（アップロード前）
  Future<File> optimizeImage(File image) async {
    final bytes = await image.readAsBytes();
    final img = decodeImage(bytes)!;

    // 幅1200pxにリサイズ
    final resized = copyResize(img, width: 1200);

    // WebP変換（iOS 14+, Android 4.2.1+）
    final webp = encodeWebP(resized, quality: 85);

    final optimizedFile = File('${image.parent.path}/optimized.webp');
    await optimizedFile.writeAsBytes(webp);

    return optimizedFile;
  }
}
```

---

## 7. セキュリティ

### 7.1 認証情報の暗号化

```dart
class SecureCredentialsStorage {
  final FlutterSecureStorage _storage;

  // 暗号化して保存
  Future<void> saveCredentials(Credentials credentials) async {
    final json = jsonEncode(credentials.toJson());
    await _storage.write(
      key: 'credentials',
      value: json,
      iOptions: const IOSOptions(
        accessibility: KeychainAccessibility.first_unlock,
      ),
      aOptions: const AndroidOptions(
        encryptedSharedPreferences: true,
      ),
    );
  }

  // 復号して取得
  Future<Credentials?> getCredentials() async {
    final json = await _storage.read(key: 'credentials');
    if (json == null) return null;

    return Credentials.fromJson(jsonDecode(json));
  }
}
```

### 7.2 バイオメトリクス認証

```dart
class BiometricAuth {
  final LocalAuthentication _auth = LocalAuthentication();

  // Face ID / Touch ID / 指紋認証
  Future<bool> authenticate() async {
    final canAuthenticate = await _auth.canCheckBiometrics;
    if (!canAuthenticate) return false;

    try {
      return await _auth.authenticate(
        localizedReason: 'Fokus Editorにアクセスするには認証が必要です',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );
    } catch (e) {
      return false;
    }
  }
}
```

---

## 8. テスト戦略

### 8.1 単体テスト

```dart
void main() {
  group('GitRepository', () {
    late GitRepository repo;
    late MockCredentials mockCredentials;

    setUp(() {
      repo = GitRepository(localPath: '/tmp/test_repo');
      mockCredentials = MockCredentials();
    });

    test('should commit article successfully', () async {
      final article = Article(
        id: '1',
        slug: 'test-article',
        frontmatter: Frontmatter(
          title: 'Test',
          pubDatetime: DateTime.now(),
          description: 'Test article',
        ),
        content: '# Test Content',
        filepath: 'test.mdx',
        localModifiedAt: DateTime.now(),
        remoteModifiedAt: DateTime.now(),
      );

      await repo.commitArticle(article, 'Test commit');

      expect(repo.hasUncommittedChanges(), isFalse);
    });
  });
}
```

### 8.2 統合テスト

```dart
void main() {
  testWidgets('Article list screen shows articles', (tester) async {
    // アプリ起動
    await tester.pumpWidget(const MyApp());

    // 記事一覧タブをタップ
    await tester.tap(find.byIcon(Icons.list));
    await tester.pumpAndSettle();

    // 記事カードが表示されることを確認
    expect(find.byType(ArticleCard), findsWidgets);
  });
}
```

---

## 9. ビルド・デプロイ

### 9.1 ビルド設定

#### Android (build.gradle)
```gradle
android {
    compileSdkVersion 34

    defaultConfig {
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android.txt')
        }
    }
}
```

#### iOS (Info.plist)
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>画像挿入のためにフォトライブラリへのアクセスが必要です</string>

<key>NSCameraUsageDescription</key>
<string>写真撮影のためにカメラへのアクセスが必要です</string>

<key>LSSupportsOpeningDocumentsInPlace</key>
<true/>
```

### 9.2 CI/CD (GitHub Actions)

```yaml
name: Build and Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build_android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.19.0'
      - run: flutter pub get
      - run: flutter test
      - run: flutter build apk --release

  build_ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: flutter test
      - run: flutter build ios --release --no-codesign
```

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0.0 | 2026-01-21 | 初版作成 |
