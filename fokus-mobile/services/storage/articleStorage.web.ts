/**
 * 記事ストレージサービス（Web版）
 * LocalStorageを使用して記事データを永続化
 */

import type { Article } from '../../store/articlesStore';

const ARTICLES_KEY = '@fokus_articles';

/**
 * 記事ストレージサービス（Web実装）
 */
export class ArticleStorageService {
  /**
   * すべての記事を取得
   */
  static async getAllArticles(): Promise<Article[]> {
    try {
      const jsonValue = localStorage.getItem(ARTICLES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Failed to get articles:', error);
      return [];
    }
  }

  /**
   * 記事を保存
   */
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
      console.error('Failed to save article:', error);
      throw error;
    }
  }

  /**
   * すべての記事を保存
   */
  static async saveArticles(articles: Article[]): Promise<void> {
    try {
      const jsonValue = JSON.stringify(articles);
      localStorage.setItem(ARTICLES_KEY, jsonValue);
    } catch (error) {
      console.error('Failed to save articles:', error);
      throw error;
    }
  }

  /**
   * 記事を削除
   */
  static async deleteArticle(id: string): Promise<void> {
    try {
      const articles = await this.getAllArticles();
      const filtered = articles.filter((a) => a.id !== id);
      await this.saveArticles(filtered);
    } catch (error) {
      console.error('Failed to delete article:', error);
      throw error;
    }
  }

  /**
   * すべての記事を削除
   */
  static async clearAll(): Promise<void> {
    try {
      localStorage.removeItem(ARTICLES_KEY);
    } catch (error) {
      console.error('Failed to clear articles:', error);
      throw error;
    }
  }
}
