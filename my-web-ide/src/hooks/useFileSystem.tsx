'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface FileSystemContextType {
  files: FileItem[];
  currentFile: string | null;
  fileContent: Record<string, string>;
  setCurrentFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileItem[];
}

export function FileSystemProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<FileItem[]>([
    {
      name: 'src',
      path: '/src',
      type: 'directory',
      children: [
        { name: 'main.py', path: '/src/main.py', type: 'file' },
        { name: 'utils.py', path: '/src/utils.py', type: 'file' },
      ]
    },
    { name: 'README.md', path: '/README.md', type: 'file' }
  ]);

  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<Record<string, string>>({
    '/src/main.py': 'print("Hello, World!")',
    '/src/utils.py': 'def helper():\n    return "help"',
    '/README.md': '# My Project'
  });

  const updateFileContent = (path: string, content: string) => {
    setFileContent(prev => ({
      ...prev,
      [path]: content
    }));
  };

  return (
    <FileSystemContext.Provider value={{
      files,
      currentFile,
      fileContent,
      setCurrentFile,
      updateFileContent
    }}>
      {children}
    </FileSystemContext.Provider>
  );
}

export function useFileSystem() {
  const context = useContext(FileSystemContext);
  if (context === undefined) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
}