/**
 * Git Panel Component
 *
 * Gitの状態表示、コミット、プッシュ機能を提供
 */

import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { GitStatus } from '../../types';

interface GitPanelProps {
    status: GitStatus | null;
    onCommit: (message: string) => Promise<void>;
    onPush: () => Promise<void>;
    onRefresh: () => void;
}

export function GitPanel({ status, onCommit, onPush, onRefresh }: GitPanelProps) {
    const [commitMessage, setCommitMessage] = useState('');
    const [isCommitting, setIsCommitting] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [showPanel, setShowPanel] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [progressStep, setProgressStep] = useState(0);
    const [progressTotal, setProgressTotal] = useState(3);
    const [progressMessage, setProgressMessage] = useState('');

    // 進捗イベントを常時リッスン（コミット・プッシュ両方）
    useEffect(() => {
        const unlistenCommit = listen<{ step: number; total: number; message: string }>('commit-progress', (event) => {
            setProgressStep(event.payload.step);
            setProgressTotal(event.payload.total);
            setProgressMessage(event.payload.message);
        });

        const unlistenPush = listen<{ step: number; total: number; message: string }>('push-progress', (event) => {
            setProgressStep(event.payload.step);
            setProgressTotal(event.payload.total);
            setProgressMessage(event.payload.message);
        });

        return () => {
            unlistenCommit.then(fn => fn());
            unlistenPush.then(fn => fn());
        };
    }, []);

    // 変更があるかどうか
    const hasChanges = status ? !status.isClean : false;

    // 変更ファイルからコミットメッセージを自動生成
    useEffect(() => {
        if (!hasChanges || !status) {
            setCommitMessage('');
            return;
        }

        // ファイル名のみ抽出（パスから）
        const getFileName = (path: string) => path.split('/').pop() || path;

        const files: string[] = [];

        // 変更ファイル
        status.modified.forEach(file => {
            files.push(`update: ${getFileName(file)}`);
        });

        // 新規ファイル
        status.added.forEach(file => {
            files.push(`add: ${getFileName(file)}`);
        });

        // 削除ファイル
        status.deleted.forEach(file => {
            files.push(`delete: ${getFileName(file)}`);
        });

        // コミットメッセージ生成
        if (files.length === 1) {
            setCommitMessage(files[0]);
        } else if (files.length > 1) {
            setCommitMessage(files.join('\n'));
        }
    }, [status, hasChanges]);

    const handleCommit = async () => {
        if (!commitMessage.trim()) return;

        setIsCommitting(true);
        setErrorMessage(null);
        setProgressStep(0);
        setProgressMessage('');
        try {
            await onCommit(commitMessage);
            setCommitMessage('');
            onRefresh();
        } catch (error) {
            console.error('Commit failed:', error);
            setErrorMessage(`コミットに失敗しました: ${error}`);
            onRefresh(); // エラー時もステータスを更新
        } finally {
            setIsCommitting(false);
            setProgressStep(0);
            setProgressMessage('');
        }
    };

    const handlePush = async () => {
        setIsPushing(true);
        setErrorMessage(null);
        setProgressStep(0);
        setProgressMessage('');
        try {
            await onPush();
            onRefresh();
            setShowPanel(false); // プッシュ後にパネルを閉じる
        } catch (error) {
            console.error('Push failed:', error);
            setErrorMessage(`プッシュに失敗しました: ${error}`);
            onRefresh(); // エラー時もステータスを更新して isClean を再確認
        } finally {
            setIsPushing(false);
            setProgressStep(0);
            setProgressMessage('');
        }
    };

    const totalChanges = status
        ? status.modified.length + status.added.length + status.deleted.length
        : 0;

    return (
        <div className="git-panel">
            {/* Toggle Header */}
            <div
                className="git-panel-header"
                onClick={() => setShowPanel(!showPanel)}
            >
                <div className="flex items-center gap-2">
                    <span className={`git-indicator ${hasChanges ? 'changed' : 'clean'}`}>
                        {hasChanges ? '●' : '✓'}
                    </span>
                    <span className="text-sm font-medium">Git</span>
                    {totalChanges > 0 && (
                        <span className="git-badge">{totalChanges}</span>
                    )}
                </div>
                <span className="text-xs opacity-50">{showPanel ? '▼' : '▶'}</span>
            </div>

            {/* Expandable Panel */}
            {showPanel && (
                <div className="git-panel-content">
                    <div className="git-scrollable-area">
                        {/* Changed Files */}
                        {hasChanges ? (
                            <>
                                {/* Modified Files */}
                                {status!.modified.length > 0 && (
                                    <div className="git-section">
                                        <div className="git-section-title">変更 ({status!.modified.length})</div>
                                        <ul className="git-file-list">
                                            {status!.modified.map((file) => (
                                                <li key={file} className="git-file modified">
                                                    <span className="git-file-icon">M</span>
                                                    <span className="git-file-name">{file.split('/').pop()}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Added Files */}
                                {status!.added.length > 0 && (
                                    <div className="git-section">
                                        <div className="git-section-title">追加 ({status!.added.length})</div>
                                        <ul className="git-file-list">
                                            {status!.added.map((file) => (
                                                <li key={file} className="git-file untracked">
                                                    <span className="git-file-icon">+</span>
                                                    <span className="git-file-name">{file.split('/').pop()}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Deleted Files */}
                                {status!.deleted.length > 0 && (
                                    <div className="git-section">
                                        <div className="git-section-title">削除 ({status!.deleted.length})</div>
                                        <ul className="git-file-list">
                                            {status!.deleted.map((file) => (
                                                <li key={file} className="git-file deleted">
                                                    <span className="git-file-icon">-</span>
                                                    <span className="git-file-name">{file.split('/').pop()}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Commit Form */}
                                <div className="git-commit-form">
                                    <textarea
                                        value={commitMessage}
                                        onChange={(e) => setCommitMessage(e.target.value)}
                                        placeholder="コミットメッセージ..."
                                        rows={3}
                                        className="git-commit-input"
                                        disabled={isCommitting}
                                    />

                                    {/* Progress Bar */}
                                    {isCommitting && progressStep > 0 && (
                                        <div className="git-progress">
                                            <div className="git-progress-bar">
                                                <div
                                                    className="git-progress-fill"
                                                    style={{ width: `${(progressStep / progressTotal) * 100}%` }}
                                                />
                                            </div>
                                            <div className="git-progress-text">
                                                [{progressStep}/{progressTotal}] {progressMessage}
                                            </div>
                                        </div>
                                    )}

                                    <div className="git-actions">
                                        <button
                                            onClick={handleCommit}
                                            disabled={isCommitting || !commitMessage.trim()}
                                            className="btn-primary"
                                        >
                                            {isCommitting ? '処理中...' : 'コミット'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="git-empty">
                                <span className="opacity-50">変更なし</span>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {errorMessage && (
                        <div
                            className="git-error-message"
                            onClick={() => setErrorMessage(null)}
                            title="クリックで閉じる"
                        >
                            <span>⚠ {errorMessage}</span>
                        </div>
                    )}

                    {/* Push Progress Bar */}
                    {isPushing && progressStep > 0 && (
                        <div className="git-progress" style={{ marginBottom: '0.5rem' }}>
                            <div className="git-progress-bar">
                                <div
                                    className="git-progress-fill"
                                    style={{ width: `${(progressStep / progressTotal) * 100}%` }}
                                />
                            </div>
                            <div className="git-progress-text">
                                [{progressStep}/{progressTotal}] {progressMessage}
                            </div>
                        </div>
                    )}

                    {/* Push Button - Always visible at bottom */}
                    <div className="git-sticky-footer">
                        <button
                            onClick={handlePush}
                            disabled={isPushing || (status?.ahead || 0) === 0}
                            className="btn-secondary"
                            style={{ width: '100%' }}
                        >
                            {isPushing ? '処理中...' : 'プッシュ'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GitPanel;
