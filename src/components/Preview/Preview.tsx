/**
 * Preview Component
 *
 * Markdownをリアルタイムでレンダリングするプレビューパネル
 */

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { Components } from 'react-markdown';

interface PreviewProps {
    content: string;
    className?: string;
    repositoryPath?: string;
}

// ローカル画像パスをファイルURLに変換
const resolveImagePath = (src: string | undefined, repositoryPath: string | undefined): string => {
    if (!src) return '';

    // ローカルパス (src/assets/images/...) をファイルURLに変換
    if (src.startsWith('src/assets/images/') && repositoryPath) {
        return convertFileSrc(`${repositoryPath}/${src}`);
    }

    // R2 URLやhttp(s)はそのまま
    return src;
};

// コンポーネント定義を外部に移動（repositoryPathに依存しない部分）
const baseComponents: Components = {
    h1: ({ children }) => <h1 className="preview-h1">{children}</h1>,
    h2: ({ children }) => <h2 className="preview-h2">{children}</h2>,
    h3: ({ children }) => <h3 className="preview-h3">{children}</h3>,
    a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="preview-link">
            {children}
        </a>
    ),
    code: ({ className, children, ...props }) => {
        const isInline = !className;
        return isInline ? (
            <code className="preview-inline-code" {...props}>{children}</code>
        ) : (
            <code className={`preview-code-block ${className || ''}`} {...props}>
                {children}
            </code>
        );
    },
    pre: ({ children }) => <pre className="preview-pre">{children}</pre>,
    blockquote: ({ children }) => (
        <blockquote className="preview-blockquote">{children}</blockquote>
    ),
    ul: ({ children }) => <ul className="preview-ul">{children}</ul>,
    ol: ({ children }) => <ol className="preview-ol">{children}</ol>,
    li: ({ children }) => <li className="preview-li">{children}</li>,
    table: ({ children }) => (
        <div className="preview-table-wrapper">
            <table className="preview-table">{children}</table>
        </div>
    ),
};

export const Preview = memo(function Preview({ content, className = '', repositoryPath }: PreviewProps) {
    // repositoryPathに依存するimgコンポーネントのみuseMemoで生成
    const components = useMemo<Components>(() => ({
        ...baseComponents,
        img: ({ src, alt }) => (
            <img
                src={resolveImagePath(src, repositoryPath)}
                alt={alt}
                className="preview-img"
                loading="lazy"
            />
        ),
    }), [repositoryPath]);

    return (
        <div className={`preview-panel ${className}`}>
            <div className="preview-content prose">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={components}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
});

export default Preview;
