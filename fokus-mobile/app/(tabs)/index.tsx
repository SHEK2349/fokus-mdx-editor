import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useArticlesStore } from '@/store/articlesStore';
import { ArticleCard } from '@/components/ArticleCard';
import { ArticleStorageService } from '@/services/storage/articleStorage';
import * as Haptics from 'expo-haptics';

export default function ArticleListScreen() {
  const router = useRouter();
  const { articles, loading, setArticles, setLoading } = useArticlesStore();
  const [refreshing, setRefreshing] = useState(false);

  // AsyncStorageから記事を読み込む
  const loadArticles = async () => {
    try {
      setLoading(true);
      const storedArticles = await ArticleStorageService.getAllArticles();
      setArticles(storedArticles);
    } catch (error) {
      console.error('Failed to load articles:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    loadArticles();
  }, []);

  // Pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadArticles();
    setRefreshing(false);
  };

  // 新規記事作成
  const handleCreateArticle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/editor/new');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (articles.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>記事がありません</Text>
        <Text style={styles.emptySubtext}>
          「+」ボタンをタップして新規記事を作成
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={articles}
        renderItem={({ item }) => <ArticleCard article={item} />}
        keyExtractor={(item) => item.id}
        estimatedItemSize={140}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {/* 新規記事作成ボタン */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateArticle}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf8f5',
  },
  listContent: {
    padding: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3d3d3d',
    textAlign: 'center',
    marginTop: 100,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#d97706',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 38,
  },
});
