# Fokus. Mobile (iOS) - モバイル版MDXエディタ 要件定義書

**バージョン**: 2.0.0
**最終更新**: 2026-01-21
**対象**: iOS 15+（iPhone専用）
**技術スタック**: React Native + Expo

---

## 1. プロジェクト概要

### 1.1 目的
Astroブログ（Fokus.）のMDXファイルを**iPhone/iPad から**編集・公開できるネイティブアプリを開発する。デスクトップ版のReactコードベースを**最大限再利用**しつつ、**iOSネイティブの洗練されたUX**を提供する。

### 1.2 コンセプト
- **フォーカス・モード**: iPhoneの小画面で集中執筆を促進
- **ネイティブ・ファースト**: SF Symbols、ネイティブタブ、Haptic Feedbackなどを活用
- **クイック編集**: 通勤・移動中の5分間で記事の修正やアイデアメモ
- **オフライン・ファースト**: ネット環境に関係なく執筆可能
- **コード再利用**: デスクトップ版のReactコンポーネント・ロジックを最大活用

### 1.3 戦略的決定

#### なぜiOS専用か
1. **開発速度**: iOS 1プラットフォームに集中し、6週間でMVPリリース
2. **ターゲット**: ブロガー・ライターはiPhoneユーザーが多い
3. **品質重視**: Android対応でUI品質が低下するリスクを回避
4. **Apple生態系**: Shortcuts、Widgets、Handoffなどの統合が容易

#### なぜExpoか
1. **既存資産活用**: デスクトップ版のReact/TypeScriptコードを再利用
2. **開発体験**: Hot Reload、OTA更新、Expo Goでの即座テスト
3. **ネイティブ統合**: Expo Modulesで純正iOS機能に簡単アクセス
4. **保守性**: アップデート容易、破壊的変更が少ない

### 1.4 対象ユーザー
- デスクトップ版の既存ユーザー（iPhone所有者）
- 外出先から記事を修正したいブロガー
- iPhoneでメモをブログに変換したいライター

---

## 2. 機能要件

### 2.1 コア機能（デスクトップ版と同等）

| 機能 | 優先度 | iOS対応 | 実装方法 |
|------|--------|---------|---------|
| **Frontmatter編集** | 必須 | ○ | ネイティブフォーム（DateTimePicker, Switch） |
| **本文エディタ** | 必須 | ○ | TextInput + Markdownハイライト |
| **リアルタイムプレビュー** | 必須 | ○ | react-native-webview |
| **記事一覧** | 必須 | ○ | FlashList（高速スクロール） |
| **画像挿入** | 高 | ○ | expo-image-picker（カメラ・ギャラリー） |
| **タグ管理** | 高 | ○ | カスタムチップUI |
| **Git統合** | 必須 | ○ | isomorphic-git |
| **ダークモード** | 必須 | ○ | useColorScheme（システム連動） |

### 2.2 iOS専用機能

| 機能 | 優先度 | 説明 |
|------|--------|------|
| **オフライン編集** | 必須 | AsyncStorage + Git local commits |
| **SF Symbols** | 高 | expo-symbols（5,000+のネイティブアイコン） |
| **ネイティブタブバー** | 高 | Expo Router Native Tabs（iOS 26準拠） |
| **Haptic Feedback** | 高 | expo-haptics（保存時、エラー時） |
| **音声入力** | 中 | expo-speech（音声→テキスト） |
| **ウィジェット** | 中 | @bacons/apple-targets（下書き数表示） |
| **Siri Shortcuts** | 低 | expo-intents（「記事を作成」） |
| **iCloud同期** | 低 | expo-file-system（設定バックアップ） |
| **Handoff** | 低 | NSUserActivity（Mac版と連携） |

### 2.3 Git操作（出先からコミット）

#### 認証方式
1. **Personal Access Token（推奨）**
   - GitHubやGitLabのPATをSecureStoreに保存
   - 有効期限管理、自動更新

2. **SSH鍵認証**
   - expo-crypto で鍵ペア生成
   - SecureStore に秘密鍵保存

#### Git操作フロー
```
[編集] → [保存] → [ローカルコミット] → [プッシュ]
                       ↓
                  [オフライン時はキュー]
                       ↓
                  [ネット復帰で自動プッシュ]
```

#### オフライン対応
- **isomorphic-git**: 純粋JavaScriptのGit実装（iOS互換）
- **ローカルコミット**: オフライン時はローカルのみ
- **同期キュー**: AsyncStorageにキュー保存、ネット復帰で処理
- **競合解決**: プッシュ失敗時にプル→マージ→再プッシュ

---

## 3. 技術選定

### 3.1 推奨構成：**Expo + React Native**

| レイヤー | 技術 | 理由 |
|----------|------|------|
| **フレームワーク** | Expo SDK 52+ | OTA更新、豊富なネイティブモジュール |
| **ナビゲーション** | Expo Router | ファイルベース、ネイティブタブ対応 |
| **Git操作** | isomorphic-git | 純粋JS、iOS互換、コンパクト |
| **認証** | expo-secure-store | Keychain統合 |
| **エディタ** | TextInput + カスタムハイライト | ネイティブキーボード |
| **ストレージ** | AsyncStorage | 軽量KVS |
| **状態管理** | Zustand | シンプル、デスクトップ版と統一 |
| **スタイリング** | NativeWind | Tailwind風、デスクトップ版と統一 |
| **アイコン** | expo-symbols | SF Symbols 6 |

### 3.2 デスクトップ版との共通化

```
shared/
├── types/
│   ├── article.ts      # 記事型定義（共通）
│   └── frontmatter.ts  # Frontmatter型定義（共通）
├── utils/
│   ├── yaml.ts         # YAML解析（共通）
│   └── markdown.ts     # Markdown処理（共通）
└── hooks/
    ├── useArticles.ts  # 記事取得ロジック（共通）
    └── useGit.ts       # Git操作ロジック（共通）

// モバイル専用
mobile/
├── app/               # Expo Router（ファイルベース）
│   ├── (tabs)/
│   │   ├── index.tsx  # 記事一覧
│   │   ├── editor.tsx # エディタ
│   │   └── settings.tsx
│   └── _layout.tsx
├── components/        # モバイル専用UI
└── ios/               # iOS native code
```

---

## 4. UI/UXデザイン

### 4.1 iOS Human Interface Guidelines準拠

#### ナビゲーション
- **Native Tabs**: 画面下部タブバー（3タブ）
  - 📝 記事
  - 📂 一覧
  - ⚙️ 設定
- **モーダル**: 新規記事作成、設定詳細
- **スワイプバック**: 標準のバックジェスチャー

#### タイポグラフィ
- **SF Pro**: システムフォント
- **Dynamic Type**: アクセシビリティ対応
- **Noto Sans JP**: 日本語フォールバック

#### カラー
```javascript
// デスクトップ版準拠 + iOS Dynamic Colors
const colors = {
  light: {
    background: '#faf8f5',
    foreground: '#3d3d3d',
    accent: '#7b6d5d',
    // iOS System Colors
    systemBackground: 'rgb(242, 242, 247)',  // iOS標準
    secondarySystemBackground: 'rgb(255, 255, 255)',
  },
  dark: {
    background: '#1a1a1a',
    foreground: '#e0dcd5',
    accent: '#c9a87c',
    // iOS System Colors
    systemBackground: 'rgb(0, 0, 0)',
    secondarySystemBackground: 'rgb(28, 28, 30)',
  },
};
```

### 4.2 ジェスチャー（react-native-gesture-handler）
- **左スワイプ**: エディタ → プレビュー
- **右スワイプ**: プレビュー → エディタ
- **プルトゥリフレッシュ**: 記事一覧更新
- **長押し**: 記事メニュー表示（編集・削除）

### 4.3 Haptic Feedback
```javascript
import * as Haptics from 'expo-haptics';

// 保存成功
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// エラー
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// 選択
Haptics.selectionAsync();
```

---

## 5. データフロー

### 5.1 同期アーキテクチャ

```
[iOS App]                   [GitHub]
    ↓                           ↑
[AsyncStorage] ←→ [isomorphic-git] → [Remote]
    ↓                           ↓
[File System]              [PAT Auth]
```

### 5.2 オフライン編集フロー

```
1. [記事編集] → AsyncStorageに保存
2. [保存ボタン] → MDXファイル生成 → isomorphic-git commit
3. [ネット検出] → 自動プッシュ試行
4. [競合検出] → 通知 → マージUI表示
5. [マージ完了] → 再プッシュ → 成功通知
```

---

## 6. 非機能要件

### 6.1 パフォーマンス

| 項目 | 目標 | 計測方法 |
|------|------|----------|
| アプリ起動時間 | < 1.5秒 | Instruments |
| 記事一覧表示 | < 300ms | FlashList最適化 |
| エディタ入力遅延 | < 16ms | 60fps維持 |
| Git プッシュ | < 3秒 | isomorphic-git |

### 6.2 セキュリティ

- **認証情報**: expo-secure-store（Keychain）
- **通信**: HTTPS強制
- **ローカルストレージ**: 平文（機密情報はSecureStore）
- **Face ID/Touch ID**: expo-local-authentication

### 6.3 アクセシビリティ

- **Dynamic Type**: 全テキスト対応
- **VoiceOver**: 全画面対応
- **ハイコントラスト**: UIElementsColor使用
- **Reduce Motion**: アニメーション無効化

---

## 7. 開発フェーズ

### Phase 1: MVP - 6週間

#### Week 1-2: プロジェクトセットアップ
- [ ] Expo プロジェクト作成（`npx create-expo-app`）
- [ ] 依存ライブラリ導入
  - expo-router, expo-symbols, expo-secure-store
  - isomorphic-git, nativewind, zustand
- [ ] デスクトップ版からコード共通化
  - types/, utils/, hooks/ を共有
- [ ] Expo Go でテスト環境構築

#### Week 3-4: コア機能実装
- [ ] 記事一覧画面（FlashList）
- [ ] Frontmatterエディタ（ネイティブフォーム）
- [ ] Markdownエディタ（TextInput）
- [ ] ローカルストレージ（AsyncStorage）
- [ ] Git認証（PAT）

#### Week 5-6: Git統合・リリース準備
- [ ] isomorphic-git統合
- [ ] コミット・プッシュ機能
- [ ] オフライン対応
- [ ] TestFlight配布
- [ ] ベータテスト

### Phase 2: エンハンスメント - 4週間
- [ ] プレビュー機能
- [ ] 画像挿入（expo-image-picker）
- [ ] SF Symbolsアイコン統合
- [ ] ネイティブタブバー
- [ ] Haptic Feedback

### Phase 3: 高度な機能 - 2週間
- [ ] ウィジェット
- [ ] Siri Shortcuts
- [ ] iCloud同期（設定）
- [ ] 音声入力

---

## 8. 技術的課題と解決策

### 8.1 Git操作のiOS実装

#### 課題
- iOS ではネイティブGitクライアントが使えない
- libgit2のバインディングが複雑

#### 解決策
**isomorphic-git** を使用
- 純粋JavaScriptのGit実装
- iOS/Android/Web全対応
- ファイルシステムアクセスのみ必要

```javascript
import git from 'isomorphic-git';
import * as FileSystem from 'expo-file-system';

// コミット
await git.commit({
  fs: FileSystem,
  dir: repoPath,
  message: 'Update article',
  author: {
    name: 'Fokus Mobile',
    email: 'mobile@fokus.dev',
  },
});

// プッシュ
await git.push({
  fs: FileSystem,
  http,
  dir: repoPath,
  remote: 'origin',
  ref: 'main',
  onAuth: () => ({ username: 'token', password: pat }),
});
```

### 8.2 エディタパフォーマンス

#### 課題
- TextInputは大量テキストで遅延
- Markdownハイライトのコスト

#### 解決策
1. **react-native-code-editor** または **react-native-syntax-highlighter**
2. **デバウンス処理**: 300ms後にハイライト更新
3. **仮想化**: 長文は可視範囲のみハイライト

---

## 9. リリース計画

### 9.1 TestFlightベータ

#### Week 5: クローズドベータ
- **対象**: 社内5名
- **配布**: TestFlight
- **期間**: 1週間

#### Week 6: パブリックベータ
- **対象**: Twitter募集30名
- **配布**: TestFlight
- **期間**: 1週間

### 9.2 App Storeリリース

**Week 7**: 正式リリース
- App Store Connect にビルド提出
- スクリーンショット、説明文準備
- レビュー期間: 1-3日

---

## 10. 成功指標（KPI）

### 10.1 開発KPI

| 指標 | 目標 |
|------|------|
| **アプリサイズ** | < 30MB |
| **起動時間** | < 1.5秒 |
| **TestFlight評価** | ★4.5以上 |

### 10.2 ビジネスKPI（3ヶ月後）

| 指標 | 目標 |
|------|------|
| **ダウンロード数** | 500件 |
| **DAU** | 50名 |
| **記事投稿数** | 300記事 |
| **App Store評価** | ★4.5以上 |

---

## 11. 今後の拡張性

### v2.0: Android対応（2026 Q3）
- isomorphic-gitは既にAndroid対応
- UIをMaterial Designに対応

### v3.0: AI統合（2026 Q4）
- Claude API統合（校正、タイトル提案）
- 音声入力 → AI整形

### v4.0: コラボレーション（2027 Q1）
- リアルタイム共同編集（Yjs + Firestore）

---

## 12. 参考資料

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [isomorphic-git](https://isomorphic-git.org/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [iA Writer for iOS](https://ia.net/writer) - UX参考

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 2.0.0 | 2026-01-21 | iOS + Expo専用に全面改訂 |
| 1.0.0 | 2026-01-21 | 初版作成（Flutter版） |
