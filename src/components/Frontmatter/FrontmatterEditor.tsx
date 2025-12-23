/**
 * Frontmatter Editor Component
 *
 * 記事のメタデータをフォーム形式で編集するコンポーネント
 */

import { useState } from 'react';
import type { ArticleFrontmatter } from '../../types';

interface FrontmatterEditorProps {
    frontmatter: ArticleFrontmatter;
    slug: string;
    onChange: (frontmatter: ArticleFrontmatter) => void;
    onSlugChange: (slug: string) => void;
}

export function FrontmatterEditor({
    frontmatter,
    slug,
    onChange,
    onSlugChange,
}: FrontmatterEditorProps) {
    const [tagInput, setTagInput] = useState('');
    const [isExpanded, setIsExpanded] = useState(true);

    // Frontmatterの特定フィールドを更新
    const updateField = <K extends keyof ArticleFrontmatter>(
        key: K,
        value: ArticleFrontmatter[K]
    ) => {
        onChange({ ...frontmatter, [key]: value });
    };

    // タグを追加
    const addTag = () => {
        const newTag = tagInput.trim();
        if (newTag && !frontmatter.tags.includes(newTag)) {
            updateField('tags', [...frontmatter.tags, newTag]);
            setTagInput('');
        }
    };

    // タグを削除
    const removeTag = (tagToRemove: string) => {
        updateField('tags', frontmatter.tags.filter((t) => t !== tagToRemove));
    };

    // Enterキーでタグ追加
    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    };

    return (
        <div className={`frontmatter-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <div
                className="frontmatter-header"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span className="text-sm font-medium opacity-70">メタデータ</span>
                <span className="text-xs opacity-50">{isExpanded ? '▼' : '▶'}</span>
            </div>

            {isExpanded && (
                <div className="frontmatter-form">
                    {/* Row 1: タイトル */}
                    <div className="form-group full-width">
                        <label>タイトル</label>
                        <input
                            type="text"
                            value={frontmatter.title}
                            onChange={(e) => updateField('title', e.target.value)}
                            placeholder="記事のタイトル"
                        />
                    </div>

                    {/* Row 2: スラッグ・著者 */}
                    <div className="form-group">
                        <label>スラッグ (URL)</label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => onSlugChange(e.target.value)}
                            placeholder="your-blog-post-slug"
                        />
                    </div>
                    <div className="form-group">
                        <label>著者</label>
                        <input
                            type="text"
                            value={frontmatter.author}
                            onChange={(e) => updateField('author', e.target.value)}
                            placeholder="SHEK"
                        />
                    </div>

                    {/* Row 3: 公開日時・トグル */}
                    <div className="form-group">
                        <label>公開日時</label>
                        <div className="datetime-input-group">
                            <input
                                type="date"
                                value={frontmatter.pubDatetime?.slice(0, 10) || ''}
                                onChange={(e) => {
                                    const date = e.target.value;
                                    const time = frontmatter.pubDatetime?.slice(11, 16) || '00:00';
                                    updateField('pubDatetime', `${date}T${time}:00.000Z`);
                                }}
                                placeholder="2024-01-01"
                            />
                            <input
                                type="time"
                                value={frontmatter.pubDatetime?.slice(11, 16) || ''}
                                onChange={(e) => {
                                    const date = frontmatter.pubDatetime?.slice(0, 10) || new Date().toISOString().slice(0, 10);
                                    const time = e.target.value;
                                    updateField('pubDatetime', `${date}T${time}:00.000Z`);
                                }}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <div className="flex gap-6">
                            <div className="toggle-group">
                                <label>下書き</label>
                                <div
                                    className={`toggle ${frontmatter.draft ? 'active' : ''}`}
                                    onClick={() => updateField('draft', !frontmatter.draft)}
                                />
                            </div>
                            <div className="toggle-group">
                                <label>おすすめ</label>
                                <div
                                    className={`toggle ${frontmatter.featured ? 'active' : ''}`}
                                    onClick={() => updateField('featured', !frontmatter.featured)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 4: タグ */}
                    <div className="form-group full-width">
                        <label>タグ</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {frontmatter.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="tag cursor-pointer hover:opacity-70"
                                    onClick={() => removeTag(tag)}
                                    title="クリックで削除"
                                >
                                    {tag} ×
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                placeholder="タグを入力してEnter"
                                className="flex-1"
                            />
                            <button
                                type="button"
                                onClick={addTag}
                                className="px-3 py-1 rounded text-sm"
                                style={{
                                    backgroundColor: 'var(--accent)',
                                    color: 'var(--background)',
                                    border: 'none',
                                }}
                            >
                                追加
                            </button>
                        </div>
                    </div>

                    {/* Row 5: 説明文 (SEO) */}
                    <div className="form-group full-width">
                        <label>説明文 (SEO用メタディスクリプション)</label>
                        <textarea
                            value={frontmatter.description || ''}
                            onChange={(e) => updateField('description', e.target.value)}
                            placeholder="検索結果やSNSシェア時に表示される説明文（160文字程度推奨）"
                            rows={2}
                            className="resize-none"
                        />
                    </div>

                    {/* Row 6: リード文 (dek) */}
                    <div className="form-group full-width">
                        <label>リード文 (dek)</label>
                        <textarea
                            value={frontmatter.dek || ''}
                            onChange={(e) => updateField('dek', e.target.value)}
                            placeholder="タイトルの下に表示される記事の要約や導入文"
                            rows={2}
                            className="resize-none"
                        />
                    </div>

                    {/* Row 7: カノニカルURL */}
                    <div className="form-group full-width">
                        <label>正規URL (カノニカル)</label>
                        <input
                            type="url"
                            value={frontmatter.canonicalURL || ''}
                            onChange={(e) => updateField('canonicalURL', e.target.value)}
                            placeholder="https://example.com/posts/your-blog-post-slug"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default FrontmatterEditor;
