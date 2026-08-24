/**
 * Preview Component
 *
 * Markdownをリアルタイムでレンダリングするプレビューパネル
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { convertFileSrc } from '@tauri-apps/api/core';

interface PreviewProps {
    content: string;
    className?: string;
    repositoryPath?: string;
    articleFilePath?: string;
}

const URL_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[a-z]:[\\/]/i;

const decodeImagePath = (src: string): string => {
    try {
        return decodeURIComponent(src);
    } catch {
        return src;
    }
};

const normalizeFilePath = (path: string): string => {
    const slashPath = path.replace(/\\/g, '/');
    const drive = slashPath.match(/^[a-z]:/i)?.[0] ?? '';
    const isAbsolute = slashPath.startsWith('/') || Boolean(drive);
    const body = drive ? slashPath.slice(drive.length) : slashPath;
    const parts: string[] = [];

    for (const part of body.split('/')) {
        if (!part || part === '.') continue;
        if (part === '..') {
            if (parts.length > 0 && parts[parts.length - 1] !== '..') {
                parts.pop();
            } else if (!isAbsolute) {
                parts.push(part);
            }
            continue;
        }
        parts.push(part);
    }

    const prefix = drive ? `${drive}/` : isAbsolute ? '/' : '';
    return `${prefix}${parts.join('/')}`;
};

const directoryName = (path: string): string => {
    const normalized = normalizeFilePath(path);
    const separatorIndex = normalized.lastIndexOf('/');
    return separatorIndex >= 0 ? normalized.slice(0, separatorIndex) : normalized;
};

const joinFilePath = (basePath: string, relativePath: string): string =>
    normalizeFilePath(`${basePath}/${relativePath}`);

// Markdownの画像参照をWebViewで読み込めるURLへ変換する。
export const resolveImagePath = (
    src: string | undefined,
    repositoryPath: string | undefined,
    articleFilePath?: string,
): string => {
    if (!src) return '';

    const trimmedSrc = src.trim();

    // HTTPS/R2、data URL、既に変換済みのasset URLはそのまま使う。
    if (
        (!WINDOWS_ABSOLUTE_PATH_PATTERN.test(trimmedSrc) && URL_SCHEME_PATTERN.test(trimmedSrc))
        || trimmedSrc.startsWith('//')
    ) {
        return trimmedSrc;
    }

    if (!repositoryPath) return src;

    const decodedSrc = decodeImagePath(trimmedSrc);
    const normalizedSrc = decodedSrc.replace(/\\/g, '/');
    const repositoryRelativePath = normalizedSrc.replace(/^\/+/, '');
    let fullPath: string | null = null;

    if (repositoryRelativePath.startsWith('src/assets/images/')) {
        fullPath = joinFilePath(repositoryPath, repositoryRelativePath);
    } else if (normalizedSrc.startsWith('./') || normalizedSrc.startsWith('../')) {
        const basePath = articleFilePath
            ? directoryName(articleFilePath)
            : repositoryPath;
        fullPath = joinFilePath(basePath, normalizedSrc);
    } else if (normalizedSrc.startsWith('/') || WINDOWS_ABSOLUTE_PATH_PATTERN.test(normalizedSrc)) {
        fullPath = normalizeFilePath(normalizedSrc);
    }

    return fullPath ? convertFileSrc(fullPath) : src;
};

export function Preview({
    content,
    className = '',
    repositoryPath,
    articleFilePath,
}: PreviewProps) {
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
                                src={resolveImagePath(src, repositoryPath, articleFilePath)}
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
