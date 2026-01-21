import { StyleSheet, View, Text, FlatList } from 'react-native';
import { useArticlesStore } from '@/store/articlesStore';
import { ArticleCard } from '@/components/ArticleCard';

export default function ArticleListScreen() {
  const { articles, loading } = useArticlesStore();

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
      <FlatList
        data={articles}
        renderItem={({ item }) => <ArticleCard article={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
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
});
