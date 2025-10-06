/**
 * Конфигурация расширений редактора CodeMirror
 * Объединяет все необходимые расширения для полнофункционального редактора кода
 */

import { Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, dropCursor, drawSelection, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { foldGutter, indentOnInput, bracketMatching, foldKeymap } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';

import { LanguageType, getLanguageExtension } from './languageSupport';
import { ThemeType, getThemeExtensions } from './themeIntegration';

// Интерфейс конфигурации редактора
export interface EditorConfig {
  language: LanguageType;
  theme: ThemeType;
  lineNumbers: boolean;
  lineWrapping: boolean;
  highlightActiveLine: boolean;
  foldGutter: boolean;
  autocompletion: boolean;
  bracketMatching: boolean;
  closeBrackets: boolean;
  searchHighlight: boolean;
  indentOnInput: boolean;
  tabSize: number;
  readOnly: boolean;
}

// Конфигурация по умолчанию
export const defaultEditorConfig: EditorConfig = {
  language: 'mcf',
  theme: 'dark',
  lineNumbers: true,
  lineWrapping: false,
  highlightActiveLine: true,
  foldGutter: true,
  autocompletion: true,
  bracketMatching: true,
  closeBrackets: true,
  searchHighlight: true,
  indentOnInput: true,
  tabSize: 4,
  readOnly: false
};

/**
 * Создает базовые расширения редактора
 */
function createBaseExtensions(): Extension[] {
  return [
    // История редактирования
    history(),
    
    // Отрисовка выделения
    drawSelection(),
    
    // Поддержка перетаскивания
    dropCursor(),
    
    // Курсор перекрестие при прямоугольном выделении
    rectangularSelection(),
    crosshairCursor(),
    
    // Базовые привязки клавиш
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...searchKeymap,
      ...closeBracketsKeymap,
      ...lintKeymap,
      indentWithTab
    ]),
    
    // Обновление вида при изменениях
    EditorView.updateListener.of((update) => {
      // Здесь можно добавить логику для обработки изменений
      if (update.docChanged || update.selectionSet) {
        // Обновление статуса, если нужно
      }
    })
  ];
}

/**
 * Создает расширения для поддержки языка
 */
function createLanguageExtensions(language: LanguageType): Extension[] {
  const extensions: Extension[] = [];
  
  // Добавляем поддержку языка
  const langExtension = getLanguageExtension(language);
  if (langExtension) {
    extensions.push(langExtension);
  }
  
  return extensions;
}

/**
 * Создает расширения для визуального оформления
 */
function createVisualExtensions(config: EditorConfig): Extension[] {
  const extensions: Extension[] = [];
  
  // Номера строк
  if (config.lineNumbers) {
    extensions.push(lineNumbers());
  }
  
  // Подсветка активной строки
  if (config.highlightActiveLine) {
    extensions.push(
      highlightActiveLine(),
      highlightActiveLineGutter()
    );
  }
  
  // Сворачивание кода
  if (config.foldGutter) {
    extensions.push(foldGutter());
  }
  
  // Перенос строк
  if (config.lineWrapping) {
    extensions.push(EditorView.lineWrapping);
  }
  
  // Подсветка совпадений при поиске
  if (config.searchHighlight) {
    extensions.push(highlightSelectionMatches());
  }
  
  return extensions;
}

/**
 * Создает расширения для редактирования
 */
function createEditingExtensions(config: EditorConfig): Extension[] {
  const extensions: Extension[] = [];
  
  // Автодополнение
  if (config.autocompletion) {
    extensions.push(autocompletion());
  }
  
  // Сопоставление скобок
  if (config.bracketMatching) {
    extensions.push(bracketMatching());
  }
  
  // Автозакрытие скобок
  if (config.closeBrackets) {
    extensions.push(closeBrackets());
  }
  
  // Автоотступы
  if (config.indentOnInput) {
    extensions.push(indentOnInput());
  }
  
  // Размер табуляции
  extensions.push(EditorView.theme({
    '.cm-content': {
      tabSize: config.tabSize.toString()
    }
  }));
  
  // Режим только для чтения
  if (config.readOnly) {
    extensions.push(EditorView.editable.of(false));
  }
  
  return extensions;
}

/**
 * Создает расширения для темы
 */
function createThemeExtensions(theme: ThemeType): Extension[] {
  return getThemeExtensions(theme);
}

/**
 * Создает все расширения редактора на основе конфигурации
 */
export function createEditorExtensions(config: EditorConfig): Extension[] {
  const extensions: Extension[] = [];
  
  // Базовые расширения
  extensions.push(...createBaseExtensions());
  
  // Расширения для языка
  extensions.push(...createLanguageExtensions(config.language));
  
  // Визуальные расширения
  extensions.push(...createVisualExtensions(config));
  
  // Расширения для редактирования
  extensions.push(...createEditingExtensions(config));
  
  // Расширения для темы
  extensions.push(...createThemeExtensions(config.theme));
  
  return extensions;
}

/**
 * Создает минимальную конфигурацию расширений
 */
export function createMinimalExtensions(language: LanguageType, theme: ThemeType): Extension[] {
  return [
    ...createBaseExtensions(),
    ...createLanguageExtensions(language),
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    ...createThemeExtensions(theme)
  ];
}

/**
 * Создает расширения для режима только чтения
 */
export function createReadOnlyExtensions(language: LanguageType, theme: ThemeType): Extension[] {
  const config: EditorConfig = {
    ...defaultEditorConfig,
    language,
    theme,
    readOnly: true,
    autocompletion: false,
    closeBrackets: false
  };
  
  return createEditorExtensions(config);
}

/**
 * Создает пользовательское расширение для обработки изменений
 */
export function createUpdateListener(
  onDocumentChange?: (content: string) => void,
  onSelectionChange?: (selection: { from: number; to: number; line: number; column: number }) => void,
  onLanguageChange?: (language: LanguageType) => void
): Extension {
  return EditorView.updateListener.of((update) => {
    // Обработка изменений документа
    if (update.docChanged && onDocumentChange) {
      const content = update.state.doc.toString();
      onDocumentChange(content);
    }
    
    // Обработка изменений выделения
    if (update.selectionSet && onSelectionChange) {
      const selection = update.state.selection.main;
      const line = update.state.doc.lineAt(selection.head);
      onSelectionChange({
        from: selection.from,
        to: selection.to,
        line: line.number,
        column: selection.head - line.from + 1
      });
    }
  });
}

/**
 * Создает расширение для подсчета строк и статистики
 */
export function createStatsExtension(): Extension {
  return EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const doc = update.state.doc;
      const stats = {
        lines: doc.lines,
        length: doc.length,
        words: doc.toString().split(/\s+/).filter(w => w.length > 0).length
      };
      
      // Можно отправить статистику в глобальное состояние или событие
      window.dispatchEvent(new CustomEvent('editorStats', { detail: stats }));
    }
  });
}

/**
 * Получает конфигурацию по умолчанию с переопределениями
 */
export function getDefaultConfig(overrides: Partial<EditorConfig> = {}): EditorConfig {
  return {
    ...defaultEditorConfig,
    ...overrides
  };
}