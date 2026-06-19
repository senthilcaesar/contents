import React from 'react';

export default function FilterPanel({
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
}) {
  return (
    <div className="retro-filter-container">
      {/* 1. Filter Sub-Header Line */}
      <div className="retro-filter-sub-bar">
        <div className="sub-bar-left">
          <span className="retro-meta-caps">FILTERS</span>
          <span className="retro-live-indicator">● active</span>
        </div>
        <div className="sub-bar-right">
          <span className="retro-meta-small">search query above · results sorted below</span>
        </div>
      </div>

      {/* 2. Search Command Bar */}
      <div className="retro-search-box">
        <span className="retro-prompt">$ SEARCH_VAULT_QUERY:</span>
        <input
          type="text"
          placeholder="ENTER TITLE, CREATOR, OR TAG..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="retro-search-input"
        />
        {searchQuery && (
          <button 
            className="retro-clear-search" 
            onClick={() => setSearchQuery('')}
            title="RESET"
          >
            [CLEAR]
          </button>
        )}
      </div>

      {/* 3. Categories & Sort Selectors */}
      <div className="retro-filter-actions">
        <div className="retro-category-buttons">
          <button
            className={`retro-filter-btn youtube-filter ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            ALL_RESOURCES
          </button>
          <button
            className={`retro-filter-btn youtube-filter ${filterType === 'youtube' ? 'active' : ''}`}
            onClick={() => setFilterType('youtube')}
          >
            YOUTUBE_VIDEOS
          </button>
          <button
            className={`retro-filter-btn podcast-filter ${filterType === 'podcast' ? 'active' : ''}`}
            onClick={() => setFilterType('podcast')}
          >
            PODCASTS
          </button>
        </div>

        <div className="retro-right-actions">
          <div className="retro-sort-wrapper">
            <span className="sort-label">SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="retro-sort-select"
            >
              <option value="newest">NEWEST</option>
              <option value="oldest">OLDEST</option>
              <option value="title-asc">TITLE_A_Z</option>
              <option value="title-desc">TITLE_Z_A</option>
              <option value="creator">CREATOR_A_Z</option>
            </select>
          </div>

          <div className="retro-view-toggle">
            <button
              type="button"
              className={`retro-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              GRID
            </button>
            <button
              type="button"
              className={`retro-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              LIST
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
