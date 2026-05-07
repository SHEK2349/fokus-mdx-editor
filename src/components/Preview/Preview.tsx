/**
 * Preview Component
 *
 * Markdownをリアルタイムでレンダリングするプレビューパネル
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


interface PreviewProps {
    content: string;
    className?: string;
    repositoryPath?: string;
}

// ローカル画像パスをファイルURLに変換
const resolveImagePath = (src: string | undefined, repositoryPath: string | undefined): string => {
    if (!src) return '';

    // ローカルパス (src/assets/images/...) をファイルURLに変換
    // ローカルパス (src/assets/images/...) をファイルURLに変換
    if (src.startsWith('src/assets/images/') && repositoryPath) {
        // Markdownパーサーによってエンコードされている可能性があるためデコードする
        const decodedSrc = decodeURIComponent(src);
        const fullPath = `${repositoryPath}/${decodedSrc}`;

        // convertFileSrcの代わりに手動でhttp://asset.localhost形式に変換
        // macOS/WebKitでの互換性のため
        const isWindows = navigator.userAgent.includes('Windows');
        let resolved = '';

        if (isWindows) {
            resolved = `http://asset.localhost/${encodeURIComponent(fullPath)}`;
        } else {
            // macOS/Linux
            resolved = `http://asset.localhost/${encodeURIComponent(fullPath)}`;
        }

        console.log('[Preview Image]', { src, decodedSrc, repositoryPath, fullPath, resolved });
        return resolved;
    }

    console.log('[Preview Image] Not resolved:', { src, repositoryPath });
    // R2 URLやhttp(s)はそのまま
    return src;
};

export function Preview({ content, className = '', repositoryPath }: PreviewProps) {
    return (
        <div className={`preview-panel ${className}`}>
            <div className="preview-content prose">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // カスタムコンポーネント
                        h1: ({ children }: { children?: React.ReactNode }) => <h1 className="preview-h1">{children}</h1>,
                        h2: ({ children }: { children?: React.ReactNode }) => <h2 className="preview-h2">{children}</h2>,
                        h3: ({ children }: { children?: React.ReactNode }) => <h3 className="preview-h3">{children}</h3>,
                        a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="preview-link">
                                {children}
                            </a>
                        ),
                        code: ({ className, children, ...props }: any) => {
                            const isInline = !className;
                            return isInline ? (
                                <code className="preview-inline-code" {...props}>{children}</code>
                            ) : (
                                <code className={`preview-code-block ${className || ''}`} {...props}>
                                    {children}
                                </code>
                            );
                        },
                        pre: ({ children }: { children?: React.ReactNode }) => <pre className="preview-pre">{children}</pre>,
                        blockquote: ({ children }: { children?: React.ReactNode }) => (
                            <blockquote className="preview-blockquote">{children}</blockquote>
                        ),
                        ul: ({ children }: { children?: React.ReactNode }) => <ul className="preview-ul">{children}</ul>,
                        ol: ({ children }: { children?: React.ReactNode }) => <ol className="preview-ol">{children}</ol>,
                        li: ({ children }: { children?: React.ReactNode }) => <li className="preview-li">{children}</li>,
                        table: ({ children }: { children?: React.ReactNode }) => (
                            <div className="preview-table-wrapper">
                                <table className="preview-table">{children}</table>
                            </div>
                        ),
                        img: ({ src, alt }: { src?: string; alt?: string }) => (
                            <img
                                src={resolveImagePath(src, repositoryPath)}
                                alt={alt}
                                className="preview-img"
                                loading="lazy"
                            />
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
