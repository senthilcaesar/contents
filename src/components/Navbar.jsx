import React from 'react';
import { Plus, Code } from 'lucide-react';

export default function Navbar({ stats, onAddClick, theme, onThemeToggle, user, onLogout, onTechStackClick }) {
  return (
    <header className="retro-navbar-unified">
      {/* Left section: App Brand */}
      <div className="retro-brand-section">
        <h1 className="retro-title-compact">podtube</h1>
      </div>

      {/* Center section: Stats details */}
      <div className="retro-header-stats">
        <div className="retro-stats-row">
          <span className="stat-pill">TOTAL: {stats.total}</span>
          <span className="stat-pill text-youtube">YOUTUBE: {stats.youtube}</span>
          <span className="stat-pill text-podcast">PODCAST: {stats.podcast}</span>
        </div>
      </div>

      {/* Right section: System Actions */}
      <div className="retro-header-actions">
        <button 
          className="btn-retro"
          onClick={onTechStackClick}
          title="View Project Tech Stack"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <Code size={11} />
          <span>TECH STACK</span>
        </button>

        <button 
          className="btn-retro-toggle" 
          onClick={onThemeToggle}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
        
        {user && (
          <div className="retro-user-profile">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'User'} 
                className="user-avatar" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="user-avatar-fallback">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <span className="user-name-compact">
              {user.displayName ? user.displayName.split(' ')[0] : 'User'}
            </span>
            <button className="btn-retro btn-retro-logout" onClick={onLogout}>
              LOG OUT
            </button>
          </div>
        )}
        
        <button className="btn-retro btn-retro-primary" onClick={onAddClick}>
          <Plus size={11} style={{ marginRight: '4px' }} />
          <span>ADD LINK</span>
        </button>
      </div>
    </header>
  );
}
