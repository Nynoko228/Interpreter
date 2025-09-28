'use client';

interface ActivityBarProps {
  activePanel: string | null;
  onPanelToggle: (panel: string) => void;
  onThemeToggle: () => void;
  isPanelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
}

export default function ActivityBar({ 
  activePanel, 
  onPanelToggle, 
  onThemeToggle,
  isPanelOpen,
  onPanelOpenChange 
}: ActivityBarProps) {
  const handlePanelClick = (panel: string) => {
    if (activePanel === panel && isPanelOpen) {
      onPanelOpenChange(false);
    } else {
      onPanelToggle(panel);
      onPanelOpenChange(true);
    }
  };

  return (
    <div className="activity-bar">
      <div className="activity-bar-content">
        <button 
          className={`activity-btn ${activePanel === 'files' && isPanelOpen ? 'active' : ''}`}
          onClick={() => handlePanelClick('files')}
          title="Файлы"
        >
          {/* Используем SVG как компонент или через public folder */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V6h5.17l2 2H20v10z"/>
          </svg>
        </button>

        <button 
          className={`activity-btn ${activePanel === 'help' && isPanelOpen ? 'active' : ''}`}
          onClick={() => handlePanelClick('help')}
          title="Справка"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
          </svg>
        </button>

        <button className="activity-btn" title="Сохранить">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
          </svg>
        </button>

        <button 
          className="activity-btn" 
          onClick={onThemeToggle}
          title="Сменить тему"
        >
          <svg id="theme-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 2c-1.05 0-2.05.16-3 .46 4.06 1.27 7 5.06 7 9.54 0 4.48-2.94 8.27-7 9.54.95.3 1.95.46 3 .46 5.52 0 10-4.48 10-10S14.52 2 9 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}