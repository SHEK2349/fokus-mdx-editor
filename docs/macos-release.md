# macOS release signing and notarization

Fokus. Editor の配布用DMGは、Appleの `Developer ID Application` 証明書で署名し、公証とstapleを完了してからGitHub Releasesへ公開します。

## 初回セットアップ

1. Apple Developer Programのメンバーシップを確認します。
2. Apple DeveloperのCertificatesページ、またはXcodeのAccounts設定から `Developer ID Application` 証明書を作成し、ログインKeychainへインストールします。
3. Apple Accountのapp-specific passwordを作成します。
4. 公証資格情報をKeychainへ保存します。値はソースコードやシェル履歴へ保存しません。

```sh
xcrun notarytool store-credentials "fokus-editor-notary" \
  --apple-id "APPLE_ID" \
  --team-id "TEAM_ID"
```

app-specific passwordは続く安全なプロンプトで入力します。コマンド引数やシェル履歴には残しません。

証明書を確認します。

```sh
security find-identity -v -p codesigning
```

## 署名・公証済みDMGの作成

```sh
npm install
./scripts/build-macos-release.sh
```

Keychain profile名を変更した場合は、次のように指定します。

```sh
NOTARYTOOL_PROFILE="profile-name" ./scripts/build-macos-release.sh
```

スクリプトは以下を自動実行します。

- TauriアプリとDMGをDeveloper IDで署名
- 署名とHardened Runtimeを検証
- `notarytool` でDMGを公証
- 公証チケットをDMGへstaple
- GatekeeperによるアプリとDMGの評価
- 配布ファイルのSHA-256を出力

すべての検証に成功したDMGだけを公開してください。
