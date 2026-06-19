import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Code2, Zap, Flame, Sparkles, Palette, GitBranch } from 'lucide-react';
import packageJson from '../../package.json';

export default function TechStackModal({ isOpen, onClose }) {
  // Extract dependency versions dynamically from package.json
  const getVersion = (name, isDev = false) => {
    const deps = isDev ? packageJson.devDependencies : packageJson.dependencies;
    return deps && deps[name] ? deps[name] : 'N/A';
  };

  const techStack = [
    {
      name: 'React 18',
      version: getVersion('react'),
      description: 'Fast, modern, component-driven UI framework for state management and DOM rendering.',
      icon: <Code2 size={18} style={{ color: '#ca9ee6' }} />, // Mauve
      bg: 'rgba(202, 158, 230, 0.08)',
      border: 'rgba(202, 158, 230, 0.25)'
    },
    {
      name: 'Vite 8',
      version: getVersion('vite', true),
      description: 'Next-generation frontend tooling and ultra-fast local development server.',
      icon: <Zap size={18} style={{ color: '#ef9f76' }} />, // Peach
      bg: 'rgba(239, 159, 118, 0.08)',
      border: 'rgba(239, 159, 118, 0.25)'
    },
    {
      name: 'Firebase Client SDK',
      version: getVersion('firebase'),
      description: 'Handles secure user authentication and real-time Firestore database synchronization.',
      icon: <Flame size={18} style={{ color: '#e78284' }} />, // Red
      bg: 'rgba(231, 130, 132, 0.08)',
      border: 'rgba(231, 130, 132, 0.25)'
    },
    {
      name: 'Framer Motion',
      version: getVersion('framer-motion'),
      description: 'Powers smooth layout transitions, list item sorting, and micro-animations.',
      icon: <Sparkles size={18} style={{ color: '#f4b8e4' }} />, // Pink
      bg: 'rgba(244, 184, 228, 0.08)',
      border: 'rgba(244, 184, 228, 0.25)'
    },
    {
      name: 'Lucide Icons',
      version: getVersion('lucide-react'),
      description: 'Clean, modern, and highly legible vector icons styled for the retro theme.',
      icon: <Palette size={18} style={{ color: '#a6d189' }} />, // Green
      bg: 'rgba(166, 209, 137, 0.08)',
      border: 'rgba(166, 209, 137, 0.25)'
    },
    {
      name: 'GitHub Actions',
      version: 'v4',
      description: 'Automates building, testing, and deploying the static build directly to GitHub Pages.',
      icon: <GitBranch size={18} style={{ color: '#85c1dc' }} />, // Sapphire
      bg: 'rgba(133, 193, 220, 0.08)',
      border: 'rgba(133, 193, 220, 0.25)'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay-container" style={{ zIndex: 1100 }}>
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
            style={{ maxWidth: '480px' }}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <h3>
                Project Tech Stack
              </h3>
              <button className="btn-icon-only close-modal-btn" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <p className="tech-intro-text">
                This app is built using the following technologies:
              </p>

              {/* Technologies List */}
              <div className="tech-stack-list">
                {techStack.map((tech, idx) => (
                  <div key={idx} className="tech-item-row">
                    <div 
                      className="tech-icon-container" 
                      style={{ 
                        backgroundColor: tech.bg, 
                        borderColor: tech.border 
                      }}
                    >
                      {tech.icon}
                    </div>
                    <div className="tech-details">
                      <div className="tech-name-row">
                        <span className="tech-name">{tech.name}</span>
                        <span className="tech-version">{tech.version}</span>
                      </div>
                      <span className="tech-description">{tech.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
