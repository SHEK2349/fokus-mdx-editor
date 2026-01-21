/**
 * MDX Editor Types
 * 記事、Frontmatter、API レスポンスの型定義
 */

export interface ArticleFrontmatter {
    title: string;
    pubDatetime: string;
    description: string;
    modDatetime?: string;
    featured: boolean;
    draft: boolean;
    author: string;
    tags: string[];
    dek?: string;
    ogImage?: string;
    canonicalURL?: string;
    hideEditPost: boolean;
    timezone: string;
}

export interface Article {
    slug: string;
    frontmatter: ArticleFrontmatter;
    content: string;
    filepath: string;
}

export interface ArticleListItem {
    slug: string;
    title: string;
    pubDatetime: string;
    draft: boolean;
    featured: boolean;
    tags: string[];
}

export interface TagInfo {
    name: string;
    count: number;
}

export interface GitStatus {
    branch: string;
    isClean: boolean;
    modified: string[];
    added: string[];
    deleted: string[];
    ahead: number;
}

export interface CommitInfo {
    sha: string;
    message: string;
    author: string;
    date: string;
}

export interface AppSettings {
    blogDirectory: string;
    articlesPath: string;
    defaultAuthor: string;
    defaultTimezone: string;
    autoSaveInterval: number;
}
