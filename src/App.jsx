import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FolderHeart, Plus, HelpCircle, Inbox, Code } from 'lucide-react';
import Navbar from './components/Navbar';
import FilterPanel from './components/FilterPanel';
import LinkCard from './components/LinkCard';
import LinkModal from './components/LinkModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import TechStackModal from './components/TechStackModal';
import ToastContainer from './components/Toast';
import RetroPlayer from './components/RetroPlayer';
import TagSidebar from './components/TagSidebar';

// Import Firebase config and hooks
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut 
} from './firebase';
import { 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';

// Default initial links to make the app look stunning on first load
const INITIAL_LINKS = [
  {
    id: 'init-1',
    title: 'How We Learn to Think: Cognitive Heuristics',
    url: 'https://www.youtube.com/watch?v=UBVV8pch1dM',
    type: 'youtube',
    creator: 'Veritasium',
    description: 'An exploration of human biases, dual-process theory, and the cognitive tricks our brains play to save energy.',
    tags: ['science', 'psychology', 'learning'],
    status: 'Done',
    priority: 'High',
  },
  {
    id: 'init-2',
    title: 'Sam Altman: OpenAI, GPT-4, and the Future of AI',
    url: 'https://open.spotify.com/episode/3GmrM263G1jS7424263152',
    type: 'podcast',
    creator: 'Lex Fridman Podcast',
    description: 'A deep-dive conversation about neural networks, artificial general intelligence (AGI), safety alignment, and human consciousness.',
    tags: ['ai', 'tech', 'philosophy'],
    status: 'In Progress',
    priority: 'Medium',
  },
  {
    id: 'init-3',
    title: 'The Future of Smartphones & Foldable Devices',
    url: 'https://www.youtube.com/watch?v=d_kH4-OslQ4',
    type: 'youtube',
    creator: 'Marques Brownlee',
    description: 'Reviewing next-generation rollable displays, under-display cameras, and the modular software paradigms defining modern pocket computers.',
    tags: ['tech', 'gadgets', 'design'],
    status: 'Pending',
    priority: 'Low',
  },
  {
    id: 'init-4',
    title: 'Sleep Toolkit: Protocols for Enhancing Rest and Focus',
    url: 'https://open.spotify.com/episode/56238612836217316',
    type: 'podcast',
    creator: 'Huberman Lab',
    description: 'Neurologist Dr. Andrew Huberman shares actionable scientific protocols for optimizing sleep quality, circadian alignment, and cognitive function.',
    tags: ['health', 'science', 'lifestyle'],
    status: 'Pending',
    priority: 'Medium',
  }
];

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Links list fetched from Firestore
  const [links, setLinks] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Tag filter & sidebar states
  const [selectedTags, setSelectedTags] = useState([]);
  const [matchMode, setMatchMode] = useState('any');
  const [showSidebar, setShowSidebar] = useState(() => {
    return window.innerWidth > 768;
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [activePlayerItem, setActivePlayerItem] = useState(null);
  const [isPlayerMinimized, setIsPlayerMinimized] = useState(false);

  // Open the player in minimized mode by default when a new link is played
  useEffect(() => {
    if (activePlayerItem) {
      setIsPlayerMinimized(true);
    }
  }, [activePlayerItem]);

  // Preload the Spotify IFrame API at startup so that when a podcast is opened
  // the controller initialises fast — giving best-effort autoplay a chance to
  // run inside the browser's user-activation window.
  useEffect(() => {
    if (document.getElementById('spotify-iframe-api')) return;
    const s = document.createElement('script');
    s.id = 'spotify-iframe-api';
    s.src = 'https://open.spotify.com/embed/iframe-api/v1';
    s.async = true;
    document.body.appendChild(s);
  }, []);
  
  const [toasts, setToasts] = useState([]);

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('podtube_view_mode') || 'list';
  });

  useEffect(() => {
    localStorage.setItem('podtube_view_mode', viewMode);
  }, [viewMode]);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('podtube_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('podtube_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [deletingLinkId, setDeletingLinkId] = useState(null);
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);

  const deletingLinkTitle = useMemo(() => {
    const link = links.find((l) => l.id === deletingLinkId);
    return link ? link.title : '';
  }, [deletingLinkId, links]);

  // Toast Notification Utility
  const triggerToast = (message, type = 'success', onAction = null) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, onAction }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Real-time Sync
  useEffect(() => {
    if (!currentUser) {
      setLinks([]);
      return;
    }

    const q = query(
      collection(db, 'users', currentUser.uid, 'links'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedLinks = [];
      snapshot.forEach((doc) => {
        fetchedLinks.push(doc.data());
      });

      // Seed default template links if the user is logging in for the first time and vault is empty
      if (fetchedLinks.length === 0) {
        const seedKey = `podtube_seeded_${currentUser.uid}`;
        const isSeeded = localStorage.getItem(seedKey);
        if (!isSeeded) {
          localStorage.setItem(seedKey, 'true');
          try {
            for (const initialLink of INITIAL_LINKS) {
              const newId = initialLink.id === 'init-1' ? 'init-1' : `link-${Math.random().toString(36).substring(2, 9)}`;
              const seededLink = {
                ...initialLink,
                id: newId,
                createdAt: Date.now() - (INITIAL_LINKS.indexOf(initialLink) * 1000 * 60 * 60)
              };
              await setDoc(doc(db, 'users', currentUser.uid, 'links', newId), seededLink);
            }
            triggerToast('Welcome! Seeded initial vault templates.', 'success');
          } catch (err) {
            console.error('Error seeding initial links:', err);
            triggerToast('Failed to seed template links.', 'error');
          }
          return;
        }
      }

      setLinks(fetchedLinks);
    }, (error) => {
      console.error("Firestore sync error:", error);
      triggerToast("Failed to load links from cloud database.", "error");
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Auth Action Handlers
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      triggerToast('Logged in successfully!', 'success');
    } catch (err) {
      console.error('Login error:', err);
      triggerToast('Login failed: ' + err.message, 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      triggerToast('Logged out successfully!', 'success');
    } catch (err) {
      console.error('Logout error:', err);
      triggerToast('Logout failed: ' + err.message, 'error');
    }
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const total = links.length;
    const youtube = links.filter((l) => l.type === 'youtube').length;
    const podcast = links.filter((l) => l.type === 'podcast').length;
    return { total, youtube, podcast };
  }, [links]);

  // Handle Add/Edit Form submission
  const handleSaveLink = async (formData) => {
    if (!currentUser) return;
    try {
      if (formData.id) {
        // Editing existing link
        const docRef = doc(db, 'users', currentUser.uid, 'links', formData.id);
        await updateDoc(docRef, { ...formData });
        triggerToast('Link successfully updated!', 'success');
      } else {
        // Adding new link
        const newLinkId = `link-${Date.now()}`;
        const newLink = {
          ...formData,
          id: newLinkId,
          createdAt: Date.now(),
        };
        await setDoc(doc(db, 'users', currentUser.uid, 'links', newLinkId), newLink);
        triggerToast('Link added to vault!', 'success');
      }
    } catch (err) {
      console.error('Save link error:', err);
      triggerToast('Failed to save link: ' + err.message, 'error');
    }
    setEditingLink(null);
  };

  // Update status field of an item
  const handleUpdateStatus = async (id, status) => {
    if (!currentUser) return;
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'links', id);
      await updateDoc(docRef, { status });
      triggerToast('Status updated!', 'success');
    } catch (err) {
      console.error('Update status error:', err);
      triggerToast('Failed to update status: ' + err.message, 'error');
    }
  };

  // Update priority field of an item
  const handleUpdatePriority = async (id, priority) => {
    if (!currentUser) return;
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'links', id);
      await updateDoc(docRef, { priority });
      triggerToast('Priority updated!', 'success');
    } catch (err) {
      console.error('Update priority error:', err);
      triggerToast('Failed to update priority: ' + err.message, 'error');
    }
  };

  // Open Delete Confirmation Modal
  const handleDeleteLink = (id) => {
    setDeletingLinkId(id);
  };

  // Perform actual deletion after confirmation
  const handleConfirmDelete = async () => {
    if (!currentUser) return;
    const linkToDelete = links.find((l) => l.id === deletingLinkId);
    if (!linkToDelete) return;

    setDeletingLinkId(null);

    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'links', linkToDelete.id));
      
      triggerToast(`Deleted "${linkToDelete.title.substring(0, 30)}..."`, 'undo', async () => {
        try {
          await setDoc(doc(db, 'users', currentUser.uid, 'links', linkToDelete.id), linkToDelete);
          triggerToast('Restored link successfully!', 'success');
        } catch (restoreErr) {
          console.error('Restore link error:', restoreErr);
          triggerToast('Failed to restore link: ' + restoreErr.message, 'error');
        }
      });
    } catch (err) {
      console.error('Delete error:', err);
      triggerToast('Failed to delete item: ' + err.message, 'error');
    }
  };

  const handleEditClick = (item) => {
    setEditingLink(item);
    setIsModalOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingLink(null);
    setIsModalOpen(true);
  };

  // Dynamically calculate unique tags and their frequencies from links
  const allTags = useMemo(() => {
    const counts = {};
    links.forEach((link) => {
      if (link.tags) {
        link.tags.forEach((tag) => {
          const cleaned = tag.trim().toLowerCase();
          if (cleaned) {
            counts[cleaned] = (counts[cleaned] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [links]);

  const handleToggleTag = (tagName) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleClearTags = () => {
    setSelectedTags([]);
  };

  // Filter and Sort links
  const filteredAndSortedLinks = useMemo(() => {
    let result = [...links];

    // 1. Filter by Type
    if (filterType !== 'all') {
      result = result.filter((link) => link.type === filterType);
    }

    // 2. Filter by Search Query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (link) =>
          link.title.toLowerCase().includes(query) ||
          link.creator.toLowerCase().includes(query) ||
          (link.description && link.description.toLowerCase().includes(query)) ||
          link.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          (link.status && link.status.toLowerCase().includes(query)) ||
          (link.priority && link.priority.toLowerCase().includes(query))
      );
    }

    // 2b. Filter by Selected Tags
    if (selectedTags.length > 0) {
      result = result.filter((link) => {
        const linkTags = (link.tags || []).map((t) => t.toLowerCase());
        if (matchMode === 'all') {
          // Every selected tag must be present on the link
          return selectedTags.every((tag) => linkTags.includes(tag));
        } else {
          // At least one selected tag must be present on the link
          return selectedTags.some((tag) => linkTags.includes(tag));
        }
      });
    }

    // 3. Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return b.createdAt - a.createdAt;
      }
      if (sortBy === 'oldest') {
        return a.createdAt - b.createdAt;
      }
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'title-desc') {
        return b.title.localeCompare(a.title);
      }
      if (sortBy === 'creator') {
        return a.creator.localeCompare(b.creator);
      }
      return 0;
    });

    return result;
  }, [links, filterType, searchQuery, sortBy, selectedTags, matchMode]);

  // Auth Loading State Render
  if (loadingAuth) {
    return (
      <div className="login-screen-container" style={{ flexDirection: 'column', gap: '1.5rem', minHeight: '100vh' }}>
        <div style={{ color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.15em', fontSize: '0.9rem', fontFamily: 'var(--font-sans)' }}>
          DECRYPTING VAULT SECTOR...
        </div>
      </div>
    );
  }

  // Not Authenticated Layout
  if (!currentUser) {
    return (
      <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="retro-navbar-unified">
          <div className="retro-brand-section">
            <h1 className="retro-title-compact">podtube</h1>
          </div>
          <div className="retro-header-actions">
            <button 
              className="btn-retro"
              onClick={() => setIsTechModalOpen(true)}
              title="View Project Tech Stack"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Code size={11} />
              <span>TECH STACK</span>
            </button>
            <button 
              className="btn-retro-toggle" 
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
          </div>
        </header>

        <main className="login-screen-container">
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="login-card-retro"
          >
            <div className="login-brand-icon">📼</div>
            <h2 className="login-title">podtube</h2>
            <p className="login-subtitle">
              An elegant retro industrial vault for organizing your favorite podcasts and YouTube resources.
            </p>
            <button className="btn-google-signin" onClick={handleLogin}>
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>ACCESS VIA GOOGLE</span>
            </button>
            <div className="login-footer-text">SECURE SECTOR 9 // CLOUD ENCRYPTED</div>
          </motion.div>
        </main>

        {/* Tech Stack Modal */}
        <TechStackModal
          isOpen={isTechModalOpen}
          onClose={() => setIsTechModalOpen(false)}
        />

        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    );
  }

  // Authenticated Layout
  return (
    <div className="app-container">
      {/* Header section */}
      <Navbar 
        stats={stats} 
        onAddClick={handleAddNewClick} 
        theme={theme} 
        onThemeToggle={toggleTheme} 
        user={currentUser}
        onLogout={handleLogout}
        onTechStackClick={() => setIsTechModalOpen(true)}
      />

      {/* Filter and Search Panel */}
      <FilterPanel
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterType={filterType}
        setFilterType={setFilterType}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
      />

      <div className={`retro-main-layout ${showSidebar ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Tag Sidebar */}
        <TagSidebar
          allTags={allTags}
          selectedTags={selectedTags}
          onToggleTag={handleToggleTag}
          onClearTags={handleClearTags}
          matchMode={matchMode}
          setMatchMode={setMatchMode}
          isOpen={showSidebar}
        />

        {/* Links Grid */}
        <main className="content-area">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedLinks.length > 0 ? (
              <motion.div 
                layout
                className={`links-grid ${viewMode === 'list' ? 'list-view' : ''}`}
              >
                <AnimatePresence>
                  {filteredAndSortedLinks.map((link) => (
                    <LinkCard
                      key={link.id}
                      item={link}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteLink}
                      onUpdateStatus={handleUpdateStatus}
                      onUpdatePriority={handleUpdatePriority}
                      viewMode={viewMode}
                      onPlay={setActivePlayerItem}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="empty-state-panel glass-panel"
              >
                <div className="empty-icon-wrapper">
                  <Inbox size={48} className="empty-icon" />
                </div>
                <h3>No items match your criteria</h3>
                <p>Try clearing your search query, changing filters, or saving a new link to get started.</p>
                {(searchQuery || selectedTags.length > 0) && (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setSearchQuery('');
                      handleClearTags();
                    }}
                  >
                    Clear All Filters
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Add / Edit Modal */}
      <LinkModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLink(null);
        }}
        onSave={handleSaveLink}
        editItem={editingLink}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deletingLinkId !== null}
        onClose={() => setDeletingLinkId(null)}
        onConfirm={handleConfirmDelete}
        itemTitle={deletingLinkTitle}
      />

      {/* Tech Stack Modal */}
      <TechStackModal
        isOpen={isTechModalOpen}
        onClose={() => setIsTechModalOpen(false)}
      />

      {/* Toast Notification HUD */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Retro Immersive Player */}
      {activePlayerItem && (
        <RetroPlayer
          item={activePlayerItem}
          isMinimized={isPlayerMinimized}
          onMinimize={() => setIsPlayerMinimized(true)}
          onMaximize={() => setIsPlayerMinimized(false)}
          onClose={() => {
            setActivePlayerItem(null);
            setIsPlayerMinimized(false);
          }}
        />
      )}
    </div>
  );
}
