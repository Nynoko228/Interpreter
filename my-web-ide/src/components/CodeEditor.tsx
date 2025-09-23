'use client';

import { useEffect, useRef, useState } from 'react';
import { useFileSystem } from '@/hooks/useFileSystem';
// import { useLSP } from '@/hooks/useLSP';

export default function CodeEditor() {
//   const { currentFile, fileContent, updateFileContent } = useFileSystem();
//   const { connect, disconnect, sendChanges } = useLSP();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const [content, setContent] = useState('');

//   useEffect(() => {
//     if (currentFile) {
//       setContent(fileContent[currentFile] || '');
//       // Подключаемся к LSP при открытии файла
//       connect(currentFile);
//     }

//     return () => disconnect();
//   }, [currentFile, connect, disconnect]);

//   const handleContentChange = (newContent: string) => {
//     setContent(newContent);
//     updateFileContent(currentFile!, newContent);
//     sendChanges(currentFile!, newContent);
//   };

  // Здесь будет логика синхронизации номеров строк и подсветки
  // (аналогичная вашей старой реализации)

  return (
    <>
      <div className="line-numbers-container">
        <div className="line-numbers" ref={lineNumbersRef}>
          <div className="line-number">1</div>
        </div>
      </div>
      
      <div id="active-line-highlighter" ref={activeLineRef}></div>
      
      <pre id="highlight" className="highlight" aria-hidden="true" ref={highlightRef}></pre>
      
      <textarea
        id="code-editor"
        ref={textareaRef}
        value={content}
        // onChange={(e) => handleContentChange(e.target.value)}
        spellCheck="false"
        placeholder="Выберите файл для редактирования..."
      />
    </>
  );
}