/**
 * Sidebar Component
 *
 * 記事一覧の表示とナビゲーション + Gitパネル
 */

import { ArticleListItem, GitStatus } from '../../types';
import { GitPanel } from '../Git';

interface SidebarProps {
    articles: ArticleListItem[];
    selectedSlug: string | null;
    onSelectArticle: (slug: string) => void;
    onNewArticle: () => void;
    loading?: boolean;
    gitStatus: GitStatus | null;
    onCommit: (message: string) => Promise<void>;
    onPush: () => Promise<void>;
    onGitRefresh: () => void;
}

// 日付をフォーマット（コンポーネント外に移動して再生成を防ぐ）
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export function Sidebar({
    articles,
    selectedSlug,
    onSelectArticle,
    onNewArticle,
    loading = false,
    gitStatus,
    onCommit,
    onPush,
    onGitRefresh,
}: SidebarProps) {

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

            {/* Article List */}
            <div className="sidebar-content">
                {loading ? (
                    <div className="p-4 text-center opacity-50">読み込み中...</div>
                ) : articles.length === 0 ? (
                    <div className="p-4 text-center opacity-50">記事がありません</div>
                ) : (
                    <ul className="article-list">
                        {articles.map((article) => (
                            <li
                                key={article.slug}
                                className={`article-item ${selectedSlug === article.slug ? 'selected' : ''}`}
                            >
                                <button
                                    onClick={() => onSelectArticle(article.slug)}
                                    className="article-item-button"
                                    aria-label={`記事を選択: ${article.title}`}
                                >
                                    <h3>{article.title}</h3>
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
                                </button>
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
