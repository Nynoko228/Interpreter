'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

// Импорты для новой функциональности
import { LanguageType, autoDetectLanguage, getLanguageDisplayName } from '../utils/languageSupport';
import { ThemeType } from '../utils/themeIntegration';
import { 
  createEditorExtensions, 
  createUpdateListener, 
  createStatsExtension,
  EditorConfig,
  getDefaultConfig
} from '../utils/editorExtensions';
import { indentUnit } from '@codemirror/language';

// Интерфейс пропсов компонента
interface CodeEditorProps {
  content?: string;
  filename?: string;
  language?: LanguageType;
  theme?: ThemeType;
  readOnly?: boolean;
  lineNumbers?: boolean;
  onContentChange?: (content: string) => void;
  onLanguageChange?: (language: LanguageType) => void;
  onSelectionChange?: (selection: { from: number; to: number; line: number; column: number }) => void;
  onStatsChange?: (stats: EditorStats) => void;
}

// Интерфейс статистики редактора
interface EditorStats {
  lines: number;
  length: number;
  words: number;
  language: LanguageType;
  selection: {
    from: number;
    to: number;
    line: number;
    column: number;
  };
}

export default function CodeEditor({ 
  content = '', 
  filename,
  language,
  theme = 'dark',
  readOnly = false,
  lineNumbers = true,
  onContentChange,
  onLanguageChange,
  onSelectionChange,
  onStatsChange
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  
  // Состояние редактора
  const [currentLanguage, setCurrentLanguage] = useState<LanguageType>(language || 'text');
  const [editorStats, setEditorStats] = useState<EditorStats>({
    lines: 1,
    length: 0,
    words: 0,
    language: currentLanguage,
    selection: { from: 0, to: 0, line: 1, column: 1 }
  });

  // Автоматическое определение языка
  const detectLanguage = useCallback(() => {
    if (language) return language; // Если язык задан явно, используем его
    
    const detectedLanguage = autoDetectLanguage(filename, content);
    return detectedLanguage;
  }, [language, filename, content]);

  // Обработчики событий
  const handleContentChange = useCallback((newContent: string) => {
    onContentChange?.(newContent);
    
    // Обновляем статистику
    const doc = viewRef.current?.state.doc;
    if (doc) {
      const newStats = {
        lines: doc.lines,
        length: doc.length,
        words: newContent.split(/\s+/).filter(w => w.length > 0).length,
        language: currentLanguage,
        selection: editorStats.selection
      };
      setEditorStats(newStats);
      onStatsChange?.(newStats);
    }
  }, [onContentChange, currentLanguage, editorStats.selection, onStatsChange]);

  const handleSelectionChange = useCallback((selection: { from: number; to: number; line: number; column: number }) => {
    onSelectionChange?.(selection);
    
    // Обновляем статистику выделения
    setEditorStats(prev => ({
      ...prev,
      selection
    }));
  }, [onSelectionChange]);

  const handleLanguageChange = useCallback((newLanguage: LanguageType) => {
    setCurrentLanguage(newLanguage);
    onLanguageChange?.(newLanguage);
    
    setEditorStats(prev => ({
      ...prev,
      language: newLanguage
    }));
  }, [onLanguageChange]);

  // Создание конфигурации редактора
  const createConfig = useCallback((): EditorConfig => {
    const detectedLanguage = detectLanguage();
    
    return getDefaultConfig({
      language: detectedLanguage,
      theme,
      readOnly,
      lineNumbers,
      highlightActiveLine: true,
      foldGutter: true,
      autocompletion: !readOnly,
      bracketMatching: true,
      closeBrackets: !readOnly,
      searchHighlight: true,
      indentOnInput: !readOnly
    });
  }, [detectLanguage, theme, readOnly, lineNumbers]);

  // Инициализация редактора
  useEffect(() => {
    if (!editorRef.current) return;

    const config = createConfig();
    
    // Обновляем текущий язык если он изменился
    if (config.language !== currentLanguage) {
      setCurrentLanguage(config.language);
      handleLanguageChange(config.language);
    }

    // Создаем расширения редактора
    const extensions = [
      ...createEditorExtensions(config),
      createUpdateListener(
        handleContentChange,
        handleSelectionChange
      ),
      indentUnit.of("    "),
      createStatsExtension()
    ];

    // Создаем состояние редактора
    const state = EditorState.create({
      doc: content,
      extensions
    });

    // Инициализируем редактор
    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Инициализируем статистику
    const initialStats = {
      lines: view.state.doc.lines,
      length: view.state.doc.length,
      words: content.split(/\s+/).filter(w => w.length > 0).length,
      language: config.language,
      selection: { from: 0, to: 0, line: 1, column: 1 }
    };
    setEditorStats(initialStats);
    onStatsChange?.(initialStats);

    // Очистка при размонтировании
    return () => {
      view.destroy();
    };
  }, [theme, readOnly, lineNumbers]); // Пересоздаем редактор при изменении темы или режимов

  // Обновление содержимого
  useEffect(() => {
    if (viewRef.current && content !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: content
        }
      });
    }
  }, [content]);

  // Слушатель статистики редактора
  useEffect(() => {
    const handleEditorStats = (event: CustomEvent) => {
      const stats = event.detail;
      setEditorStats(prev => ({
        ...prev,
        ...stats
      }));
      onStatsChange?.(stats);
    };

    window.addEventListener('editorStats', handleEditorStats as EventListener);
    return () => {
      window.removeEventListener('editorStats', handleEditorStats as EventListener);
    };
  }, [onStatsChange]);

  return (
    <div className="editor-container">
      <div 
        ref={editorRef} 
        className="code-mirror-editor"
        data-language={currentLanguage}
        data-theme={theme}
      />
      
      {/* Скрытый элемент для передачи статистики родительскому компоненту */}
      <div 
        className="editor-stats" 
        style={{ display: 'none' }}
        data-stats={JSON.stringify(editorStats)}
      />
    </div>
  );
}

// Экспорт типов для использования в других компонентах
export type { EditorStats };
export { type LanguageType, getLanguageDisplayName } from '../utils/languageSupport';
export { type ThemeType } from '../utils/themeIntegration';