/**
 * Settings Modal Component
 * 
 * リポジトリと記事パスの設定を行うモーダル
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSettingsUpdated: () => void;
    isInitialSetup?: boolean;
}

export function SettingsModal({ isOpen, onClose, onSettingsUpdated, isInitialSetup = false }: SettingsModalProps) {
    const [repositoryPath, setRepositoryPath] = useState('');
    const [articlesPath, setArticlesPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = () => {
        const saved = localStorage.getItem('fokus-settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setRepositoryPath(parsed.repositoryPath || '');
                setArticlesPath(parsed.articlesPath || '');
            } catch (err) {
                console.error('Failed to parse saved settings:', err);
            }
        }
    };

    const handleSave = async () => {
        if (!repositoryPath.trim()) {
            setError('リポジトリパスを入力してください');
            return;
        }

        if (!articlesPath.trim()) {
            setError('記事パスを入力してください');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await invoke('save_repository_settings', {
                request: {
                    repository_path: repositoryPath.trim(),
                    articles_path: articlesPath.trim(),
                }
            });

            localStorage.setItem('fokus-settings', JSON.stringify({
                repositoryPath: repositoryPath.trim(),
                articlesPath: articlesPath.trim(),
            }));

            onSettingsUpdated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>⚙ リポジトリ設定</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    {error && (
                        <div className="error-message">{error}</div>
                    )}

                    <div className="form-group">
                        <label>リポジトリパス</label>
                        <input
                            type="text"
                            value={repositoryPath}
                            onChange={(e) => setRepositoryPath(e.target.value)}
                            placeholder="/path/to/your/repository"
                        />
                        <span className="form-hint">
                            Gitリポジトリのルートディレクトリを指定してください
                        </span>
                    </div>

                    <div className="form-group">
                        <label>記事パス（相対パス）</label>
                        <input
                            type="text"
                            value={articlesPath}
                            onChange={(e) => setArticlesPath(e.target.value)}
                            placeholder="src/data/blog"
                        />
                        <span className="form-hint">
                            リポジトリ内のMDXファイルがあるディレクトリ
                        </span>
                    </div>

                    {!isInitialSetup && (
                        <>
                            <hr className="settings-divider" />

                            <div className="settings-section">
                                <h3>⌨️ ショートカットキー</h3>
                                <div className="shortcuts-grid">
                                    <div className="shortcut-item">
                                        <span className="shortcut-desc">保存</span>
                                        <kbd className="shortcut-key">Cmd + S</kbd>
                                    </div>
                                    <div className="shortcut-item">
                                        <span className="shortcut-desc">太字</span>
                                        <kbd className="shortcut-key">Cmd + B</kbd>
                                    </div>
                                    <div className="shortcut-item">
                                        <span className="shortcut-desc">斜体</span>
                                        <kbd className="shortcut-key">Cmd + I</kbd>
                                    </div>
                                    <div className="shortcut-item">
                                        <span className="shortcut-desc">取り消し線</span>
                                        <kbd className="shortcut-key">Cmd + D</kbd>
                                    </div>
                                    <div className="shortcut-item">
                                        <span className="shortcut-desc">リンク挿入</span>
                                        <kbd className="shortcut-key">Cmd + K</kbd>
                                    </div>
                                    <div className="shortcut-item">
                                        <span className="shortcut-desc">見出し 1-6</span>
                                        <kbd className="shortcut-key">Cmd + 1~6</kbd>
                                    </div>
                                    <div className="shortcut-item">
                                        <span className="shortcut-desc">箇条書きリスト</span>
                                        <kbd className="shortcut-key">Cmd + L</kbd>
                                    </div>
                                    <div className="shortcut-item">
                                        <span className="shortcut-desc">番号付きリスト</span>
                                        <kbd className="shortcut-key">Cmd + Shift + L</kbd>
                                    </div>
                                    <div className="shortcut-item">
                                        <span className="shortcut-desc">コードブロック</span>
                                        <kbd className="shortcut-key">Cmd + Shift + C</kbd>
                                    </div>
                                    <div className="shortcut-item">
                                        <span className="shortcut-desc">引用</span>
                                        <kbd className="shortcut-key">Cmd + '</kbd>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} disabled={loading}>
                        キャンセル
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="primary"
                    >
                        {loading ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;
