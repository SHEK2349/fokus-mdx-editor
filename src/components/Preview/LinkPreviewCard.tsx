import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface LinkPreviewMetadata {
    url: string;
    title: string;
    hostname: string;
    description?: string;
    faviconUrl: string;
}

interface LinkPreviewCardProps {
    url: string;
    label?: string;
}

const metadataCache = new Map<string, LinkPreviewMetadata>();
const pendingRequests = new Map<string, Promise<LinkPreviewMetadata>>();

const createFallbackMetadata = (url: string, label?: string): LinkPreviewMetadata => {
    try {
        const parsedUrl = new URL(url);
        const labelIsUrl = !label || label.trim() === url || /^https?:\/\//i.test(label.trim());
        return {
            url,
            title: labelIsUrl ? parsedUrl.hostname : label.trim(),
            hostname: parsedUrl.hostname,
            faviconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsedUrl.hostname)}`,
        };
    } catch {
        return {
            url,
            title: label?.trim() || url,
            hostname: url,
            faviconUrl: '',
        };
    }
};

const loadMetadata = (url: string): Promise<LinkPreviewMetadata> => {
    const cached = metadataCache.get(url);
    if (cached) return Promise.resolve(cached);

    const pending = pendingRequests.get(url);
    if (pending) return pending;

    const request = invoke<LinkPreviewMetadata>('fetch_link_preview', {
        request: { url },
    })
        .then((metadata) => {
            metadataCache.set(url, metadata);
            return metadata;
        })
        .finally(() => pendingRequests.delete(url));

    pendingRequests.set(url, request);
    return request;
};

export function LinkPreviewCard({ url, label }: LinkPreviewCardProps) {
    const fallback = useMemo(() => createFallbackMetadata(url, label), [url, label]);
    const [metadata, setMetadata] = useState<LinkPreviewMetadata>(() => metadataCache.get(url) ?? fallback);
    const [faviconFailed, setFaviconFailed] = useState(false);

    useEffect(() => {
        let active = true;
        setMetadata(metadataCache.get(url) ?? fallback);
        setFaviconFailed(false);

        loadMetadata(url)
            .then((nextMetadata) => {
                if (active) setMetadata(nextMetadata);
            })
            .catch(() => {
                if (active) setMetadata(fallback);
            });

        return () => {
            active = false;
        };
    }, [url, fallback]);

    return (
        <a
            href={metadata.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="preview-link-card"
            aria-label={`${metadata.title}を新しいタブで開く`}
        >
            <span className="preview-link-card-favicon-area" aria-hidden="true">
                {metadata.faviconUrl && !faviconFailed && (
                    <img
                        src={metadata.faviconUrl}
                        alt=""
                        className="preview-link-card-favicon"
                        loading="lazy"
                        onError={() => setFaviconFailed(true)}
                    />
                )}
            </span>
            <span className="preview-link-card-content">
                <span className="preview-link-card-title">{metadata.title}</span>
                <span className="preview-link-card-hostname">{metadata.hostname}</span>
            </span>
            <span className="preview-link-card-external" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                </svg>
            </span>
        </a>
    );
}

export default LinkPreviewCard;
