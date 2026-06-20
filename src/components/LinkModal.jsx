import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Video, Sparkles, AlertCircle } from 'lucide-react';

export default function LinkModal({ isOpen, onClose, onSave, editItem }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('youtube');
  const [creator, setCreator] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState('Pending');
  const [priority, setPriority] = useState('Medium');
  const [color, setColor] = useState('default');
  
  const [errors, setErrors] = useState({});
  const [hasManuallySelectedType, setHasManuallySelectedType] = useState(false);

  // Sync state when modal opens or editItem changes
  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setTitle(editItem.title || '');
        setUrl(editItem.url || '');
        setType(editItem.type || 'youtube');
        setCreator(editItem.creator || '');
        setDescription(editItem.description || '');
        setTagsInput(editItem.tags ? editItem.tags.join(', ') : '');
        setStatus(editItem.status || 'Pending');
        setPriority(editItem.priority || 'Medium');
        setColor(editItem.color || 'default');
        setHasManuallySelectedType(true);
      } else {
        // Reset to default empty state
        setTitle('');
        setUrl('');
        setType('youtube');
        setCreator('');
        setDescription('');
        setTagsInput('');
        setStatus('Pending');
        setPriority('Medium');
        setColor('default');
        setHasManuallySelectedType(false);
      }
      setErrors({});
    }
  }, [isOpen, editItem]);

  // Handle URL change to auto-detect content type (YouTube vs Podcast)
  const handleUrlChange = (e) => {
    const inputUrl = e.target.value;
    setUrl(inputUrl);

    if (errors.url) {
      setErrors((prev) => ({ ...prev, url: null }));
    }

    // Skip auto-detection if the user explicitly set the type manually
    if (hasManuallySelectedType) return;

    const lowerUrl = inputUrl.toLowerCase();
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      setType('youtube');
    } else if (
      lowerUrl.includes('spotify.com') || 
      lowerUrl.includes('apple.com') || 
      lowerUrl.includes('podcast') || 
      lowerUrl.includes('fm') ||
      lowerUrl.includes('soundcloud.com')
    ) {
      setType('podcast');
    }
  };

  const handleTypeSelect = (selectedType) => {
    setType(selectedType);
    setHasManuallySelectedType(true);
  };

  // Basic URL Validation
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!url.trim()) {
      newErrors.url = 'URL is required';
    } else if (!isValidUrl(url)) {
      newErrors.url = 'Please enter a valid URL (including https://)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clean and split tags
    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);

    onSave({
      id: editItem ? editItem.id : undefined,
      title: title.trim(),
      url: url.trim(),
      type,
      creator: creator.trim() || 'Unknown',
      description: description.trim(),
      tags,
      status,
      priority,
      color,
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay-container">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="modal-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="modal-box glass-panel"
          >
            {/* Modal Header */}
            <div className="modal-header">
              <h3>
                {editItem ? 'Edit Favorite Link' : 'Add Favorite Link'}
                {!editItem && <Sparkles size={16} className="sparkle-icon" />}
              </h3>
              <button className="btn-icon-only close-modal-btn" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="modal-form">
              {/* Type Switcher */}
              <div className="form-group">
                <span className="form-label">Link Type</span>
                <div className="type-selector">
                  <div
                    onClick={() => handleTypeSelect('youtube')}
                    className={`type-option youtube-option ${type === 'youtube' ? 'selected' : ''}`}
                  >
                    <Video size={18} />
                    <span>YouTube</span>
                  </div>
                  <div
                    onClick={() => handleTypeSelect('podcast')}
                    className={`type-option podcast-option ${type === 'podcast' ? 'selected' : ''}`}
                  >
                    <Mic size={18} />
                    <span>Podcast</span>
                  </div>
                </div>
              </div>

              {/* URL */}
              <div className="form-group">
                <label htmlFor="modal-url" className="form-label">URL *</label>
                <input
                  id="modal-url"
                  type="text"
                  value={url}
                  onChange={handleUrlChange}
                  className={`form-input ${errors.url ? 'input-error' : ''}`}
                />
                {errors.url && (
                  <span className="error-message">
                    <AlertCircle size={14} />
                    {errors.url}
                  </span>
                )}
              </div>

              {/* Title */}
              <div className="form-group">
                <label htmlFor="modal-title" className="form-label">Title *</label>
                <input
                  id="modal-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors((prev) => ({ ...prev, title: null }));
                  }}
                  className={`form-input ${errors.title ? 'input-error' : ''}`}
                />
                {errors.title && (
                  <span className="error-message">
                    <AlertCircle size={14} />
                    {errors.title}
                  </span>
                )}
              </div>

              {/* Creator */}
              <div className="form-group">
                <label htmlFor="modal-creator" className="form-label">Creator / Channel Name</label>
                <input
                  id="modal-creator"
                  type="text"
                  value={creator}
                  onChange={(e) => setCreator(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Status */}
              <div className="form-group">
                <label htmlFor="modal-status" className="form-label">Status</label>
                <select
                  id="modal-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="form-select"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              {/* Priority */}
              <div className="form-group">
                <label htmlFor="modal-priority" className="form-label">Priority</label>
                <select
                  id="modal-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="form-select"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Card Background Accent */}
              <div className="form-group">
                <span className="form-label">Card Background Accent</span>
                <div className="color-swatch-container">
                  {[
                    { id: 'default', label: 'Default' },
                    { id: 'red', label: 'Red' },
                    { id: 'orange', label: 'Orange' },
                    { id: 'yellow', label: 'Yellow' },
                    { id: 'green', label: 'Green' },
                    { id: 'teal', label: 'Teal' },
                    { id: 'skyblue', label: 'Sky Blue' },
                    { id: 'blue', label: 'Blue' },
                    { id: 'navyblue', label: 'Navy Blue' },
                    { id: 'purple', label: 'Purple' },
                    { id: 'pink', label: 'Pink' },
                    { id: 'platinumgray', label: 'Platinum Gray' },
                    { id: 'brown', label: 'Brown' }
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      className={`color-swatch swatch-${opt.id} ${color === opt.id ? 'selected' : ''}`}
                      onClick={() => setColor(opt.id)}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label htmlFor="modal-desc" className="form-label">Description (Optional)</label>
                <textarea
                  id="modal-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-textarea"
                />
              </div>

              {/* Tags */}
              <div className="form-group">
                <label htmlFor="modal-tags" className="form-label">Tags (Comma Separated)</label>
                <input
                  id="modal-tags"
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Action Buttons */}
              <div className="modal-actions">
                <button type="button" className="btn-retro btn-retro-secondary" onClick={onClose}>
                  CANCEL
                </button>
                <button type="submit" className="btn-retro btn-retro-primary">
                  {editItem ? 'SAVE CHANGES' : 'ADD TO VAULT'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
