/**
 * Preview Component
 *
 * Markdownをリアルタイムでレンダリングするプレビューパネル
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PreviewProps {
    content: string;
    className?: string;
}

export function Preview({ content, className = '' }: PreviewProps) {
    return (
        <div className={`preview-panel ${className}`}>
            <div className="preview-content prose">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // カスタムコンポーネント
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
                        img: ({ src, alt }) => (
                            <img src={src} alt={alt} className="preview-img" loading="lazy" />
                        ),
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
}

export default Preview;
