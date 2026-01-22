import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Article } from '@/store/articlesStore';

const ARTICLES_KEY = '@fokus_articles';

export class ArticleStorageService {
  // 全記事を取得
  static async getAllArticles(): Promise<Article[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(ARTICLES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Error loading articles:', error);
      return [];
    }
  }

  // 記事を保存
  static async saveArticles(articles: Article[]): Promise<void> {
    try {
      const jsonValue = JSON.stringify(articles);
      await AsyncStorage.setItem(ARTICLES_KEY, jsonValue);
    } catch (error) {
      console.error('Error saving articles:', error);
      throw error;
    }
  }

  // 単一記事を追加/更新
  static async saveArticle(article: Article): Promise<void> {
    try {
      const articles = await this.getAllArticles();
      const index = articles.findIndex((a) => a.id === article.id);

      if (index >= 0) {
        articles[index] = article;
      } else {
        articles.push(article);
      }

      await this.saveArticles(articles);
    } catch (error) {
      console.error('Error saving article:', error);
      throw error;
    }
  }

  // 記事を削除
  static async deleteArticle(id: string): Promise<void> {
    try {
      const articles = await this.getAllArticles();
      const filtered = articles.filter((a) => a.id !== id);
      await this.saveArticles(filtered);
    } catch (error) {
      console.error('Error deleting article:', error);
      throw error;
    }
  }

  // ストレージをクリア
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ARTICLES_KEY);
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }
}
