import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { GitAuthService } from '@/services/git/auth';
import { GitOperationsService } from '@/services/git/operations';
import { GitSyncQueueService } from '@/services/git/syncQueue';

export default function SettingsScreen() {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [pat, setPat] = useState('');
  const [branch, setBranch] = useState('main');
  const [authorName, setAuthorName] = useState('Fokus Mobile');
  const [authorEmail, setAuthorEmail] = useState('mobile@fokus.dev');
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncStats, setSyncStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    failed: 0,
  });

  // 初期化状態と設定を読み込み
  useEffect(() => {
    loadSettings();
    checkInitialized();
    loadSyncStats();
  }, []);

  const loadSettings = async () => {
    const config = await GitAuthService.getRepositoryConfig();
    if (config) {
      setRepositoryUrl(config.url);
      setPat(config.pat);
      setBranch(config.branch);
    }
  };

  const checkInitialized = async () => {
    const initialized = await GitOperationsService.isInitialized();
    setIsInitialized(initialized);
  };

  const loadSyncStats = async () => {
    const stats = await GitSyncQueueService.getStats();
    setSyncStats(stats);
  };

  const handleSaveSettings = async () => {
    if (!repositoryUrl.trim() || !pat.trim() || !branch.trim()) {
      Alert.alert('エラー', 'すべての項目を入力してください');
      return;
    }

    setLoading(true);
    try {
      // PATの検証
      const isValid = await GitAuthService.validatePAT(pat);
      if (!isValid) {
        Alert.alert('エラー', 'Personal Access Tokenが無効です');
        return;
      }

      // 設定を保存
      await GitAuthService.savePAT(pat);
      await GitAuthService.saveRepositoryUrl(repositoryUrl);
      await GitAuthService.saveBranch(branch);

      Alert.alert('成功', 'Git設定を保存しました');
    } catch (error) {
      console.error('Save settings error:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneRepository = async () => {
    if (!repositoryUrl.trim() || !pat.trim()) {
      Alert.alert('エラー', 'リポジトリURLとPATを設定してください');
      return;
    }

    setLoading(true);
    try {
      await GitOperationsService.clone(repositoryUrl, pat);
      await checkInitialized();
      Alert.alert('成功', 'リポジトリをクローンしました');
    } catch (error) {
      console.error('Clone error:', error);
      Alert.alert('エラー', 'リポジトリのクローンに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessQueue = async () => {
    setLoading(true);
    try {
      await GitSyncQueueService.processQueue();
      await loadSyncStats();
      Alert.alert('成功', '同期キューを処理しました');
    } catch (error) {
      console.error('Process queue error:', error);
      Alert.alert('エラー', 'キューの処理に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    setLoading(true);
    try {
      await GitSyncQueueService.retryFailed();
      await loadSyncStats();
      Alert.alert('成功', '失敗したアイテムを再試行しました');
    } catch (error) {
      console.error('Retry failed error:', error);
      Alert.alert('エラー', '再試行に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Git設定</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>リポジトリURL</Text>
          <TextInput
            style={styles.input}
            value={repositoryUrl}
            onChangeText={setRepositoryUrl}
            placeholder="https://github.com/username/repo.git"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Personal Access Token</Text>
          <TextInput
            style={styles.input}
            value={pat}
            onChangeText={setPat}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ブランチ</Text>
          <TextInput
            style={styles.input}
            value={branch}
            onChangeText={setBranch}
            placeholder="main"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSaveSettings}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>設定を保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>リポジトリ</Text>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>初期化状態:</Text>
          <Text
            style={[
              styles.statusValue,
              isInitialized ? styles.statusSuccess : styles.statusWarning,
            ]}
          >
            {isInitialized ? '初期化済み' : '未初期化'}
          </Text>
        </View>

        {!isInitialized && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleCloneRepository}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#7b6d5d" />
            ) : (
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                リポジトリをクローン
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>同期キュー</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{syncStats.total}</Text>
            <Text style={styles.statLabel}>合計</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.statPending]}>
              {syncStats.pending}
            </Text>
            <Text style={styles.statLabel}>待機中</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.statProcessing]}>
              {syncStats.processing}
            </Text>
            <Text style={styles.statLabel}>処理中</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.statFailed]}>
              {syncStats.failed}
            </Text>
            <Text style={styles.statLabel}>失敗</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, styles.flexButton]}
            onPress={handleProcessQueue}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              キュー処理
            </Text>
          </TouchableOpacity>

          {syncStats.failed > 0 && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, styles.flexButton]}
              onPress={handleRetryFailed}
              disabled={loading}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                失敗を再試行
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>著者情報</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>名前</Text>
          <TextInput
            style={styles.input}
            value={authorName}
            onChangeText={setAuthorName}
            placeholder="Your Name"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>メールアドレス</Text>
          <TextInput
            style={styles.input}
            value={authorEmail}
            onChangeText={setAuthorEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf8f5',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3d3d3d',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#3d3d3d',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: '#d97706',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButtonText: {
    color: '#7b6d5d',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusSuccess: {
    color: '#10b981',
  },
  statusWarning: {
    color: '#f59e0b',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3d3d3d',
  },
  statPending: {
    color: '#f59e0b',
  },
  statProcessing: {
    color: '#3b82f6',
  },
  statFailed: {
    color: '#ef4444',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flexButton: {
    flex: 1,
  },
});
