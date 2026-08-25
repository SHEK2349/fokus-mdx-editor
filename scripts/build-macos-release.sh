#!/bin/bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TAURI_CONFIG="$PROJECT_DIR/src-tauri/tauri.conf.json"
NOTARY_PROFILE="${NOTARYTOOL_PROFILE:-fokus-editor-notary}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Error: macOS release builds must run on macOS." >&2
  exit 1
fi

for command_name in npm security xcrun codesign spctl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Error: required command not found: $command_name" >&2
    exit 1
  fi
done

SIGNING_IDENTITY="${APPLE_SIGNING_IDENTITY:-}"
if [[ -z "$SIGNING_IDENTITY" ]]; then
  SIGNING_IDENTITY="$(security find-identity -v -p codesigning | sed -n 's/.*"\(Developer ID Application:.*\)"/\1/p' | head -n 1)"
fi

if [[ -z "$SIGNING_IDENTITY" ]]; then
  echo "Error: no valid Developer ID Application certificate was found in Keychain." >&2
  echo "Install the certificate, then rerun this script." >&2
  exit 1
fi

VERSION="$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$TAURI_CONFIG" | head -n 1)"
APP_PATH="$PROJECT_DIR/src-tauri/target/release/bundle/macos/fokus-editor.app"
DMG_PATH="$PROJECT_DIR/src-tauri/target/release/bundle/dmg/fokus-editor_${VERSION}_aarch64.dmg"

echo "Building Fokus. Editor v$VERSION"
echo "Signing identity: $SIGNING_IDENTITY"
echo "Notary Keychain profile: $NOTARY_PROFILE"

cd "$PROJECT_DIR"
export APPLE_SIGNING_IDENTITY="$SIGNING_IDENTITY"
npm run tauri build -- --bundles app,dmg

if [[ ! -d "$APP_PATH" || ! -f "$DMG_PATH" ]]; then
  echo "Error: expected app or DMG was not generated." >&2
  exit 1
fi

echo "Verifying Developer ID signature..."
codesign --verify --deep --strict --verbose=2 "$APP_PATH"
codesign -dv --verbose=4 "$APP_PATH" 2>&1 | grep -E '^(Authority|TeamIdentifier|Runtime Version)='

echo "Submitting DMG for notarization..."
xcrun notarytool submit "$DMG_PATH" \
  --keychain-profile "$NOTARY_PROFILE" \
  --wait

echo "Stapling and validating notarization ticket..."
xcrun stapler staple "$DMG_PATH"
xcrun stapler validate "$DMG_PATH"

echo "Checking Gatekeeper assessments..."
spctl --assess --type execute --verbose=4 "$APP_PATH"
spctl --assess --type open --context context:primary-signature --verbose=4 "$DMG_PATH"

echo "Release artifact is ready:"
echo "$DMG_PATH"
shasum -a 256 "$DMG_PATH"
