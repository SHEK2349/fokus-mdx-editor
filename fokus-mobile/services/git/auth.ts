import * as SecureStore from 'expo-secure-store';

const GITHUB_PAT_KEY = 'github_pat';
const REPO_URL_KEY = 'repo_url';
const REPO_BRANCH_KEY = 'repo_branch';

export interface RepositoryConfig {
  url: string;
  branch: string;
  pat: string;
}

export class GitAuthService {
  // PAT保存
  static async savePAT(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(GITHUB_PAT_KEY, token);
    } catch (error) {
      console.error('Error saving PAT:', error);
      throw error;
    }
  }

  // PAT取得
  static async getPAT(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(GITHUB_PAT_KEY);
    } catch (error) {
      console.error('Error getting PAT:', error);
      return null;
    }
  }

  // PAT削除
  static async deletePAT(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(GITHUB_PAT_KEY);
    } catch (error) {
      console.error('Error deleting PAT:', error);
      throw error;
    }
  }

  // PAT検証（GitHub APIで確認）
  static async validatePAT(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Error validating PAT:', error);
      return false;
    }
  }

  // リポジトリURL保存
  static async saveRepositoryUrl(url: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(REPO_URL_KEY, url);
    } catch (error) {
      console.error('Error saving repository URL:', error);
      throw error;
    }
  }

  // リポジトリURL取得
  static async getRepositoryUrl(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REPO_URL_KEY);
    } catch (error) {
      console.error('Error getting repository URL:', error);
      return null;
    }
  }

  // ブランチ名保存
  static async saveBranch(branch: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(REPO_BRANCH_KEY, branch);
    } catch (error) {
      console.error('Error saving branch:', error);
      throw error;
    }
  }

  // ブランチ名取得
  static async getBranch(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REPO_BRANCH_KEY);
    } catch (error) {
      console.error('Error getting branch:', error);
      return null;
    }
  }

  // リポジトリ設定を全て保存
  static async saveRepositoryConfig(config: RepositoryConfig): Promise<void> {
    await Promise.all([
      this.savePAT(config.pat),
      this.saveRepositoryUrl(config.url),
      this.saveBranch(config.branch),
    ]);
  }

  // リポジトリ設定を全て取得
  static async getRepositoryConfig(): Promise<RepositoryConfig | null> {
    const [pat, url, branch] = await Promise.all([
      this.getPAT(),
      this.getRepositoryUrl(),
      this.getBranch(),
    ]);

    if (!pat || !url || !branch) {
      return null;
    }

    return { pat, url, branch };
  }

  // 全設定をクリア
  static async clearAll(): Promise<void> {
    await Promise.all([
      this.deletePAT(),
      SecureStore.deleteItemAsync(REPO_URL_KEY),
      SecureStore.deleteItemAsync(REPO_BRANCH_KEY),
    ]);
  }
}
