/**
 * Git操作サービス
 * isomorphic-gitを使用してリポジトリの操作を提供
 */

import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { fs, REPO_DIR } from './fs';
import { GitAuthService } from './auth';

export interface CommitOptions {
  message: string;
  author?: {
    name: string;
    email: string;
  };
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  untracked: string[];
}

/**
 * Git操作サービス
 */
export class GitOperationsService {
  /**
   * リポジトリをクローン
   */
  static async clone(url: string, token: string): Promise<void> {
    try {
      // 既存のリポジトリディレクトリを削除
      await fs.rmdir(REPO_DIR);

      // リポジトリをクローン
      await git.clone({
        fs,
        http,
        dir: REPO_DIR,
        url,
        singleBranch: true,
        depth: 1, // shallow clone
        onAuth: () => ({
          username: token,
          password: 'x-oauth-basic',
        }),
      });

      console.log('Repository cloned successfully');
    } catch (error) {
      console.error('Clone error:', error);
      throw new Error('リポジトリのクローンに失敗しました');
    }
  }

  /**
   * リポジトリの初期化（クローン済みかチェック）
   */
  static async isInitialized(): Promise<boolean> {
    try {
      const branches = await git.listBranches({ fs, dir: REPO_DIR });
      return branches.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * ブランチ一覧を取得
   */
  static async listBranches(): Promise<string[]> {
    try {
      return await git.listBranches({ fs, dir: REPO_DIR });
    } catch (error) {
      console.error('List branches error:', error);
      return [];
    }
  }

  /**
   * 現在のブランチを取得
   */
  static async getCurrentBranch(): Promise<string | null> {
    try {
      const branch = await git.currentBranch({ fs, dir: REPO_DIR });
      return branch || null;
    } catch (error) {
      console.error('Get current branch error:', error);
      return null;
    }
  }

  /**
   * ブランチをチェックアウト
   */
  static async checkout(branch: string): Promise<void> {
    try {
      await git.checkout({ fs, dir: REPO_DIR, ref: branch });
      console.log(`Checked out to ${branch}`);
    } catch (error) {
      console.error('Checkout error:', error);
      throw new Error(`ブランチ ${branch} へのチェックアウトに失敗しました`);
    }
  }

  /**
   * ファイルをステージング
   */
  static async add(filepath: string): Promise<void> {
    try {
      await git.add({ fs, dir: REPO_DIR, filepath });
      console.log(`Staged: ${filepath}`);
    } catch (error) {
      console.error('Add error:', error);
      throw new Error(`ファイル ${filepath} のステージングに失敗しました`);
    }
  }

  /**
   * すべての変更をステージング
   */
  static async addAll(): Promise<void> {
    try {
      const status = await this.status();
      const allFiles = [...status.modified, ...status.untracked];

      for (const file of allFiles) {
        await git.add({ fs, dir: REPO_DIR, filepath: file });
      }

      console.log(`Staged ${allFiles.length} files`);
    } catch (error) {
      console.error('Add all error:', error);
      throw new Error('すべてのファイルのステージングに失敗しました');
    }
  }

  /**
   * コミット
   */
  static async commit(options: CommitOptions): Promise<string> {
    try {
      const author = options.author || {
        name: 'Fokus Mobile',
        email: 'mobile@fokus.dev',
      };

      const sha = await git.commit({
        fs,
        dir: REPO_DIR,
        message: options.message,
        author: {
          name: author.name,
          email: author.email,
          timestamp: Math.floor(Date.now() / 1000),
        },
      });

      console.log(`Committed: ${sha}`);
      return sha;
    } catch (error) {
      console.error('Commit error:', error);
      throw new Error('コミットに失敗しました');
    }
  }

  /**
   * プッシュ
   */
  static async push(): Promise<void> {
    try {
      const config = await GitAuthService.getRepositoryConfig();

      if (!config) {
        throw new Error('Git認証情報が設定されていません');
      }

      const branch = await this.getCurrentBranch();

      if (!branch) {
        throw new Error('現在のブランチを取得できません');
      }

      await git.push({
        fs,
        http,
        dir: REPO_DIR,
        remote: 'origin',
        ref: branch,
        onAuth: () => ({
          username: config.pat,
          password: 'x-oauth-basic',
        }),
      });

      console.log('Pushed successfully');
    } catch (error) {
      console.error('Push error:', error);
      throw new Error('プッシュに失敗しました');
    }
  }

  /**
   * プル
   */
  static async pull(): Promise<void> {
    try {
      const config = await GitAuthService.getRepositoryConfig();

      if (!config) {
        throw new Error('Git認証情報が設定されていません');
      }

      const branch = await this.getCurrentBranch();

      if (!branch) {
        throw new Error('現在のブランチを取得できません');
      }

      await git.pull({
        fs,
        http,
        dir: REPO_DIR,
        ref: branch,
        singleBranch: true,
        onAuth: () => ({
          username: config.pat,
          password: 'x-oauth-basic',
        }),
      });

      console.log('Pulled successfully');
    } catch (error) {
      console.error('Pull error:', error);
      throw new Error('プルに失敗しました');
    }
  }

  /**
   * ステータスを取得
   */
  static async status(): Promise<GitStatus> {
    try {
      const branch = (await this.getCurrentBranch()) || 'unknown';

      // ワーキングディレクトリの状態を確認
      const statusMatrix = await git.statusMatrix({ fs, dir: REPO_DIR });

      const modified: string[] = [];
      const untracked: string[] = [];

      statusMatrix.forEach(([filepath, headStatus, workdirStatus, stageStatus]) => {
        // HEAD, WORKDIR, STAGE の状態コードで判定
        // 0 = absent, 1 = identical, 2 = modified
        if (headStatus === 0 && workdirStatus === 2) {
          untracked.push(filepath);
        } else if (headStatus === 1 && workdirStatus === 2) {
          modified.push(filepath);
        }
      });

      return {
        branch,
        ahead: 0, // TODO: リモートとの比較
        behind: 0, // TODO: リモートとの比較
        modified,
        untracked,
      };
    } catch (error) {
      console.error('Status error:', error);
      throw new Error('ステータスの取得に失敗しました');
    }
  }

  /**
   * ファイルの内容を取得
   */
  static async readFile(filepath: string): Promise<string> {
    try {
      const content = await fs.readFile(`${REPO_DIR}${filepath}`, {
        encoding: 'utf8',
      });
      return content as string;
    } catch (error) {
      console.error('Read file error:', error);
      throw new Error(`ファイル ${filepath} の読み込みに失敗しました`);
    }
  }

  /**
   * ファイルに書き込む
   */
  static async writeFile(filepath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(`${REPO_DIR}${filepath}`, content, {
        encoding: 'utf8',
      });
      console.log(`Wrote file: ${filepath}`);
    } catch (error) {
      console.error('Write file error:', error);
      throw new Error(`ファイル ${filepath} への書き込みに失敗しました`);
    }
  }

  /**
   * コミット履歴を取得
   */
  static async log(depth = 10): Promise<any[]> {
    try {
      const commits = await git.log({
        fs,
        dir: REPO_DIR,
        depth,
      });

      return commits;
    } catch (error) {
      console.error('Log error:', error);
      return [];
    }
  }
}
