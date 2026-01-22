/**
 * isomorphic-git用のファイルシステムアダプター
 * Expo FileSystemをisomorphic-gitのfs APIに適合させる
 */

import * as FileSystem from 'expo-file-system';
import { promisify } from 'util';

const { documentDirectory } = FileSystem;

if (!documentDirectory) {
  throw new Error('FileSystem documentDirectory is not available');
}

// リポジトリのベースディレクトリ
export const REPO_DIR = `${documentDirectory}git-repo/`;

/**
 * isomorphic-git互換のファイルシステムインターフェース
 */
export const fs = {
  /**
   * ファイルを読み込む
   */
  readFile: async (filepath: string, options?: { encoding?: string }) => {
    const fullPath = filepath.startsWith(REPO_DIR)
      ? filepath
      : `${REPO_DIR}${filepath}`;

    try {
      if (options?.encoding === 'utf8') {
        return await FileSystem.readAsStringAsync(fullPath, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } else {
        // バイナリデータはBase64で読み込み
        const base64 = await FileSystem.readAsStringAsync(fullPath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        // Base64をUint8Arrayに変換
        return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      }
    } catch (error) {
      throw new Error(`Failed to read file: ${fullPath}`);
    }
  },

  /**
   * ファイルに書き込む
   */
  writeFile: async (
    filepath: string,
    data: string | Uint8Array,
    options?: { encoding?: string }
  ) => {
    const fullPath = filepath.startsWith(REPO_DIR)
      ? filepath
      : `${REPO_DIR}${filepath}`;

    // ディレクトリが存在しない場合は作成
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

    try {
      if (typeof data === 'string') {
        await FileSystem.writeAsStringAsync(fullPath, data, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } else {
        // Uint8ArrayをBase64に変換して書き込み
        const base64 = btoa(String.fromCharCode(...data));
        await FileSystem.writeAsStringAsync(fullPath, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    } catch (error) {
      throw new Error(`Failed to write file: ${fullPath}`);
    }
  },

  /**
   * ディレクトリを作成
   */
  mkdir: async (dirpath: string) => {
    const fullPath = dirpath.startsWith(REPO_DIR)
      ? dirpath
      : `${REPO_DIR}${dirpath}`;

    try {
      await FileSystem.makeDirectoryAsync(fullPath, { intermediates: true });
    } catch (error) {
      // ディレクトリが既に存在する場合はエラーを無視
      const info = await FileSystem.getInfoAsync(fullPath);
      if (!info.exists) {
        throw new Error(`Failed to create directory: ${fullPath}`);
      }
    }
  },

  /**
   * ディレクトリの内容を読み込む
   */
  readdir: async (dirpath: string) => {
    const fullPath = dirpath.startsWith(REPO_DIR)
      ? dirpath
      : `${REPO_DIR}${dirpath}`;

    try {
      const items = await FileSystem.readDirectoryAsync(fullPath);
      return items;
    } catch (error) {
      throw new Error(`Failed to read directory: ${fullPath}`);
    }
  },

  /**
   * ファイル/ディレクトリを削除
   */
  rmdir: async (dirpath: string) => {
    const fullPath = dirpath.startsWith(REPO_DIR)
      ? dirpath
      : `${REPO_DIR}${dirpath}`;

    try {
      await FileSystem.deleteAsync(fullPath, { idempotent: true });
    } catch (error) {
      throw new Error(`Failed to remove directory: ${fullPath}`);
    }
  },

  /**
   * ファイルを削除
   */
  unlink: async (filepath: string) => {
    const fullPath = filepath.startsWith(REPO_DIR)
      ? filepath
      : `${REPO_DIR}${filepath}`;

    try {
      await FileSystem.deleteAsync(fullPath, { idempotent: true });
    } catch (error) {
      throw new Error(`Failed to unlink file: ${fullPath}`);
    }
  },

  /**
   * ファイル/ディレクトリの情報を取得
   */
  stat: async (filepath: string) => {
    const fullPath = filepath.startsWith(REPO_DIR)
      ? filepath
      : `${REPO_DIR}${filepath}`;

    try {
      const info = await FileSystem.getInfoAsync(fullPath);

      if (!info.exists) {
        throw new Error(`File does not exist: ${fullPath}`);
      }

      return {
        isFile: () => !info.isDirectory,
        isDirectory: () => info.isDirectory ?? false,
        isSymbolicLink: () => false,
        size: info.size ?? 0,
        mode: 0o666, // デフォルト権限
        mtimeMs: info.modificationTime ?? Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to stat: ${fullPath}`);
    }
  },

  /**
   * ファイル/ディレクトリの情報を取得（存在しない場合はエラーにしない）
   */
  lstat: async (filepath: string) => {
    return fs.stat(filepath);
  },

  /**
   * シンボリックリンクを読み込む（未対応）
   */
  readlink: async (filepath: string) => {
    throw new Error('Symbolic links are not supported on React Native');
  },

  /**
   * シンボリックリンクを作成（未対応）
   */
  symlink: async (target: string, filepath: string) => {
    throw new Error('Symbolic links are not supported on React Native');
  },

  /**
   * 権限を変更（未対応）
   */
  chmod: async (filepath: string, mode: number) => {
    // React Nativeでは権限変更は不要
    return;
  },
};
