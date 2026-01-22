/**
 * Git認証サービス（Web版）
 * LocalStorageを使用してPATとSSHキーを管理
 */

const GITHUB_PAT_KEY = '@fokus_github_pat';
const REPOSITORY_URL_KEY = '@fokus_repository_url';
const BRANCH_KEY = '@fokus_branch';

/**
 * Git認証サービス（Web実装）
 */
export class GitAuthService {
  /**
   * PATを保存
   */
  static async savePAT(token: string): Promise<void> {
    try {
      localStorage.setItem(GITHUB_PAT_KEY, token);
    } catch (error) {
      console.error('Failed to save PAT:', error);
      throw new Error('PATの保存に失敗しました');
    }
  }

  /**
   * PATを取得
   */
  static async getPAT(): Promise<string | null> {
    try {
      return localStorage.getItem(GITHUB_PAT_KEY);
    } catch (error) {
      console.error('Failed to get PAT:', error);
      return null;
    }
  }

  /**
   * PATを削除
   */
  static async deletePAT(): Promise<void> {
    try {
      localStorage.removeItem(GITHUB_PAT_KEY);
    } catch (error) {
      console.error('Failed to delete PAT:', error);
    }
  }

  /**
   * PATを検証
   */
  static async validatePAT(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('PAT validation error:', error);
      return false;
    }
  }

  /**
   * リポジトリURLを保存
   */
  static async saveRepositoryUrl(url: string): Promise<void> {
    try {
      localStorage.setItem(REPOSITORY_URL_KEY, url);
    } catch (error) {
      console.error('Failed to save repository URL:', error);
    }
  }

  /**
   * リポジトリURLを取得
   */
  static async getRepositoryUrl(): Promise<string | null> {
    try {
      return localStorage.getItem(REPOSITORY_URL_KEY);
    } catch (error) {
      console.error('Failed to get repository URL:', error);
      return null;
    }
  }

  /**
   * ブランチを保存
   */
  static async saveBranch(branch: string): Promise<void> {
    try {
      localStorage.setItem(BRANCH_KEY, branch);
    } catch (error) {
      console.error('Failed to save branch:', error);
    }
  }

  /**
   * ブランチを取得
   */
  static async getBranch(): Promise<string | null> {
    try {
      return localStorage.getItem(BRANCH_KEY);
    } catch (error) {
      console.error('Failed to get branch:', error);
      return null;
    }
  }

  /**
   * リポジトリ設定を取得
   */
  static async getRepositoryConfig(): Promise<{
    pat: string;
    url: string;
    branch: string;
  } | null> {
    try {
      const [pat, url, branch] = await Promise.all([
        this.getPAT(),
        this.getRepositoryUrl(),
        this.getBranch(),
      ]);

      if (pat && url && branch) {
        return { pat, url, branch };
      }

      return null;
    } catch (error) {
      console.error('Failed to get repository config:', error);
      return null;
    }
  }
}
