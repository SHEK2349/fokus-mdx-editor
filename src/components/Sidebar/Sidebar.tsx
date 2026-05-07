/**
 * Sidebar Component
 *
 * 記事一覧の表示とナビゲーション + Gitパネル
 * 検索・フィルタ・記事削除機能付き
 */

import { useState, useMemo } from 'react';
import { ArticleListItem, GitStatus } from '../../types';
import { GitPanel } from '../Git';

interface SidebarProps {
    articles: ArticleListItem[];
    selectedSlug: string | null;
    onSelectArticle: (slug: string) => void;
    onNewArticle: () => void;
    onDeleteArticle: (slug: string) => void;
    loading?: boolean;
    gitStatus: GitStatus | null;
    onCommit: (message: string) => Promise<void>;
    onPush: () => Promise<void>;
    onGitRefresh: () => void;
}

type FilterMode = 'all' | 'published' | 'draft';

export function Sidebar({
    articles,
    selectedSlug,
    onSelectArticle,
    onNewArticle,
    onDeleteArticle,
    loading = false,
    gitStatus,
    onCommit,
    onPush,
    onGitRefresh,
}: SidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMode, setFilterMode] = useState<FilterMode>('all');

    // 日付をフォーマット
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // フィルタリングされた記事一覧
    const filteredArticles = useMemo(() => {
        let filtered = articles;

        // 下書き/公開フィルタ
        if (filterMode === 'published') {
            filtered = filtered.filter(a => !a.draft);
        } else if (filterMode === 'draft') {
            filtered = filtered.filter(a => a.draft);
        }

        // テキスト検索（タイトル・タグ）
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(a =>
                a.title.toLowerCase().includes(query) ||
                a.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }

        return filtered;
    }, [articles, searchQuery, filterMode]);

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <button
                    onClick={onNewArticle}
                    className="new-article-btn"
                >
                    + 新規記事
                </button>
            </div>

            {/* Search & Filter */}
            <div className="sidebar-search">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="記事を検索..."
                    className="search-input"
                />
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filterMode === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterMode('all')}
                    >
                        全て ({articles.length})
                    </button>
                    <button
                        className={`filter-tab ${filterMode === 'published' ? 'active' : ''}`}
                        onClick={() => setFilterMode('published')}
                    >
                        公開
                    </button>
                    <button
                        className={`filter-tab ${filterMode === 'draft' ? 'active' : ''}`}
                        onClick={() => setFilterMode('draft')}
                    >
                        下書き
                    </button>
                </div>
            </div>

            {/* Article List */}
            <div className="sidebar-content">
                {loading ? (
                    <div className="p-4 text-center opacity-50">読み込み中...</div>
                ) : filteredArticles.length === 0 ? (
                    <div className="p-4 text-center opacity-50">
                        {searchQuery ? '検索結果がありません' : '記事がありません'}
                    </div>
                ) : (
                    <ul className="article-list">
                        {filteredArticles.map((article) => (
                            <li
                                key={article.slug}
                                className={`article-item ${selectedSlug === article.slug ? 'selected' : ''}`}
                                onClick={() => onSelectArticle(article.slug)}
                            >
                                <div className="article-item-header">
                                    <h3>{article.title}</h3>
                                    <button
                                        className="article-delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteArticle(article.slug);
                                        }}
                                        title="記事を削除"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="meta">
                                    {formatDate(article.pubDatetime)}
                                    {article.draft && <span className="ml-2 text-amber-500">下書き</span>}
                                    {article.featured && <span className="ml-2 text-purple-500">★</span>}
                                </div>
                                {article.tags.length > 0 && (
                                    <div className="tags">
                                        {article.tags.slice(0, 3).map((tag) => (
                                            <span key={tag} className="tag">{tag}</span>
                                        ))}
                                        {article.tags.length > 3 && (
                                            <span className="tag opacity-60">+{article.tags.length - 3}</span>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Git Panel */}
            <GitPanel
                status={gitStatus}
                onCommit={onCommit}
                onPush={onPush}
                onRefresh={onGitRefresh}
            />
        </aside>
    );
}

export default Sidebar;
