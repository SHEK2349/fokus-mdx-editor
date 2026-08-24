/**
 * Git Panel Component
 *
 * Gitの状態表示、コミット、プッシュ機能を提供
 */

import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { GitStatus } from '../../types';

type ProgressLevel = 'info' | 'success' | 'warning' | 'error';

interface GitProgress {
    step: number;
    total: number;
    message: string;
    level: ProgressLevel;
}

interface GitPanelProps {
    status: GitStatus | null;
    onCommit: (message: string, files: string[]) => Promise<void>;
    onPush: () => Promise<void>;
    onRefresh: () => void;
}

export function GitPanel({ status, onCommit, onPush, onRefresh }: GitPanelProps) {
    const [commitMessage, setCommitMessage] = useState('');
    const [isCommitting, setIsCommitting] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [showPanel, setShowPanel] = useState(false);
    const [progress, setProgress] = useState<GitProgress | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [warningMessage, setWarningMessage] = useState<string | null>(null);

    const isBusy = isCommitting || isPushing;

    useEffect(() => {
        let disposed = false;
        let cleanupListeners: Array<() => void> = [];

        void Promise.all([
            listen<GitProgress>('commit-progress', (event) => {
                setProgress(event.payload);
                if (event.payload.level === 'warning') {
                    setWarningMessage(event.payload.message);
                }
            }),
            listen<GitProgress>('push-progress', (event) => {
                setProgress(event.payload);
                if (event.payload.level === 'warning') {
                    setWarningMessage(event.payload.message);
                }
            }),
        ]).then((listeners) => {
            if (disposed) {
                listeners.forEach((unlisten) => unlisten());
            } else {
                cleanupListeners = listeners;
            }
        }).catch((error) => {
            console.error('Failed to register Git progress listeners:', error);
        });

        return () => {
            disposed = true;
            cleanupListeners.forEach((unlisten) => unlisten());
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
        setProgress(null);
        setErrorMessage(null);
        setWarningMessage(null);
        try {
            const filesToCommit = status
                ? [...status.modified, ...status.added, ...status.deleted]
                : [];

            await onCommit(commitMessage, filesToCommit);
            setCommitMessage('');
            onRefresh();
        } catch (error) {
            console.error('Commit failed:', error);
            setErrorMessage(`コミットに失敗しました: ${formatError(error)}`);
            onRefresh();
        } finally {
            setIsCommitting(false);
            setProgress(null);
        }
    };

    const handlePush = async () => {
        setIsPushing(true);
        setProgress(null);
        setErrorMessage(null);
        setWarningMessage(null);
        try {
            await onPush();
            onRefresh();
        } catch (error) {
            console.error('Push failed:', error);
            setErrorMessage(`プッシュに失敗しました: ${formatError(error)}`);
            onRefresh();
        } finally {
            setIsPushing(false);
            setProgress(null);
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
                                        disabled={isBusy}
                                    />

                                    {isCommitting && progress && (
                                        <GitProgressView progress={progress} />
                                    )}

                                    <div className="git-actions">
                                        <button
                                            onClick={handleCommit}
                                            disabled={isBusy || !commitMessage.trim()}
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

                    {errorMessage && (
                        <OperationMessage
                            type="error"
                            message={errorMessage}
                            onDismiss={() => setErrorMessage(null)}
                        />
                    )}

                    {!errorMessage && warningMessage && (
                        <OperationMessage
                            type="warning"
                            message={warningMessage}
                            onDismiss={() => setWarningMessage(null)}
                        />
                    )}

                    {isPushing && progress && (
                        <GitProgressView progress={progress} />
                    )}

                    {/* Push Button - Always visible at bottom */}
                    <div className="git-sticky-footer">
                        <button
                            onClick={handlePush}
                            disabled={isBusy || (status?.ahead || 0) === 0}
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

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function GitProgressView({ progress }: { progress: GitProgress }) {
    const total = Math.max(progress.total, 1);
    const step = Math.min(Math.max(progress.step, 0), total);
    const percentage = (step / total) * 100;

    return (
        <div className={`git-progress git-progress-${progress.level}`} aria-live="polite">
            <div
                className="git-progress-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={step}
                aria-label={progress.message}
            >
                <div
                    className="git-progress-fill"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="git-progress-text">
                [{step}/{total}] {progress.message}
            </div>
        </div>
    );
}

function OperationMessage({
    type,
    message,
    onDismiss,
}: {
    type: 'error' | 'warning';
    message: string;
    onDismiss: () => void;
}) {
    return (
        <button
            type="button"
            className={`git-operation-message git-operation-message-${type}`}
            onClick={onDismiss}
            title="クリックで閉じる"
        >
            <span aria-hidden="true">{type === 'error' ? '⚠' : '!'}</span>
            <span>{message}</span>
        </button>
    );
}

export default GitPanel;
