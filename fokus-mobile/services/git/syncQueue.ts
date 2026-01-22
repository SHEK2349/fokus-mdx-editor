/**
 * Git同期キューサービス
 * オフライン時のコミット/プッシュ操作をキューに保存し、
 * ネットワークが利用可能になったら自動的に実行
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GitOperationsService, CommitOptions } from './operations';
import NetInfo from '@react-native-community/netinfo';

const SYNC_QUEUE_KEY = '@fokus_git_sync_queue';

export interface SyncQueueItem {
  id: string;
  type: 'commit' | 'push';
  timestamp: number;
  options?: CommitOptions;
  status: 'pending' | 'processing' | 'failed';
  error?: string;
  retryCount: number;
}

/**
 * Git同期キューサービス
 */
export class GitSyncQueueService {
  private static isProcessing = false;
  private static maxRetries = 3;

  /**
   * キューを取得
   */
  static async getQueue(): Promise<SyncQueueItem[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  /**
   * キューを保存
   */
  static async saveQueue(queue: SyncQueueItem[]): Promise<void> {
    try {
      const jsonValue = JSON.stringify(queue);
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, jsonValue);
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * コミット操作をキューに追加
   */
  static async enqueueCommit(options: CommitOptions): Promise<string> {
    const queue = await this.getQueue();

    const item: SyncQueueItem = {
      id: `commit-${Date.now()}`,
      type: 'commit',
      timestamp: Date.now(),
      options,
      status: 'pending',
      retryCount: 0,
    };

    queue.push(item);
    await this.saveQueue(queue);

    console.log(`Enqueued commit: ${item.id}`);

    // オンラインであればすぐに処理
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      this.processQueue();
    }

    return item.id;
  }

  /**
   * プッシュ操作をキューに追加
   */
  static async enqueuePush(): Promise<string> {
    const queue = await this.getQueue();

    const item: SyncQueueItem = {
      id: `push-${Date.now()}`,
      type: 'push',
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    queue.push(item);
    await this.saveQueue(queue);

    console.log(`Enqueued push: ${item.id}`);

    // オンラインであればすぐに処理
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      this.processQueue();
    }

    return item.id;
  }

  /**
   * キューを処理
   */
  static async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('Queue is already being processed');
      return;
    }

    this.isProcessing = true;

    try {
      const queue = await this.getQueue();
      const pendingItems = queue.filter((item) => item.status === 'pending');

      if (pendingItems.length === 0) {
        console.log('No pending items in queue');
        return;
      }

      console.log(`Processing ${pendingItems.length} pending items...`);

      for (const item of pendingItems) {
        try {
          // ステータスを処理中に更新
          item.status = 'processing';
          await this.saveQueue(queue);

          // 操作を実行
          if (item.type === 'commit' && item.options) {
            await GitOperationsService.commit(item.options);
          } else if (item.type === 'push') {
            await GitOperationsService.push();
          }

          // 成功したらキューから削除
          const updatedQueue = queue.filter((i) => i.id !== item.id);
          await this.saveQueue(updatedQueue);

          console.log(`Successfully processed: ${item.id}`);
        } catch (error) {
          console.error(`Failed to process ${item.id}:`, error);

          // リトライ回数をチェック
          item.retryCount += 1;

          if (item.retryCount >= this.maxRetries) {
            // 最大リトライ回数を超えたら失敗とマーク
            item.status = 'failed';
            item.error = error instanceof Error ? error.message : 'Unknown error';
          } else {
            // リトライ可能であればペンディングに戻す
            item.status = 'pending';
          }

          await this.saveQueue(queue);
        }
      }

      console.log('Queue processing completed');
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * キューの統計を取得
   */
  static async getStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    failed: number;
  }> {
    const queue = await this.getQueue();

    return {
      total: queue.length,
      pending: queue.filter((item) => item.status === 'pending').length,
      processing: queue.filter((item) => item.status === 'processing').length,
      failed: queue.filter((item) => item.status === 'failed').length,
    };
  }

  /**
   * 失敗したアイテムをリトライ
   */
  static async retryFailed(): Promise<void> {
    const queue = await this.getQueue();
    const failedItems = queue.filter((item) => item.status === 'failed');

    for (const item of failedItems) {
      item.status = 'pending';
      item.retryCount = 0;
      item.error = undefined;
    }

    await this.saveQueue(queue);

    // キューを処理
    await this.processQueue();
  }

  /**
   * キューをクリア
   */
  static async clearQueue(): Promise<void> {
    await this.saveQueue([]);
    console.log('Queue cleared');
  }

  /**
   * ネットワーク監視を開始
   */
  static startNetworkMonitoring(): void {
    NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        console.log('Network connected, processing queue...');
        this.processQueue();
      }
    });
  }
}
