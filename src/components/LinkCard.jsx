import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Edit2, Trash2, Play } from 'lucide-react';

export default function LinkCard({ item, onEdit, onDelete, onUpdateStatus, onUpdatePriority, viewMode, onPlay }) {
  const isYouTube = item.type === 'youtube';
  const typeLabel = isYouTube ? 'YOUTUBE WORKER' : 'PODCAST SOURCE';
  const isList = viewMode === 'list';

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = isYouTube ? getYouTubeId(item.url) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`retro-card ${isList ? 'list-mode' : 'grid-mode'} ${isYouTube ? 'youtube-card' : 'podcast-card'} card-color-${item.color || 'default'}`}
    >
      {/* 1. Header/Top section: Icon and Meta Info */}
      <div className="card-top-row">
        <div className="card-meta-info-container">
          <span className="card-platform-icon">
            {isYouTube ? '📺' : '🎙️'}
          </span>

          {isList && youtubeId && (
            <div 
              className="card-thumbnail-wrapper list-thumbnail"
              onClick={() => onPlay && onPlay(item)}
              style={{ cursor: 'pointer' }}
              title="Watch Video"
            >
              <img 
                src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`} 
                alt="Video Preview" 
                className="card-thumbnail-img" 
              />
            </div>
          )}

          <div className="card-meta-info">
            <span className="card-type-label">{typeLabel}</span>
            <span className="card-creator-pill">{item.creator.toLowerCase()}</span>
          </div>
        </div>
      </div>

      {!isList && youtubeId && (
        <div 
          className="card-thumbnail-wrapper grid-thumbnail"
          onClick={() => onPlay && onPlay(item)}
          style={{ cursor: 'pointer' }}
          title="Watch Video"
        >
          <img 
            src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`} 
            alt="Video Thumbnail" 
            className="card-thumbnail-img"
          />
          <div className="thumbnail-play-overlay">
            <Play size={16} className="thumbnail-play-icon" />
          </div>
        </div>
      )}

      {/* 2. Middle Divider (Hidden in list mode) */}
      <div className="card-middle-divider" />

      {/* 3. Core Content: Title & Description */}
      <div className="card-content-block">
        <h3 className="card-title-text">
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        </h3>
        {item.description && (!youtubeId || isList) && (
          <p className="card-desc-text">
            {item.description}
          </p>
        )}
      </div>

      {/* 4. Footer/Bottom section: Tags & Actions */}
      <div className="card-bottom-row">
        {isList ? (
          <>
            <div className="card-bottom-left-group">
              <div className="card-tags-list">
                {item.tags && item.tags.length > 0 ? (
                  item.tags.map((tag, idx) => (
                    <span key={idx} className="retro-tag-text">
                      #{tag.toLowerCase()}
                    </span>
                  ))
                ) : (
                  <span className="retro-tag-text text-muted">#uncategorized</span>
                )}
              </div>

              {/* Status & Priority Row */}
              <div className="card-status-priority-row">
                {/* Status Dropdown */}
                <div className={`card-status-container status-${(item.status || 'Pending').toLowerCase().replace(' ', '')}`}>
                  <select 
                    value={item.status || 'Pending'} 
                    onChange={(e) => onUpdateStatus(item.id, e.target.value)}
                    className={`status-select status-${(item.status || 'Pending').toLowerCase().replace(' ', '-')}`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>

                {/* Priority Dropdown */}
                <div className={`card-priority-container priority-${(item.priority || 'Medium').toLowerCase()}`}>
                  <select 
                    value={item.priority || 'Medium'} 
                    onChange={(e) => onUpdatePriority(item.id, e.target.value)}
                    className={`priority-select priority-${(item.priority || 'Medium').toLowerCase()}`}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card-actions-group">
              <button 
                className="retro-action-btn play-btn" 
                onClick={() => onPlay && onPlay(item)}
                title={isYouTube ? "Watch Video" : "Listen Podcast"}
              >
                <Play size={11} />
              </button>
              <button 
                className="retro-action-btn edit-btn" 
                onClick={() => onEdit(item)}
                title="Edit Item"
              >
                <Edit2 size={11} />
              </button>
              <button 
                className="retro-action-btn delete-btn" 
                onClick={() => onDelete(item.id)}
                title="Delete Item"
              >
                <Trash2 size={11} />
              </button>
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="retro-action-btn visit-btn"
                title="Open Source"
              >
                <ExternalLink size={11} />
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="card-tags-actions-line">
              <div className="card-tags-list">
                {item.tags && item.tags.length > 0 ? (
                  item.tags.map((tag, idx) => (
                    <span key={idx} className="retro-tag-text">
                      #{tag.toLowerCase()}
                    </span>
                  ))
                ) : (
                  <span className="retro-tag-text text-muted">#uncategorized</span>
                )}
              </div>

              <div className="card-actions-group">
                <button 
                  className="retro-action-btn play-btn" 
                  onClick={() => onPlay && onPlay(item)}
                  title={isYouTube ? "Watch Video" : "Listen Podcast"}
                >
                  <Play size={11} />
                </button>
                <button 
                  className="retro-action-btn edit-btn" 
                  onClick={() => onEdit(item)}
                  title="Edit Item"
                >
                  <Edit2 size={11} />
                </button>
                <button 
                  className="retro-action-btn delete-btn" 
                  onClick={() => onDelete(item.id)}
                  title="Delete Item"
                >
                  <Trash2 size={11} />
                </button>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="retro-action-btn visit-btn"
                  title="Open Source"
                >
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>

            <div className="card-status-priority-line">
              {/* Status Dropdown */}
              <div className={`card-status-container status-${(item.status || 'Pending').toLowerCase().replace(' ', '')}`}>
                <select 
                  value={item.status || 'Pending'} 
                  onChange={(e) => onUpdateStatus(item.id, e.target.value)}
                  className={`status-select status-${(item.status || 'Pending').toLowerCase().replace(' ', '-')}`}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              {/* Priority Dropdown */}
              <div className={`card-priority-container priority-${(item.priority || 'Medium').toLowerCase()}`}>
                <select 
                  value={item.priority || 'Medium'} 
                  onChange={(e) => onUpdatePriority(item.id, e.target.value)}
                  className={`priority-select priority-${(item.priority || 'Medium').toLowerCase()}`}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
