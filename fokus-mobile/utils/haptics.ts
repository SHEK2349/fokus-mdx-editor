/**
 * Haptics wrapper - Platform-aware haptic feedback
 * Web版では何もしない（またはVibration APIを使用）
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// 型エクスポート
export const ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = Haptics.NotificationFeedbackType;

/**
 * Haptic feedback wrapper
 */
export const HapticsWrapper = {
  async impactAsync(style: Haptics.ImpactFeedbackStyle): Promise<void> {
    if (Platform.OS === 'web') {
      // Web版では無効化（オプション: Vibration APIを使用可能）
      // if ('vibrate' in navigator) {
      //   navigator.vibrate(10);
      // }
      return;
    }
    return Haptics.impactAsync(style);
  },

  async notificationAsync(type: Haptics.NotificationFeedbackType): Promise<void> {
    if (Platform.OS === 'web') {
      // Web版では無効化
      return;
    }
    return Haptics.notificationAsync(type);
  },

  async selectionAsync(): Promise<void> {
    if (Platform.OS === 'web') {
      // Web版では無効化
      return;
    }
    return Haptics.selectionAsync();
  },
};
