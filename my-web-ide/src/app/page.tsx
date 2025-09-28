'use client';

import { useEffect, useState } from 'react';
import CodeEditor, { LanguageType, ThemeType, EditorStats } from '@/components/CodeEditor';
import { useTheme } from '@/hooks/useTheme';

export default function Home() {
  const [code, setCode] = useState('# Начните писать код\nprint("Hello, World!")\n\n# Это пример Python кода\nfor i in range(5):\n    print(f"Число: {i}")');
  const [currentLanguage, setCurrentLanguage] = useState<LanguageType>('python');
  const [editorStats, setEditorStats] = useState<EditorStats | null>(null);
  const { theme, toggleTheme } = useTheme();

  // Применяем тему к документу
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleLanguageChange = (language: LanguageType) => {
    setCurrentLanguage(language);
  };

  const handleStatsChange = (stats: EditorStats) => {
    setEditorStats(stats);
  };

  const handleThemeToggle = () => {
    toggleTheme();
  };

  return (
    <>
      <div className="main-container">
        <div className="activity-bar-content">
          <button className="activity-btn" id="files-btn" title="Файлы">
            <img src="files.svg" alt="Файлы" />
          </button>
          <button className="activity-btn" id="book-btn" title="Справка">
            <img src="book.svg" alt="Справка" />
          </button>
          <button className="activity-btn" id="save-btn" title="Сохранить">
            <img src="save.svg" alt="Сохранить" />
          </button>
          <button className="activity-btn" id="theme-toggle-btn" title="Сменить тему" onClick={handleThemeToggle}>
            <img id="theme-icon" src={theme === 'dark' ? 'lightbulb-empty.svg' : 'lightbulb.svg'} alt="Тема" />
          </button>
        </div>

        <div className="side-panel" id="side-panel">
          <div className="panel-content" id="panel-content">
            {/* Здесь будет содержимое боковой панели */}
          </div>
        </div>

        {/* Обновленный компонент CodeEditor с новыми возможностями */}
        <CodeEditor 
          content={code} 
          filename="example.py"
          theme={theme as ThemeType}
          onContentChange={handleCodeChange}
          onLanguageChange={handleLanguageChange}
          onStatsChange={handleStatsChange}
        />

        <div id="context-menu" className="context-menu" style={{ display: 'none' }}>
          <div className="context-item" id="context-new-file">Создать новый файл</div>
          <div className="context-item" id="context-new-folder">Создать новую папку</div>
          <div className="context-separator"></div>
          <div className="context-item" id="context-rename">Переименовать</div>
        </div>
      </div>
      <div className="status-bar" id="status-bar">
        {editorStats ? (
          <>
            Готов • {editorStats.lines} строк • {editorStats.language} 
            {editorStats.selection && editorStats.selection.line > 1 && (
              <> • Строка {editorStats.selection.line}, Колонка {editorStats.selection.column}</>
            )}
            {editorStats.words > 0 && (
              <> • {editorStats.words} слов</>
            )}
          </>
        ) : (
          'Готов'
        )}
      </div>
    </>
  );
}