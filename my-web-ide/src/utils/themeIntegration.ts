/**
 * Система интеграции тем CodeMirror с существующей системой CSS переменных
 * Обеспечивает автоматическое переключение тем редактора в соответствии с глобальной темой приложения
 */

import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Типы тем
export type ThemeType = 'dark' | 'light';

// Интерфейс конфигурации темы
export interface ThemeConfig {
  name: string;
  baseTheme: Extension;
  highlightStyle: Extension;
  editorTheme: Extension;
}

/**
 * Создает светлую тему CodeMirror, совместимую с CSS переменными
 */
function createLightTheme(): Extension {
  return EditorView.theme({
    '&': {
      color: 'var(--text-primary)',
      backgroundColor: 'var(--bg-primary)',
      fontSize: '16px',
      fontFamily: "'Consolas', monospace"
    },
    '.cm-selectionBackground, .cm-editor ::selection': {
      backgroundColor: 'rgba(0, 95, 204, 0.2) !important',
    },
    '.cm-selectionLayer': {
      zIndex: '10'
    },
    '&.cm-focused .cm-selectionLayer .cm-selectionBackground': {
      backgroundColor: 'rgba(0, 95, 204, 0.3) !important'
    },
    '.cm-content': {
      padding: '20px 0',
      caretColor: 'var(--caret-color)',
      minHeight: '100%'
    },
    '.cm-focused': {
      outline: 'none'
    },

    '.cm-scroller': {
      fontFamily: "'Consolas', monospace",
      lineHeight: '24px'
    },
    // Активная строка
    '.cm-activeLine': {
      backgroundColor: 'var(--active-line-bg) !important'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--active-line-bg) !important',
      color: 'var(--text-primary) !important'
    },
    // Номера строк
    '.cm-gutters': {
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-tertiary)',
      border: 'none',
      borderRight: '1px solid var(--border-color)',
      paddingLeft: '5px',
      paddingRight: '0px'
    },
    '.cm-gutter': {
      minWidth: '50px'
    },
    '.cm-lineNumbers .cm-gutterElement': {
      textAlign: 'right',
      fontSize: '16px',
      lineHeight: '24px',
      fontFamily: "'Consolas', monospace",
      padding: '0 5px'
    },
    // Курсор
    '.cm-cursor': {
      borderLeftColor: 'var(--caret-color)',
      borderLeftWidth: '2px'
    },
    // Свертывание кода
    '.cm-foldPlaceholder': {
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      color: 'var(--text-secondary)'
    },
    // Поиск
    '.cm-searchMatch': {
      backgroundColor: '#ffff0050',
      outline: '1px solid #ffff00'
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: '#ff6a0050',
      outline: '1px solid #ff6a00'
    },
    // Скроллбар
    '.cm-scroller::-webkit-scrollbar': {
      width: '10px'
    },
    '.cm-scroller::-webkit-scrollbar-track': {
      background: 'var(--scrollbar-track)'
    },
    '.cm-scroller::-webkit-scrollbar-thumb': {
      background: 'var(--scrollbar-thumb)',
      borderRadius: '5px'
    },
    '.cm-scroller::-webkit-scrollbar-thumb:hover': {
      background: 'var(--scrollbar-thumb-hover)'
    }
  }, { dark: false });
}

/**
 * Создает темную тему CodeMirror, совместимую с CSS переменными
 */
function createDarkTheme(): Extension {
  return EditorView.theme({
    '&': {
      color: 'var(--text-primary)',
      backgroundColor: 'var(--bg-primary)',
      fontSize: '16px',
      fontFamily: "'Consolas', monospace"
    },
    '.cm-selectionBackground, .cm-editor ::selection': {
      backgroundColor: 'rgba(173, 214, 255, 0.3) !important',
    },
    '.cm-selectionLayer': {
      zIndex: '10'
    },
    '&.cm-focused .cm-selectionLayer .cm-selectionBackground': {
      backgroundColor: 'rgba(173, 214, 255, 0.4) !important'
    },
    '.cm-content': {
      padding: '20px 0',
      caretColor: 'var(--caret-color)',
      minHeight: '100%'
    },
    '.cm-focused': {
      outline: 'none'
    },
    '.cm-editor': {
      outline: 'none'
    },
    '.cm-scroller': {
      fontFamily: "'Consolas', monospace",
      lineHeight: '24px'
    },
    
    // Активная строка
    '.cm-activeLine': {
      backgroundColor: 'var(--active-line-bg) !important'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--active-line-bg) !important',
      color: 'var(--text-primary) !important'
    },
    // Номера строк
    '.cm-gutters': {
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-tertiary)',
      border: 'none',
      borderRight: '1px solid var(--border-color)',
      paddingLeft: '5px',
      paddingRight: '0px'
    },
    '.cm-gutter': {
      minWidth: '50px'
    },
    '.cm-lineNumbers .cm-gutterElement': {
      textAlign: 'right',
      fontSize: '16px',
      lineHeight: '24px',
      fontFamily: "'Consolas', monospace",
      padding: '0 5px'
    },  
    // Курсор
    '.cm-cursor': {
      borderLeftColor: 'var(--caret-color)',
      borderLeftWidth: '2px'
    },
    // Свертывание кода
    '.cm-foldPlaceholder': {
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      color: 'var(--text-secondary)'
    },
    // Поиск
    '.cm-searchMatch': {
      backgroundColor: '#ffff0050',
      outline: '1px solid #ffff00'
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: '#ff6a0050',
      outline: '1px solid #ff6a00'
    },
    // Скроллбар
    '.cm-scroller::-webkit-scrollbar': {
      width: '10px'
    },
    '.cm-scroller::-webkit-scrollbar-track': {
      background: 'var(--scrollbar-track)'
    },
    '.cm-scroller::-webkit-scrollbar-thumb': {
      background: 'var(--scrollbar-thumb)',
      borderRadius: '5px'
    },
    '.cm-scroller::-webkit-scrollbar-thumb:hover': {
      background: 'var(--scrollbar-thumb-hover)'
    }
  }, { dark: true });
}

/**
 * Создает светлый стиль подсветки синтаксиса
 */
function createLightHighlightStyle(): Extension {
  return syntaxHighlighting(HighlightStyle.define([
    // Ключевые слова
    { tag: tags.keyword, color: 'var(--syntax-keyword)', fontWeight: '600' },
    { tag: tags.controlKeyword, color: 'var(--syntax-keyword)', fontWeight: '600' },
    { tag: tags.definitionKeyword, color: 'var(--syntax-keyword)', fontWeight: '600' },
    { tag: tags.modifier, color: 'var(--syntax-keyword)', fontWeight: '600' },
    
    // Типы данных
    { tag: tags.typeName, color: 'var(--syntax-type)' },
    { tag: tags.standard(tags.typeName), color: 'var(--syntax-builtin)' },
    
    // Функции и методы
    { tag: tags.function(tags.variableName), color: 'var(--syntax-func)' },
    { tag: tags.function(tags.propertyName), color: 'var(--syntax-func)' },
    
    // Переменные и свойства
    { tag: tags.variableName, color: 'var(--text-primary)' },
    { tag: tags.propertyName, color: 'var(--text-primary)' },
    { tag: tags.attributeName, color: 'var(--syntax-type)' },
    
    // Литералы
    { tag: tags.string, color: 'var(--syntax-string)' },
    { tag: tags.number, color: 'var(--syntax-number)' },
    { tag: tags.bool, color: 'var(--syntax-number)' },
    { tag: tags.null, color: 'var(--syntax-number)' },
    
    // Операторы
    { tag: tags.operator, color: 'var(--syntax-op)' },
    { tag: tags.punctuation, color: 'var(--text-primary)' },
    { tag: tags.bracket, color: 'var(--text-primary)' },
    
    // Комментарии
    { tag: tags.comment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
    { tag: tags.blockComment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
    { tag: tags.lineComment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
    
    // HTML/XML теги
    { tag: tags.tagName, color: 'var(--syntax-keyword)' },
    { tag: tags.angleBracket, color: 'var(--syntax-op)' },
    
    // CSS
    { tag: tags.className, color: 'var(--syntax-type)' },
    { tag: tags.unit, color: 'var(--syntax-number)' },
    
    // Встроенные функции
    { tag: tags.standard(tags.function(tags.variableName)), color: 'var(--syntax-builtin)' },
    { tag: tags.standard(tags.variableName), color: 'var(--syntax-builtin)' }
  ]));
}

/**
 * Создает темный стиль подсветки синтаксиса
 */
function createDarkHighlightStyle(): Extension {
  // Используем ту же схему цветов, что и для светлой темы
  // CSS переменные автоматически адаптируются к темной теме
  return createLightHighlightStyle();
}

// Конфигурации тем
const themeConfigs: Record<ThemeType, ThemeConfig> = {
  light: {
    name: 'light',
    baseTheme: createLightTheme(),
    highlightStyle: createLightHighlightStyle(),
    editorTheme: createLightTheme()
  },
  dark: {
    name: 'dark',
    baseTheme: createDarkTheme(),
    highlightStyle: createDarkHighlightStyle(),
    editorTheme: createDarkTheme()
  }
};

/**
 * Получает расширения темы для CodeMirror
 * @param themeType - тип темы
 * @returns массив расширений
 */
export function getThemeExtensions(themeType: ThemeType): Extension[] {
  const config = themeConfigs[themeType];
  return [
    config.baseTheme,
    config.highlightStyle
  ];
}

/**
 * Получает конфигурацию темы
 * @param themeType - тип темы
 * @returns конфигурация темы
 */
export function getThemeConfig(themeType: ThemeType): ThemeConfig {
  return themeConfigs[themeType];
}

/**
 * Создает расширение для поддержки подсветки активной строки
 * с правильной видимостью выделения текста
 */
// export function createActiveLineExtension(): Extension {
//   return EditorView.theme({
//     '.cm-activeLine': {
//       backgroundColor: 'var(--active-line-bg) !important'
//     },
//     '.cm-activeLineGutter': {
//       backgroundColor: 'var(--active-line-bg) !important'
//     },
//     // Важное исправление для видимости выделения на активной строке
//     // Используем правильные селекторы согласно документации CodeMirror 6
//     '& .cm-line.cm-activeLine .cm-selectionBackground': {
//       position: 'relative',
//       zIndex: '1'
//     },
//     // Обеспечиваем видимость выделения в сфокусированном состоянии
//     '&.cm-focused .cm-line.cm-activeLine .cm-selectionBackground': {
//       backgroundColor: 'var(--accent-color)',
//       opacity: '0.6'
//     }
//   });
// }

/**
 * Получает все доступные типы тем
 * @returns массив типов тем
 */
export function getAvailableThemes(): ThemeType[] {
  return Object.keys(themeConfigs) as ThemeType[];
}

/**
 * Проверяет, поддерживается ли тема
 * @param themeType - тип темы
 * @returns true, если тема поддерживается
 */
export function isThemeSupported(themeType: string): themeType is ThemeType {
  return themeType === 'light' || themeType === 'dark';
}