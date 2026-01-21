# Fokus. Mobile (iOS)

Astroブログ用MDXエディタのiOSアプリ版。React Native + Expoで構築。

## 技術スタック

- **Expo SDK 52+**: React Nativeフレームワーク
- **Expo Router**: ファイルベースナビゲーション
- **Zustand**: 状態管理
- **isomorphic-git**: Git操作（純粋JavaScript実装）
- **TypeScript**: 型安全性

## 開発環境セットアップ

### 前提条件

- Node.js 18+
- npm または yarn
- iOS Simulator（開発用）または実機（iPhone）

### インストール

```bash
# 依存関係をインストール
npm install

# 開発サーバー起動
npx expo start

# Expo Go でQRコードをスキャン
# または 'i' を押してiOS Simulatorで開く
```

## プロジェクト構造

```
fokus-mobile/
├── app/                    # Expo Router (ファイルベース)
│   ├── (tabs)/
│   │   ├── index.tsx      # 記事一覧
│   │   └── _layout.tsx    # タブナビゲーション
│   └── editor/
│       └── [id].tsx       # エディタ画面
│
├── components/            # Reactコンポーネント
│   ├── ArticleCard.tsx
│   └── ui/
│
├── shared/                # デスクトップと共有
│   ├── types/            # 型定義
│   └── utils/            # ユーティリティ
│
├── store/                # Zustand stores
│   └── articlesStore.ts
│
└── services/             # 外部サービス
    ├── git/
    └── storage/
```

## 開発ロードマップ

### Phase 1: MVP (6週間)
- [x] プロジェクトセットアップ
- [x] 基本的なUI（記事一覧、エディタ）
- [ ] Git統合（isomorphic-git）
- [ ] オフライン対応
- [ ] TestFlight配布

### Phase 2: エンハンスメント (4週間)
- [ ] プレビュー機能
- [ ] 画像挿入（カメラ・ギャラリー）
- [ ] SF Symbols統合
- [ ] Haptic Feedback

### Phase 3: 高度な機能 (2週間)
- [ ] ウィジェット
- [ ] Siri Shortcuts
- [ ] 音声入力

## ビルド

### Development Build

```bash
# iOS ビルド
eas build --platform ios --profile development
```

### TestFlight

```bash
# Production ビルド
eas build --platform ios --profile production
```

## ライセンス

MIT
