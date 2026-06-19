import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Edit2, Trash2 } from 'lucide-react';

export default function LinkCard({ item, onEdit, onDelete, viewMode }) {
  const isYouTube = item.type === 'youtube';
  const typeLabel = isYouTube ? 'YOUTUBE WORKER' : 'PODCAST SOURCE';
  const isList = viewMode === 'list';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`retro-card ${isList ? 'list-mode' : 'grid-mode'} ${isYouTube ? 'youtube-card' : 'podcast-card'}`}
    >
      {/* 1. Header/Top section: Icon and Meta Info */}
      <div className="card-top-row">
        <span className="card-platform-icon">
          {isYouTube ? '📺' : '🎙️'}
        </span>
        <div className="card-meta-info">
          <span className="card-type-label">{typeLabel}</span>
          <span className="card-creator-pill">{item.creator.toLowerCase()}</span>
        </div>
      </div>

      {/* 2. Middle Divider (Hidden in list mode) */}
      <div className="card-middle-divider" />

      {/* 3. Core Content: Title & Description */}
      <div className="card-content-block">
        <h3 className="card-title-text">
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        </h3>
        {item.description && (
          <p className="card-desc-text">
            {item.description}
          </p>
        )}
      </div>

      {/* 4. Footer/Bottom section: Tags & Actions */}
      <div className="card-bottom-row">
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
    </motion.div>
  );
}
