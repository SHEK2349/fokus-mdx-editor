import { create } from 'zustand';

export interface Article {
  id: string;
  slug: string;
  title: string;
  content: string;
  pubDatetime: string;
  description: string;
  draft: boolean;
  featured: boolean;
  tags: string[];
}

interface ArticlesState {
  articles: Article[];
  currentArticle: Article | null;
  loading: boolean;

  setArticles: (articles: Article[]) => void;
  setCurrentArticle: (article: Article | null) => void;
  addArticle: (article: Article) => void;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  deleteArticle: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useArticlesStore = create<ArticlesState>((set) => ({
  articles: [],
  currentArticle: null,
  loading: false,

  setArticles: (articles) => set({ articles }),
  setCurrentArticle: (article) => set({ currentArticle: article }),

  addArticle: (article) => set((state) => ({
    articles: [...state.articles, article],
  })),

  updateArticle: (id, updates) => set((state) => ({
    articles: state.articles.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    ),
    currentArticle: state.currentArticle?.id === id
      ? { ...state.currentArticle, ...updates }
      : state.currentArticle,
  })),

  deleteArticle: (id) => set((state) => ({
    articles: state.articles.filter((a) => a.id !== id),
    currentArticle: state.currentArticle?.id === id ? null : state.currentArticle,
  })),

  setLoading: (loading) => set({ loading }),
}));
