'use client';

import { useState } from 'react';
import { useFileSystem } from '@/hooks/useFileSystem';

interface SidePanelProps {
  isOpen: boolean;
  activePanel: string | null;
}

export default function SidePanel({ isOpen, activePanel }: SidePanelProps) {
//   const { files, currentFile, setCurrentFile } = useFileSystem();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFileTree = (items: any[], level = 0) => {
    return items.map((item) => (
      <div key={item.path} style={{ paddingLeft: `${level * 16}px` }}>
        <div 
        //   className={`panel-item ${item.type === 'directory' ? 'directory' : 'file'} ${currentFile === item.path ? 'active' : ''}`}
        //   onClick={() => item.type === 'file' && setCurrentFile(item.path)}
        >
          <div className="folder-content">
            {item.type === 'directory' ? (
              <span 
                className={`expand-icon ${expandedFolders.has(item.path) ? 'expanded' : 'collapsed'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(item.path);
                }}
              >
                ▶
              </span>
            ) : (
              <span className="expand-icon-placeholder"></span>
            )}
            <span className={`folder-icon ${item.type} ${expandedFolders.has(item.path) ? 'expanded' : 'collapsed'}`}>
              {item.type === 'directory' ? '📁' : '📄'}
            </span>
            <span className="folder-name">{item.name}</span>
          </div>
        </div>
        {item.type === 'directory' && expandedFolders.has(item.path) && item.children && (
          renderFileTree(item.children, level + 1)
        )}
      </div>
    ));
  };

  if (!isOpen || activePanel !== 'files') return null;

  return (
    <div className="side-panel open">
      <div className="panel-content">
        <div className="panel-section">
          <h3>Рабочая область</h3>
          {/* {renderFileTree(files)} */}
        </div>
      </div>
    </div>
  );
}