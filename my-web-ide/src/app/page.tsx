'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Принудительно устанавливаем темную тему
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  return (
    <>
      <div className="main-container">
        <div className="activity-bar-content">
          <button className="activity-btn" id="files-btn" title="Файлы">
            <img src="svg/files.svg" alt="Файлы" />
          </button>
          <button className="activity-btn" id="book-btn" title="Справка">
            <img src="svg/book.svg" alt="Справка" />
          </button>
          <button className="activity-btn" id="save-btn" title="Сохранить">
            <img src="svg/save.svg" alt="Сохранить" />
          </button>
          <button className="activity-btn" id="theme-toggle-btn" title="Сменить тему">
            <img id="theme-icon" src="svg/lightbulb-empty.svg" alt="Тема" />
          </button>
        </div>

        <div className="side-panel" id="side-panel">
          <div className="panel-content" id="panel-content"></div>
        </div>

        <div id="context-menu" className="context-menu">
          <div className="context-item" id="context-new-file">Создать новый файл</div>
          <div className="context-item" id="context-new-folder">Создать новую папку</div>
          <div className="context-separator"></div>
          <div className="context-item" id="context-rename">Переименовать</div>
        </div>

        <div className="editor-container">
          <div className="line-numbers-container">
            <div className="line-numbers">
              <div className="line-number">1</div>
            </div>
          </div>
          <div id="active-line-highlighter"></div>
          <pre id="highlight" className="highlight" aria-hidden="true"></pre>
          <textarea id="code-editor" spellCheck="false"></textarea>
        </div>
      </div>
      <div className="status-bar" id="status-bar">Готов</div>
      <div id="autocomplete-container"></div>
    </>
  );
}