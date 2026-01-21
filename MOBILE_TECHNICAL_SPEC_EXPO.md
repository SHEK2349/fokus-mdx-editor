# Fokus. Mobile (iOS) - 技術仕様書（Expo版）

**バージョン**: 2.0.0
**最終更新**: 2026-01-21
**技術スタック**: Expo SDK 52+ / React Native / TypeScript

---

## 1. アーキテクチャ概要

### 1.1 システム構成

```
┌─────────────────────────────────────────────┐
│           Fokus Mobile (iOS App)            │
├─────────────────────────────────────────────┤
│  Presentation Layer (React Native)          │
│  ├─ Expo Router (File-based navigation)    │
│  ├─ NativeWind (Tailwind CSS)              │
│  └─ Expo Symbols (SF Symbols)              │
├─────────────────────────────────────────────┤
│  Business Logic Layer (Shared with Desktop) │
│  ├─ Zustand (State management)             │
│  ├─ React Hooks (useArticles, useGit)      │
│  └─ Types & Utils (TypeScript)             │
├─────────────────────────────────────────────┤
│  Data Layer                                 │
│  ├─ isomorphic-git (Git operations)        │
│  ├─ AsyncStorage (Local cache)             │
│  ├─ expo-secure-store (Credentials)        │
│  └─ expo-file-system (File I/O)            │
└─────────────────────────────────────────────┘
         ↓                    ↓
┌──────────────────┐  ┌────────────────┐
│  GitHub/GitLab   │  │  iOS Keychain  │
└──────────────────┘  └────────────────┘
```

---

## 2. 技術スタック詳細

### 2.1 コアライブラリ

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| **expo** | ^52.0.0 | フレームワーク |
| **expo-router** | ^4.0.0 | ナビゲーション（ファイルベース） |
| **react-native** | 0.76+ | UIフレームワーク |
| **typescript** | ^5.0.0 | 型安全性 |
| **isomorphic-git** | ^1.27.0 | Git操作（純粋JS） |
| **@isomorphic-git/lightning-fs** | ^4.6.0 | ファイルシステム |
| **zustand** | ^4.5.0 | 状態管理（デスクトップと共通） |
| **nativewind** | ^4.0.0 | Tailwind CSS for React Native |

### 2.2 Expo Modules

| モジュール | 用途 |
|-----------|------|
| **expo-symbols** | SF Symbols 6（5,000+アイコン） |
| **expo-secure-store** | Keychain統合（PAT保存） |
| **expo-file-system** | ファイルI/O |
| **expo-haptics** | 触覚フィードバック |
| **expo-image-picker** | カメラ・ギャラリー |
| **expo-local-authentication** | Face ID / Touch ID |
| **@react-native-async-storage/async-storage** | ローカルKVS |
| **expo-crypto** | 暗号化（SSH鍵生成） |

---

## 3. プロジェクト構造

```
fokus-mobile/
├── app/                      # Expo Router (ファイルベース)
│   ├── (tabs)/
│   │   ├── _layout.tsx      # タブナビゲーション
│   │   ├── index.tsx        # 記事一覧
│   │   ├── editor/[id].tsx  # エディタ
│   │   └── settings.tsx     # 設定
│   ├── _layout.tsx          # ルートレイアウト
│   └── +not-found.tsx
│
├── components/              # モバイル専用コンポーネント
│   ├── ArticleCard.tsx
│   ├── FrontmatterForm.tsx
│   ├── MarkdownEditor.tsx
│   └── ui/
│       ├── Button.tsx
│       └── Input.tsx
│
├── shared/                  # デスクトップと共有
│   ├── types/
│   │   ├── article.ts
│   │   └── frontmatter.ts
│   ├── utils/
│   │   ├── yaml.ts
│   │   └── markdown.ts
│   └── hooks/
│       ├── useArticles.ts
│       └── useGit.ts
│
├── store/                   # Zustand stores
│   ├── articlesStore.ts
│   ├── gitStore.ts
│   └── settingsStore.ts
│
├── services/               # 外部サービス連携
│   ├── git/
│   │   ├── isomorphic-git.ts
│   │   └── auth.ts
│   └── storage/
│       ├── async-storage.ts
│       └── secure-store.ts
│
└── ios/                    # iOSネイティブコード
    └── FokusMobile/
```

---

## 4. Git統合実装

### 4.1 isomorphic-git セットアップ

```typescript
// services/git/isomorphic-git.ts
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import FS from '@isomorphic-git/lightning-fs';
import * as FileSystem from 'expo-file-system';

const fs = new FS('fokus-repo');

export class GitService {
  private dir: string;

  constructor(repoPath: string) {
    this.dir = repoPath;
  }

  // クローン（Shallow Clone）
  async clone(url: string, token: string): Promise<void> {
    await git.clone({
      fs,
      http,
      dir: this.dir,
      url,
      depth: 1,  // 最新コミットのみ
      singleBranch: true,
      onAuth: () => ({ username: token, password: 'x-oauth-basic' }),
    });
  }

  // コミット
  async commit(filepath: string, message: string): Promise<string> {
    // ファイル追加
    await git.add({ fs, dir: this.dir, filepath });

    // コミット
    const sha = await git.commit({
      fs,
      dir: this.dir,
      message,
      author: {
        name: 'Fokus Mobile',
        email: 'mobile@fokus.dev',
      },
    });

    return sha;
  }

  // プッシュ
  async push(token: string): Promise<void> {
    await git.push({
      fs,
      http,
      dir: this.dir,
      remote: 'origin',
      ref: 'main',
      onAuth: () => ({ username: token, password: 'x-oauth-basic' }),
    });
  }

  // プル
  async pull(token: string): Promise<void> {
    await git.pull({
      fs,
      http,
      dir: this.dir,
      ref: 'main',
      author: {
        name: 'Fokus Mobile',
        email: 'mobile@fokus.dev',
      },
      onAuth: () => ({ username: token, password: 'x-oauth-basic' }),
    });
  }

  // ステータス
  async status(filepath: string): Promise<string> {
    return await git.status({ fs, dir: this.dir, filepath });
  }
}
```

### 4.2 認証管理

```typescript
// services/git/auth.ts
import * as SecureStore from 'expo-secure-store';

export class GitAuthService {
  private static TOKEN_KEY = 'github_pat';

  // PAT保存
  static async savePAT(token: string): Promise<void> {
    await SecureStore.setItemAsync(this.TOKEN_KEY, token);
  }

  // PAT取得
  static async getPAT(): Promise<string | null> {
    return await SecureStore.getItemAsync(this.TOKEN_KEY);
  }

  // PAT削除
  static async deletePAT(): Promise<void> {
    await SecureStore.deleteItemAsync(this.TOKEN_KEY);
  }

  // PAT検証
  static async validatePAT(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

---

## 5. 状態管理（Zustand）

### 5.1 記事ストア

```typescript
// store/articlesStore.ts
import { create } from 'zustand';
import { Article } from '../shared/types/article';

interface ArticlesState {
  articles: Article[];
  currentArticle: Article | null;
  loading: boolean;
  
  setArticles: (articles: Article[]) => void;
  setCurrentArticle: (article: Article | null) => void;
  addArticle: (article: Article) => void;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  deleteArticle: (id: string) => void;
}

export const useArticlesStore = create<ArticlesState>((set) => ({
  articles: [],
  currentArticle: null,
  loading: false,

  setArticles: (articles) => set({ articles }),
  setCurrentArticle: (article) => set({ currentArticle: article }),
  
  addArticle: (article) => set((state) => ({
    articles: [...state.articles, article],
  })),
  
  updateArticle: (id, updates) => set((state) => ({
    articles: state.articles.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    ),
  })),
  
  deleteArticle: (id) => set((state) => ({
    articles: state.articles.filter((a) => a.id !== id),
  })),
}));
```

---

## 6. UI実装

### 6.1 Expo Router ナビゲーション

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#7b6d5d',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '記事',
          tabBarIcon: ({ color }) => (
            <SymbolView name="doc.text" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="editor/[id]"
        options={{
          title: '編集',
          tabBarIcon: ({ color }) => (
            <SymbolView name="pencil" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color }) => (
            <SymbolView name="gearshape" tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### 6.2 記事一覧画面

```tsx
// app/(tabs)/index.tsx
import { FlashList } from '@shopify/flash-list';
import { useArticlesStore } from '../../store/articlesStore';
import { ArticleCard } from '../../components/ArticleCard';

export default function ArticleListScreen() {
  const articles = useArticlesStore((state) => state.articles);

  return (
    <FlashList
      data={articles}
      renderItem={({ item }) => <ArticleCard article={item} />}
      estimatedItemSize={100}
    />
  );
}
```

### 6.3 エディタ画面

```tsx
// app/(tabs)/editor/[id].tsx
import { TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useArticlesStore } from '../../../store/articlesStore';

export default function EditorScreen() {
  const { id } = useLocalSearchParams();
  const article = useArticlesStore((state) =>
    state.articles.find((a) => a.id === id)
  );

  const [content, setContent] = useState(article?.content || '');

  return (
    <TextInput
      multiline
      value={content}
      onChangeText={setContent}
      placeholder="Markdownを入力..."
      style={{ flex: 1, padding: 16 }}
    />
  );
}
```

---

## 7. オフライン同期

### 7.1 同期エンジン

```typescript
// services/sync/syncEngine.ts
import NetInfo from '@react-native-community/netinfo';
import { GitService } from '../git/isomorphic-git';
import { GitAuthService } from '../git/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class SyncEngine {
  private git: GitService;
  private syncQueue: string[] = [];

  constructor(git: GitService) {
    this.git = git;
    this.loadSyncQueue();
    this.listenToNetworkChanges();
  }

  // ネットワーク変化を監視
  private listenToNetworkChanges() {
    NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        this.processSyncQueue();
      }
    });
  }

  // 同期キュー保存
  private async saveSyncQueue() {
    await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
  }

  // 同期キュー読み込み
  private async loadSyncQueue() {
    const queue = await AsyncStorage.getItem('sync_queue');
    this.syncQueue = queue ? JSON.parse(queue) : [];
  }

  // コミットをキューに追加
  async queueCommit(filepath: string, message: string) {
    this.syncQueue.push(JSON.stringify({ filepath, message }));
    await this.saveSyncQueue();

    // オンラインなら即座にプッシュ
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      await this.processSyncQueue();
    }
  }

  // キュー処理
  private async processSyncQueue() {
    const token = await GitAuthService.getPAT();
    if (!token) return;

    while (this.syncQueue.length > 0) {
      const item = this.syncQueue[0];
      const { filepath, message } = JSON.parse(item);

      try {
        await this.git.commit(filepath, message);
        await this.git.push(token);
        
        // 成功したらキューから削除
        this.syncQueue.shift();
        await this.saveSyncQueue();
      } catch (error) {
        console.error('Sync failed:', error);
        break;  // エラー時は処理停止
      }
    }
  }
}
```

---

## 8. ネイティブ機能

### 8.1 SF Symbols

```tsx
import { SymbolView } from 'expo-symbols';

<SymbolView
  name="doc.text.fill"
  size={24}
  tintColor="#7b6d5d"
  weight="medium"
/>
```

### 8.2 Haptic Feedback

```typescript
import * as Haptics from 'expo-haptics';

// 保存成功
await Haptics.notificationAsync(
  Haptics.NotificationFeedbackType.Success
);

// エラー
await Haptics.notificationAsync(
  Haptics.NotificationFeedbackType.Error
);
```

### 8.3 Face ID / Touch ID

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const { success } = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Fokus Editorにアクセスするには認証が必要です',
  fallbackLabel: 'パスコードを使用',
});
```

---

## 9. テスト

### 9.1 単体テスト

```typescript
// __tests__/services/git.test.ts
import { GitService } from '../../services/git/isomorphic-git';

describe('GitService', () => {
  let git: GitService;

  beforeEach(() => {
    git = new GitService('/tmp/test-repo');
  });

  it('should commit a file', async () => {
    const sha = await git.commit('test.md', 'Test commit');
    expect(sha).toBeTruthy();
  });
});
```

### 9.2 コンポーネントテスト

```typescript
// __tests__/components/ArticleCard.test.tsx
import { render } from '@testing-library/react-native';
import { ArticleCard } from '../../components/ArticleCard';

test('renders article title', () => {
  const article = { id: '1', title: 'Test Article', ... };
  const { getByText } = render(<ArticleCard article={article} />);
  
  expect(getByText('Test Article')).toBeTruthy();
});
```

---

## 10. ビルド・デプロイ

### 10.1 Expo Go開発

```bash
# 開発サーバー起動
npx expo start

# Expo Go でQRコードスキャン
```

### 10.2 iOS ビルド（EAS）

```bash
# EAS初期化
eas init

# iOS ビルド設定
eas build:configure

# TestFlight ビルド
eas build --platform ios --profile preview

# Production ビルド
eas build --platform ios --profile production
```

### 10.3 OTA更新

```bash
# アップデート公開
eas update --branch production
```

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 2.0.0 | 2026-01-21 | Expo + iOS専用版作成 |
