/**
 * MDX Editor Component
 *
 * Monaco Editor のラッパー。iA Writer 準拠のショートカットを実装。
 */

import { useRef, useCallback } from 'react';
import MonacoEditor, { OnMount, Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface MDXEditorProps {
    value: string;
    onChange: (value: string) => void;
    darkMode?: boolean;
}

// iA Writer 準拠のショートカットはエディタマウント時に直接登録

export function MDXEditorComponent({ value, onChange, darkMode = false }: MDXEditorProps) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);

    // テキストをラッパーで囲む
    const wrapSelection = useCallback((wrapper: string, wrapperEnd?: string) => {
        const editor = editorRef.current;
        if (!editor) return;

        const selection = editor.getSelection();
        if (!selection) return;

        const model = editor.getModel();
        if (!model) return;

        const selectedText = model.getValueInRange(selection);
        const end = wrapperEnd || wrapper;
        const newText = `${wrapper}${selectedText}${end}`;

        editor.executeEdits('wrap', [{
            range: selection,
            text: newText,
        }]);
    }, []);

    // 行頭にプレフィックスを追加
    const addLinePrefix = useCallback((prefix: string) => {
        const editor = editorRef.current;
        if (!editor) return;

        const selection = editor.getSelection();
        if (!selection) return;

        const model = editor.getModel();
        if (!model) return;

        const lineNumber = selection.startLineNumber;
        const lineContent = model.getLineContent(lineNumber);

        // 既存の見出し記法を削除
        const cleanedLine = lineContent.replace(/^#{1,6}\s*/, '').replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '').replace(/^>\s*/, '');
        const newLine = prefix + cleanedLine;

        const range = {
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: lineContent.length + 1,
        };

        editor.executeEdits('prefix', [{
            range,
            text: newLine,
        }]);
    }, []);

    // リンク挿入
    const insertLink = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const selection = editor.getSelection();
        if (!selection) return;

        const model = editor.getModel();
        if (!model) return;

        const selectedText = model.getValueInRange(selection) || 'リンクテキスト';
        const newText = `[${selectedText}](url)`;

        editor.executeEdits('link', [{
            range: selection,
            text: newText,
        }]);
    }, []);

    // エディタマウント時の処理
    const handleEditorMount: OnMount = useCallback((editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // iA Writer ショートカットを登録
        // Cmd+B: 太字
        editor.addAction({
            id: 'mdx-bold',
            label: 'Bold',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
            run: () => wrapSelection('**'),
        });

        // Cmd+I: 斜体
        editor.addAction({
            id: 'mdx-italic',
            label: 'Italic',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
            run: () => wrapSelection('*'),
        });

        // Cmd+D: 取り消し線
        editor.addAction({
            id: 'mdx-strikethrough',
            label: 'Strikethrough',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD],
            run: () => wrapSelection('~~'),
        });

        // Cmd+K: リンク
        editor.addAction({
            id: 'mdx-link',
            label: 'Insert Link',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
            run: insertLink,
        });

        // Cmd+1~6: 見出し
        for (let i = 1; i <= 6; i++) {
            const keyCode = [
                monaco.KeyCode.Digit1,
                monaco.KeyCode.Digit2,
                monaco.KeyCode.Digit3,
                monaco.KeyCode.Digit4,
                monaco.KeyCode.Digit5,
                monaco.KeyCode.Digit6,
            ][i - 1];

            editor.addAction({
                id: `mdx-heading-${i}`,
                label: `Heading ${i}`,
                keybindings: [monaco.KeyMod.CtrlCmd | keyCode],
                run: () => addLinePrefix('#'.repeat(i) + ' '),
            });
        }

        // Cmd+L: 箇条書き
        editor.addAction({
            id: 'mdx-unordered-list',
            label: 'Unordered List',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
            run: () => addLinePrefix('- '),
        });

        // Cmd+Shift+L: 番号付きリスト
        editor.addAction({
            id: 'mdx-ordered-list',
            label: 'Ordered List',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL],
            run: () => addLinePrefix('1. '),
        });

        // Cmd+Shift+C: コードブロック
        editor.addAction({
            id: 'mdx-code-block',
            label: 'Code Block',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyC],
            run: () => wrapSelection('```\n', '\n```'),
        });

        // Cmd+': 引用
        editor.addAction({
            id: 'mdx-quote',
            label: 'Quote',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Quote],
            run: () => addLinePrefix('> '),
        });

        // Enter: リスト・引用の自動継続
        editor.addAction({
            id: 'mdx-auto-continue',
            label: 'Auto Continue List',
            keybindings: [monaco.KeyCode.Enter],
            run: () => {
                const position = editor.getPosition();
                if (!position) return;

                const model = editor.getModel();
                if (!model) return;

                const lineContent = model.getLineContent(position.lineNumber);

                // 箇条書きリスト: - item または * item
                const unorderedMatch = lineContent.match(/^(\s*)([-*])\s+(.*)$/);
                if (unorderedMatch) {
                    const [, indent, marker, content] = unorderedMatch;
                    // 空のリスト項目なら解除
                    if (!content.trim()) {
                        const range = {
                            startLineNumber: position.lineNumber,
                            startColumn: 1,
                            endLineNumber: position.lineNumber,
                            endColumn: lineContent.length + 1,
                        };
                        editor.executeEdits('clear-list', [{ range, text: '' }]);
                        return;
                    }
                    // 新しいリスト項目を追加
                    editor.trigger('keyboard', 'type', { text: `\n${indent}${marker} ` });
                    return;
                }

                // 番号付きリスト: 1. item
                const orderedMatch = lineContent.match(/^(\s*)(\d+)\.\s+(.*)$/);
                if (orderedMatch) {
                    const [, indent, num, content] = orderedMatch;
                    if (!content.trim()) {
                        const range = {
                            startLineNumber: position.lineNumber,
                            startColumn: 1,
                            endLineNumber: position.lineNumber,
                            endColumn: lineContent.length + 1,
                        };
                        editor.executeEdits('clear-list', [{ range, text: '' }]);
                        return;
                    }
                    const nextNum = parseInt(num, 10) + 1;
                    editor.trigger('keyboard', 'type', { text: `\n${indent}${nextNum}. ` });
                    return;
                }

                // 引用: > text
                const quoteMatch = lineContent.match(/^(\s*)(>+)\s*(.*)$/);
                if (quoteMatch) {
                    const [, indent, quotes, content] = quoteMatch;
                    if (!content.trim()) {
                        const range = {
                            startLineNumber: position.lineNumber,
                            startColumn: 1,
                            endLineNumber: position.lineNumber,
                            endColumn: lineContent.length + 1,
                        };
                        editor.executeEdits('clear-quote', [{ range, text: '' }]);
                        return;
                    }
                    editor.trigger('keyboard', 'type', { text: `\n${indent}${quotes} ` });
                    return;
                }

                // 通常の改行
                editor.trigger('keyboard', 'type', { text: '\n' });
            },
        });

        // フォーカス
        editor.focus();
    }, [wrapSelection, addLinePrefix, insertLink]);

    return (
        <div className="monaco-wrapper">
            <MonacoEditor
                height="100%"
                defaultLanguage="markdown"
                value={value}
                onChange={(val) => onChange(val || '')}
                onMount={handleEditorMount}
                theme={darkMode ? 'vs-dark' : 'vs'}
                options={{
                    fontSize: 16,
                    fontFamily: "'iA Writer Mono', 'JetBrains Mono', 'Menlo', monospace",
                    lineHeight: 28,
                    wordWrap: 'on',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 24, bottom: 24 },
                    lineNumbers: 'on',
                    lineNumbersMinChars: 3,
                    glyphMargin: false,
                    folding: false,
                    renderLineHighlight: 'none',
                    hideCursorInOverviewRuler: true,
                    overviewRulerLanes: 0,
                    scrollbar: {
                        vertical: 'auto',
                        horizontal: 'hidden',
                        verticalScrollbarSize: 8,
                    },
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                }}
            />
        </div>
    );
}

export default MDXEditorComponent;
