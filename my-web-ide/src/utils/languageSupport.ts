/**
 * Модуль поддержки языков для CodeMirror с автоматическим определением типа файла
 * Обеспечивает синтаксическую подсветку для различных языков программирования
 */

import { Extension } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';

// Типы поддерживаемых языков
export type LanguageType = 'python' | 'javascript' | 'typescript' | 'html' | 'css' | 'mcf' | 'text';

// Интерфейс информации о языке
export interface LanguageInfo {
  name: string;
  extension: Extension;
  extensions: string[];
  displayName: string;
}

// Карта языков и их конфигураций
const languageMap: Record<LanguageType, LanguageInfo> = {
  python: {
    name: 'python',
    extension: python(),
    extensions: ['.py', '.pyw', '.pyx'],
    displayName: 'Python'
  },
  javascript: {
    name: 'javascript',
    extension: javascript(),
    extensions: ['.js', '.jsx', '.mjs'],
    displayName: 'JavaScript'
  },
  typescript: {
    name: 'typescript',
    extension: javascript({ typescript: true }),
    extensions: ['.ts', '.tsx'],
    displayName: 'TypeScript'
  },
  html: {
    name: 'html',
    extension: html(),
    extensions: ['.html', '.htm', '.xhtml'],
    displayName: 'HTML'
  },
  css: {
    name: 'css',
    extension: css(),
    extensions: ['.css', '.scss', '.sass', '.less'],
    displayName: 'CSS'
  },
  mcf: {
    name: 'mcf',
    extension: python(), // Используем Python как базу для MCF (кастомный язык)
    extensions: ['.mcf'],
    displayName: 'MCF'
  },
  text: {
    name: 'text',
    extension: [],
    extensions: ['.txt', '.md', '.log'],
    displayName: 'Text'
  }
};

/**
 * Определяет язык по расширению файла
 * @param filename - имя файла или путь к файлу
 * @returns тип языка
 */
export function detectLanguageFromFilename(filename: string): LanguageType {
  if (!filename) return 'text';
  
  const extension = '.' + filename.split('.').pop()?.toLowerCase();
  
  for (const [langType, langInfo] of Object.entries(languageMap)) {
    if (langInfo.extensions.includes(extension)) {
      return langType as LanguageType;
    }
  }
  
  return 'text';
}

/**
 * Определяет язык по содержимому файла (анализ первых строк)
 * @param content - содержимое файла
 * @returns тип языка
 */
export function detectLanguageFromContent(content: string): LanguageType {
  if (!content.trim()) return 'text';
  
  const firstLine = content.split('\n')[0].trim();
  
  // Проверка shebang
  if (firstLine.startsWith('#!')) {
    if (firstLine.includes('python')) return 'python';
    if (firstLine.includes('node')) return 'javascript';
  }
  
  // Проверка DOCTYPE для HTML
  if (content.toLowerCase().includes('<!doctype html') || 
      content.toLowerCase().includes('<html')) {
    return 'html';
  }
  
  // Проверка CSS
  if (content.includes('{') && content.includes('}') && 
      (content.includes(':') || content.includes('@media'))) {
    return 'css';
  }
  
  // Проверка Python
  if (content.includes('def ') || content.includes('import ') || 
      content.includes('from ') || content.includes('class ')) {
    return 'python';
  }
  
  // Проверка JavaScript/TypeScript
  if (content.includes('function') || content.includes('const ') || 
      content.includes('let ') || content.includes('var ') ||
      content.includes('=>') || content.includes('interface ') ||
      content.includes('type ')) {
    return content.includes('interface ') || content.includes('type ') ? 'typescript' : 'javascript';
  }
  
  return 'text';
}

/**
 * Получает расширение CodeMirror для языка
 * @param languageType - тип языка
 * @returns расширение CodeMirror
 */
export function getLanguageExtension(languageType: LanguageType): Extension {
  return languageMap[languageType]?.extension || [];
}

/**
 * Получает информацию о языке
 * @param languageType - тип языка
 * @returns информация о языке
 */
export function getLanguageInfo(languageType: LanguageType): LanguageInfo {
  return languageMap[languageType];
}

/**
 * Получает отображаемое название языка
 * @param languageType - тип языка
 * @returns отображаемое название
 */
export function getLanguageDisplayName(languageType: LanguageType): string {
  return languageMap[languageType]?.displayName || 'Text';
}

/**
 * Получает все поддерживаемые языки
 * @returns массив поддерживаемых языков
 */
export function getSupportedLanguages(): LanguageType[] {
  return Object.keys(languageMap) as LanguageType[];
}

/**
 * Автоматически определяет язык по имени файла и содержимому
 * @param filename - имя файла (опционально)
 * @param content - содержимое файла (опционально)
 * @returns тип языка
 */
export function autoDetectLanguage(filename?: string, content?: string): LanguageType {
  // Сначала пробуем определить по имени файла
  if (filename) {
    const langFromFilename = detectLanguageFromFilename(filename);
    if (langFromFilename !== 'text') {
      return langFromFilename;
    }
  }
  
  // Если не удалось определить по имени файла, пробуем по содержимому
  if (content) {
    return detectLanguageFromContent(content);
  }
  
  return 'text';
}