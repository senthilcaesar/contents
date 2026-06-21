import React, { useState } from 'react';
import { Tag, Search, X, SlidersHorizontal } from 'lucide-react';

export default function TagSidebar({
  allTags,
  selectedTags,
  onToggleTag,
  onClearTags,
  matchMode,
  setMatchMode,
  isOpen,
}) {
  const [tagQuery, setTagQuery] = useState('');

  if (!isOpen) return null;

  // Filter tags based on sidebar search input
  const filteredTags = allTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagQuery.toLowerCase().trim())
  );

  return (
    <aside className="retro-tag-sidebar glass-panel">
      {/* Sidebar Header */}
      <div className="sidebar-header-line">
        <div className="sidebar-title-group">
          <Tag size={14} className="sidebar-title-icon" />
          <span className="retro-meta-caps">VAULT_TAGS</span>
        </div>
        {selectedTags.length > 0 && (
          <button 
            onClick={onClearTags} 
            className="retro-clear-tags-btn"
            title="Clear all filters"
          >
            [CLEAR]
          </button>
        )}
      </div>

      {/* Tag Search Input */}
      <div className="sidebar-search-box">
        <Search size={12} className="sidebar-search-icon" />
        <input
          type="text"
          placeholder="FILTER TAGS..."
          value={tagQuery}
          onChange={(e) => setTagQuery(e.target.value)}
          className="sidebar-search-input"
        />
        {tagQuery && (
          <button 
            className="sidebar-clear-search" 
            onClick={() => setTagQuery('')}
          >
            <X size={10} />
          </button>
        )}
      </div>

      {/* Match Mode Selector */}
      <div className="match-mode-section">
        <span className="match-mode-label">
          <SlidersHorizontal size={10} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          MODE:
        </span>
        <div className="match-mode-buttons">
          <button
            type="button"
            className={`match-mode-btn ${matchMode === 'any' ? 'active' : ''}`}
            onClick={() => setMatchMode('any')}
            title="Show links matching ANY selected tag (OR)"
          >
            ANY
          </button>
          <button
            type="button"
            className={`match-mode-btn ${matchMode === 'all' ? 'active' : ''}`}
            onClick={() => setMatchMode('all')}
            title="Show links matching ALL selected tags (AND)"
          >
            ALL
          </button>
        </div>
      </div>

      {/* Active Tags Counter / HUD */}
      {selectedTags.length > 0 && (
        <div className="active-tags-hud">
          <span className="hud-indicator">●</span>
          <span>{selectedTags.length} active filter{selectedTags.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Tags List */}
      <div className="sidebar-tags-list">
        {filteredTags.length > 0 ? (
          filteredTags.map((tag) => {
            const isSelected = selectedTags.includes(tag.name);
            return (
              <button
                key={tag.name}
                onClick={() => onToggleTag(tag.name)}
                className={`sidebar-tag-item ${isSelected ? 'active' : ''}`}
                title={`Filter by #${tag.name}`}
              >
                <span className="tag-checkbox-indicator">
                  {isSelected ? '[x]' : '[ ]'}
                </span>
                <span className="tag-name">#{tag.name}</span>
                <span className="tag-count-badge">{tag.count}</span>
              </button>
            );
          })
        ) : (
          <div className="sidebar-empty-tags">
            {tagQuery ? 'NO MATCHING TAGS' : 'NO TAGS FOUND'}
          </div>
        )}
      </div>
    </aside>
  );
}
