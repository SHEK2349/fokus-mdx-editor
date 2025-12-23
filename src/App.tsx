/**
 * Fokus MDX Editor
 *
 * Astroブログ用MDXエディタのメインアプリケーション
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { MDXEditorComponent } from './components/Editor';
import { Sidebar } from './components/Sidebar';
import { FrontmatterEditor } from './components/Frontmatter';
import { Preview } from './components/Preview';
import { SettingsModal } from './components/Settings';
import { WelcomeScreen } from './components/Welcome';
import type { ArticleListItem, Article, GitStatus } from './types';
import { TutorialOverlay, type TutorialStep } from './components/Tutorial';
import './index.css';

function App() {
  // ダークモードの初期値: localStorage → システム設定 → false
  const getInitialDarkMode = () => {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      return stored === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  // State
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [content, setContent] = useState('');
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);
  const [showPreview, setShowPreview] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [repositoryPath, setRepositoryPath] = useState('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 記事一覧を取得
  const fetchArticles = useCallback(async () => {
    try {
      const data = await invoke<ArticleListItem[]>('list_articles');
      setArticles(data);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 設定を取得
  const fetchSettings = useCallback(async () => {
    try {
      // まずlocalStorageから設定を読み込み
      const saved = localStorage.getItem('fokus-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.repositoryPath && parsed.articlesPath) {
          // Rustバックエンドに設定を送信
          await invoke('save_repository_settings', {
            request: {
              repository_path: parsed.repositoryPath,
              articles_path: parsed.articlesPath,
            }
          });
          setRepositoryPath(parsed.repositoryPath);
          return;
        }
      }

      // localStorageに設定がない場合はRustバックエンドから取得
      const data = await invoke<{ repository_path: string; articles_path: string; is_configured: boolean }>('get_settings');
      setRepositoryPath(data.repository_path || '');
      if (!data.is_configured) {
        setShowSettings(true);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setShowSettings(true);
    }
  }, []);

  // Git ステータスを取得
  const fetchGitStatus = useCallback(async () => {
    try {
      const data = await invoke<GitStatus>('get_git_status');
      setGitStatus(data);
    } catch (error) {
      console.error('Failed to fetch git status:', error);
    }
  }, []);

  // 設定更新後のハンドラ
  const handleSettingsUpdated = useCallback(() => {
    fetchSettings();
    fetchArticles();
    fetchGitStatus();
    // 初回設定完了後、エディタチュートリアルを開始
    const seen = localStorage.getItem('fokus-tutorial-seen');
    if (!seen) {
      setTimeout(() => setShowTutorial(true), 500);
    }
  }, [fetchSettings, fetchArticles, fetchGitStatus]);

  // 記事を選択
  const handleSelectArticle = useCallback(async (slug: string) => {
    // 未保存の場合は確認
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('未保存の変更があります。破棄して他の記事を開きますか？');
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      // タイムアウト設定（10秒）
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('読み込みがタイムアウトしました。ファイルが大きすぎるか、破損している可能性があります。')), 10000)
      );

      const article = await Promise.race([
        invoke<Article>('get_article', { slug }),
        timeout
      ]);

      setCurrentArticle(article);
      setContent(article.content);
      setLastSavedContent(article.content);
      setHasUnsavedChanges(false);
      setSelectedSlug(slug);
    } catch (error) {
      console.error('Failed to load article:', error);
      const errorMessage = error instanceof Error ? error.message : '指定された記事が見つかりませんでした。';
      alert(`記事の読み込みに失敗しました: ${errorMessage}`);
      fetchArticles();
    } finally {
      setLoading(false);
    }
  }, [hasUnsavedChanges, fetchArticles]);

  // 記事を保存
  const handleSave = useCallback(async () => {
    if (!currentArticle) return;

    setSaving(true);
    try {
      const isNew = !currentArticle.filepath;

      let savedArticle: Article;
      if (isNew) {
        savedArticle = await invoke<Article>('create_article', {
          request: {
            slug: currentArticle.slug,
            frontmatter: currentArticle.frontmatter,
            content,
          }
        });
      } else {
        savedArticle = await invoke<Article>('update_article', {
          slug: selectedSlug,
          request: {
            slug: currentArticle.slug,
            frontmatter: currentArticle.frontmatter,
            content,
          }
        });
      }

      console.log('Saved successfully');
      if (isNew) {
        setCurrentArticle({ ...currentArticle, filepath: savedArticle.filepath });
        setSelectedSlug(savedArticle.slug);
        fetchArticles();
      } else if (savedArticle.slug !== selectedSlug) {
        setSelectedSlug(savedArticle.slug);
        setCurrentArticle({ ...currentArticle, filepath: savedArticle.filepath });
        fetchArticles();
      }
      setLastSavedContent(content);
      setHasUnsavedChanges(false);
      fetchGitStatus();
    } catch (error) {
      console.error('Failed to save:', error);
      alert(`保存に失敗しました: ${error}`);
    } finally {
      setSaving(false);
    }
  }, [currentArticle, content, selectedSlug, fetchGitStatus, fetchArticles]);

  // 新規記事作成
  const handleNewArticle = useCallback(() => {
    // 未保存の場合は確認
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('未保存の変更があります。破棄して新規記事を作成しますか？');
      if (!confirmed) return;
    }

    const now = new Date();
    const slug = `new-article-${now.getTime()}`;

    // 日本時間でISO形式のタイムスタンプを生成
    const jpDatetime = new Date(now.getTime() + 9 * 60 * 60 * 1000)
      .toISOString()
      .replace('Z', '+09:00');

    setCurrentArticle({
      slug,
      frontmatter: {
        title: '新しい記事',
        pubDatetime: jpDatetime,
        description: '',
        featured: false,
        draft: true,
        author: 'SHEK',
        tags: [],
        hideEditPost: false,
        timezone: 'Asia/Tokyo',
      },
      content: '',
      filepath: '',
    });
    setContent('');
    setLastSavedContent('');
    setHasUnsavedChanges(false);
    setSelectedSlug(null);
    setLoading(false); // 確実にloading状態をfalseに設定
  }, [hasUnsavedChanges]);

  // Git コミット
  const handleCommit = useCallback(async (message?: string) => {
    const commitMessage = message || prompt('コミットメッセージを入力:');
    if (!commitMessage) return;

    try {
      await invoke('git_commit', { request: { message: commitMessage } });
      console.log('Committed successfully');
      fetchGitStatus();
    } catch (error) {
      console.error('Failed to commit:', error);
    }
  }, [fetchGitStatus]);

  // Git プッシュ
  const handlePush = useCallback(async () => {
    try {
      await invoke('git_push');
      console.log('Pushed successfully');
      fetchGitStatus();
    } catch (error) {
      console.error('Failed to push:', error);
    }
  }, [fetchGitStatus]);

  // Welcome & Tutorial State
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // 初回起動チェック
    const seen = localStorage.getItem('fokus-tutorial-seen');
    if (!seen) {
      // 初回起動時はウェルカム画面を表示
      setTimeout(() => setShowWelcome(true), 500);
    }
  }, []);

  // ウェルカム画面の「始める」ボタン
  const handleWelcomeStart = () => {
    setShowWelcome(false);
    // 設定モーダルを開く
    setTimeout(() => setShowSettings(true), 300);
  };

  const handleTutorialComplete = () => {
    localStorage.setItem('fokus-tutorial-seen', 'true');
    setShowTutorial(false);
  };

  const handleTutorialSkip = () => {
    localStorage.setItem('fokus-tutorial-seen', 'true');
    setShowTutorial(false);
  };

  // エディタ UI 説明用チュートリアルステップ（ウェルカムは別画面に分離）
  const tutorialSteps: TutorialStep[] = [
    {
      target: ".sidebar-toggle-btn",
      title: "サイドバー切替",
      description: "ハンバーガーメニューでサイドバーを開閉できます。\n集中モードに入りたい時は閉じておきましょう。",
    },
    {
      target: ".sidebar",
      title: "記事管理 & Git",
      description: "記事の選択やGit操作（コミット・プッシュ）はここから行えます。",
      position: 'right',
    },
    {
      target: ".save-btn",
      title: "保存とステータス",
      description: "記事の保存を行います。変更状態もここから確認できます。\n(Cmd+S)",
    },
    {
      target: ".preview-toggle-btn",
      title: "プレビュー切替",
      description: "エディタとプレビューモードの表示を切り替えます。",
    },
    {
      target: ".theme-toggle-btn",
      title: "テーマ切替",
      description: "ダークモードとライトモードを切り替えます。",
    },
    {
      target: ".settings-btn",
      title: "設定 & ショートカット",
      description: "リポジトリパスの変更や、ショートカットキーの一覧確認はこちらから。",
    },
    {
      target: ".new-article-btn",
      title: "さあ、始めましょう",
      description: "新規記事ボタンをクリックして、執筆を開始しましょう！",
    }
  ];


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // 初回読み込み
  useEffect(() => {
    fetchSettings();
    fetchArticles();
    fetchGitStatus();
  }, [fetchSettings, fetchArticles, fetchGitStatus]);

  // コンテンツ変更検出と自動保存（30秒）
  useEffect(() => {
    if (!currentArticle) return;

    // 変更を検出
    const hasChanges = content !== lastSavedContent;
    setHasUnsavedChanges(hasChanges);

    // 既存のタイマーをクリア
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // 変更がある場合、30秒後に自動保存
    if (hasChanges && content) {
      autoSaveTimerRef.current = setTimeout(() => {
        console.log('Auto-saving...');
        handleSave();
      }, 30000); // 30秒
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content, lastSavedContent, currentArticle, handleSave]);

  // ページ離脱時の警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '未保存の変更があります。このページを離れますか？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Dark mode toggle - localStorageに保存
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  return (
    <div className="app-container">
      {/* Toolbar */}
      <header className="toolbar">
        <button
          className="hamburger-btn sidebar-toggle-btn"
          onClick={() => setShowSidebar(!showSidebar)}
          title={showSidebar ? 'サイドバーを閉じる' : 'サイドバーを開く'}
        >
          ☰
        </button>
        <img src="/app-icon.png" alt="Fokus" className="app-icon" />
        <h1 className="text-lg font-semibold">Fokus. Editor</h1>
        {repositoryPath && (
          <span className="repo-name" title={repositoryPath}>
            {repositoryPath.split('/').pop()}
          </span>
        )}

        <button
          className="icon-btn save-btn"
          onClick={handleSave}
          disabled={saving || !currentArticle}
          title={saving ? '保存中...' : '保存'}
        >
          {hasUnsavedChanges ? '●' : '✓'}
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setShowPreview(!showPreview)}
          className="icon-btn preview-toggle-btn"
          title={showPreview ? 'プレビューを非表示' : 'プレビューを表示'}
        >
          {showPreview ? '◫' : '◨'}
        </button>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="icon-btn theme-toggle-btn"
          title={darkMode ? 'ライトモード' : 'ダークモード'}
        >
          {darkMode ? '○' : '●'}
        </button>

        <button
          className="icon-btn settings-btn"
          onClick={() => setShowSettings(true)}
          title="設定"
        >
          ⚙
        </button>

        <button
          className="icon-btn help-btn"
          onClick={() => setShowTutorial(true)}
          title="ヘルプ（チュートリアル）"
        >
          ?
        </button>
      </header>

      {/* Sidebar */}
      {showSidebar && (
        <Sidebar
          articles={articles}
          selectedSlug={selectedSlug}
          onSelectArticle={handleSelectArticle}
          onNewArticle={handleNewArticle}
          loading={loading}
          gitStatus={gitStatus}
          onCommit={handleCommit}
          onPush={handlePush}
          onGitRefresh={fetchGitStatus}
        />
      )}

      {/* Main Content */}
      <main className={`main-content ${!showSidebar ? 'full-width' : ''}`}>
        {currentArticle ? (
          <div className="editor-container">
            {/* Frontmatter Editor */}
            <FrontmatterEditor
              frontmatter={currentArticle.frontmatter}
              slug={currentArticle.slug}
              onChange={(newFrontmatter) =>
                setCurrentArticle({
                  ...currentArticle,
                  frontmatter: newFrontmatter,
                })
              }
              onSlugChange={(newSlug) =>
                setCurrentArticle({
                  ...currentArticle,
                  slug: newSlug,
                })
              }
            />

            {/* Editor + Preview */}
            <div className="editor-preview-container">
              <div className="editor-pane">
                {loading ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>記事を読み込み中...</p>
                  </div>
                ) : (
                  <>
                    <MDXEditorComponent
                      value={content}
                      onChange={setContent}
                      darkMode={darkMode}
                    />
                    <div className="editor-status-bar">
                      <span>{content.length} 文字</span>
                    </div>
                  </>
                )}
              </div>
              {showPreview && (
                <div className="preview-pane">
                  <Preview content={content} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full opacity-50">
            <p>記事を選択するか、新規作成してください</p>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          // 初回起動でキャンセルした場合もチュートリアルを開始
          const seen = localStorage.getItem('fokus-tutorial-seen');
          if (!seen) {
            setTimeout(() => setShowTutorial(true), 500);
          }
        }}
        onSettingsUpdated={handleSettingsUpdated}
        isInitialSetup={!localStorage.getItem('fokus-tutorial-seen')}
      />

      {/* Tutorial Overlay */}
      <TutorialOverlay
        isActive={showTutorial}
        steps={tutorialSteps}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
      />

      {/* Welcome Screen */}
      {showWelcome && (
        <WelcomeScreen onStart={handleWelcomeStart} />
      )}
    </div>
  );
}

export default App;
