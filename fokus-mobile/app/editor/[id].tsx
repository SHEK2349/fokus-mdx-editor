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
import { CommitDialog } from '@/components/CommitDialog';
import { GitOperationsService } from '@/services/git/operations';
import { GitSyncQueueService } from '@/services/git/syncQueue';

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { articles, updateArticle, addArticle } = useArticlesStore();

  const isNewArticle = id === 'new';
  const article = isNewArticle ? null : articles.find((a) => a.id === id);

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
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [savedArticleData, setSavedArticleData] = useState<any>(null);

  const handleSave = async () => {
    // タイトルの入力チェック
    if (!frontmatter.title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    setSaving(true);
    try {
      if (isNewArticle) {
        // 新規記事作成
        const newArticle = {
          id: `article-${Date.now()}`,
          slug: frontmatter.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
          ...frontmatter,
          content,
        };

        // Zustand storeに追加
        addArticle(newArticle);

        // AsyncStorageに保存
        await ArticleStorageService.saveArticle(newArticle);

        Alert.alert('作成完了', '新しい記事を作成しました');
      } else {
        // 既存記事の更新
        if (!article) return;

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
      }

      router.back();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndCommit = async () => {
    // まず記事を保存
    if (!frontmatter.title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    setSaving(true);
    try {
      let articleData;

      if (isNewArticle) {
        // 新規記事作成
        articleData = {
          id: `article-${Date.now()}`,
          slug: frontmatter.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
          ...frontmatter,
          content,
        };

        addArticle(articleData);
        await ArticleStorageService.saveArticle(articleData);
      } else {
        // 既存記事の更新
        if (!article) return;

        articleData = {
          ...article,
          ...frontmatter,
          content,
        };

        updateArticle(article.id, articleData);
        await ArticleStorageService.saveArticle(articleData);
      }

      // 保存後、コミットダイアログを表示
      setSavedArticleData(articleData);
      setShowCommitDialog(true);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleCommit = async (message: string, autoPush: boolean) => {
    try {
      // Gitリポジトリが初期化されているか確認
      const isInitialized = await GitOperationsService.isInitialized();

      if (!isInitialized) {
        Alert.alert(
          'エラー',
          'Gitリポジトリが初期化されていません。設定画面でリポジトリをクローンしてください。'
        );
        return;
      }

      // 記事ファイルをGitリポジトリに書き込み
      if (savedArticleData) {
        const filepath = `content/blog/${savedArticleData.slug}.md`;

        // Frontmatterとコンテンツを結合
        const fileContent = `---
title: ${savedArticleData.title}
pubDatetime: ${savedArticleData.pubDatetime}
description: ${savedArticleData.description}
draft: ${savedArticleData.draft}
featured: ${savedArticleData.featured}
tags:
${savedArticleData.tags.map((tag: string) => `  - ${tag}`).join('\n')}
---

${savedArticleData.content}`;

        await GitOperationsService.writeFile(filepath, fileContent);
        await GitOperationsService.add(filepath);
      }

      // コミットをキューに追加
      await GitSyncQueueService.enqueueCommit({ message });

      if (autoPush) {
        // プッシュもキューに追加
        await GitSyncQueueService.enqueuePush();
      }

      Alert.alert(
        '成功',
        autoPush
          ? 'コミットとプッシュをキューに追加しました'
          : 'コミットをキューに追加しました'
      );

      router.back();
    } catch (error) {
      console.error('Commit error:', error);
      Alert.alert('エラー', 'コミット処理に失敗しました');
    }
  };

  // 新規記事でない場合に記事が見つからなかった場合のみエラー
  if (!isNewArticle && !article) {
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
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={[styles.saveButton, saving && styles.disabledButton]}>
              {saving ? '保存中...' : '保存'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSaveAndCommit} disabled={saving}>
            <Text style={[styles.commitButton, saving && styles.disabledButton]}>
              {saving ? '保存中...' : 'コミット'}
            </Text>
          </TouchableOpacity>
        </View>
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

      {/* コミットダイアログ */}
      <CommitDialog
        visible={showCommitDialog}
        onClose={() => setShowCommitDialog(false)}
        onCommit={handleCommit}
        defaultMessage={
          isNewArticle
            ? `Add new article: ${frontmatter.title}`
            : `Update article: ${frontmatter.title}`
        }
      />
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
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  saveButton: {
    fontSize: 16,
    color: '#7b6d5d',
    fontWeight: '600',
  },
  commitButton: {
    fontSize: 16,
    color: '#d97706',
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
