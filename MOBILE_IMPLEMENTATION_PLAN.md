# Fokus. Mobile (iOS) - 実装計画書（Expo版）

**バージョン**: 2.0.0
**最終更新**: 2026-01-21
**開発期間**: 12週間（MVP: 6週間）
**技術スタック**: Expo + React Native

---

## 1. 開発フェーズ

### Phase 1: MVP - 6週間

#### Week 1-2: セットアップ
- [ ] Expo プロジェクト作成
- [ ] ライブラリ導入（expo-router, isomorphic-git, zustand, nativewind）
- [ ] デスクトップ版からコード共有（types/, utils/, hooks/）
- [ ] Expo Go テスト環境

#### Week 3-4: コア機能
- [ ] 記事一覧（FlashList）
- [ ] Frontmatterエディタ
- [ ] Markdownエディタ
- [ ] AsyncStorage統合
- [ ] Git認証（PAT + SecureStore）

#### Week 5-6: Git統合
- [ ] isomorphic-git統合
- [ ] コミット・プッシュ
- [ ] オフライン同期
- [ ] TestFlight配布

### Phase 2: エンハンスメント - 4週間
- [ ] プレビュー（react-native-webview）
- [ ] 画像挿入（expo-image-picker）
- [ ] SF Symbols統合
- [ ] Haptic Feedback

### Phase 3: 高度な機能 - 2週間
- [ ] ウィジェット
- [ ] Siri Shortcuts
- [ ] 音声入力

---

## 2. タスク詳細

### Week 1: プロジェクトセットアップ

```bash
# Expoプロジェクト作成
npx create-expo-app fokus-mobile --template tabs

cd fokus-mobile

# ライブラリ追加
npx expo install expo-router expo-symbols expo-secure-store
npx expo install expo-file-system expo-haptics expo-image-picker
npm install isomorphic-git @isomorphic-git/lightning-fs
npm install zustand nativewind
npm install --save-dev @types/react @types/react-native

# NativeWind設定
npx nativewind --init
```

### Week 2: コード共有

```
# デスクトップから共有
cp -r ../fokus-mdx-editor/src/types ./shared/types
cp -r ../fokus-mdx-editor/src/utils ./shared/utils

# 型定義を共有
shared/
├── types/
│   ├── article.ts
│   └── frontmatter.ts
└── utils/
    ├── yaml.ts
    └── markdown.ts
```

### Week 3-4: UI実装

```tsx
// app/(tabs)/index.tsx
import { FlashList } from '@shopify/flash-list';
import { ArticleCard } from '@/components/ArticleCard';

export default function ArticleList() {
  const articles = useArticlesStore(state => state.articles);
  
  return (
    <FlashList
      data={articles}
      renderItem={({ item }) => <ArticleCard article={item} />}
      estimatedItemSize={120}
    />
  );
}
```

### Week 5-6: Git統合

```typescript
// services/git/isomorphic-git.ts
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';

await git.commit({
  fs,
  dir: '/repo',
  message: 'Update article',
  author: { name: 'Fokus Mobile', email: 'mobile@fokus.dev' },
});

await git.push({
  fs,
  http,
  dir: '/repo',
  onAuth: () => ({ username: token, password: 'x-oauth-basic' }),
});
```

---

## 3. リリース計画

### Week 5-6: TestFlight
- クローズドベータ（5名）
- パブリックベータ（30名）

### Week 7: App Store
- ビルド提出
- レビュー期間: 1-3日
- 🚀 正式リリース

---

## 4. KPI

| 指標 | 目標 |
|------|------|
| アプリサイズ | < 30MB |
| 起動時間 | < 1.5秒 |
| ダウンロード（3ヶ月） | 500件 |
| App Store評価 | ★4.5+ |

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 2.0.0 | 2026-01-21 | Expo版作成 |
