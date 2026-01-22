import { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useArticlesStore } from '@/store/articlesStore';
import { FrontmatterForm, FrontmatterData } from '@/components/FrontmatterForm';
import { ArticleStorageService } from '@/services/storage/articleStorage';

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { articles, updateArticle } = useArticlesStore();

  const article = articles.find((a) => a.id === id);

  const [content, setContent] = useState(article?.content || '');
  const [frontmatter, setFrontmatter] = useState<FrontmatterData>({
    title: article?.title || '',
    pubDatetime: article?.pubDatetime || new Date().toISOString(),
    description: article?.description || '',
    draft: article?.draft ?? true,
    featured: article?.featured ?? false,
    tags: article?.tags || [],
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!article) return;

    setSaving(true);
    try {
      const updatedArticle = {
        ...article,
        ...frontmatter,
        content,
      };

      // Zustand storeを更新
      updateArticle(article.id, updatedArticle);

      // AsyncStorageに保存
      await ArticleStorageService.saveArticle(updatedArticle);

      Alert.alert('保存完了', '記事を保存しました');
      router.back();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (!article) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>記事が見つかりません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelButton}>キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveButton, saving && styles.disabledButton]}>
            {saving ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Frontmatterフォーム */}
        <FrontmatterForm
          initialData={frontmatter}
          onChange={setFrontmatter}
        />

        {/* 本文エディタ */}
        <View style={styles.editorSection}>
          <Text style={styles.sectionLabel}>本文（Markdown）</Text>
          <TextInput
            style={styles.contentInput}
            value={content}
            onChangeText={setContent}
            placeholder="# 見出し&#10;&#10;ここに本文を書く..."
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf8f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6b7280',
  },
  saveButton: {
    fontSize: 16,
    color: '#7b6d5d',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  editorSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 12,
  },
  contentInput: {
    fontSize: 16,
    color: '#3d3d3d',
    lineHeight: 24,
    minHeight: 400,
    fontFamily: 'Courier New',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 100,
  },
});
