import React, { useState, useEffect, useRef } from 'react';
import './CommentSection.css';

const API_BASE = 'http://localhost:5000/api';

/**
 * CommentSection – Reusable React component for event discussions.
 *
 * Props:
 *   eventId       {string}  – MongoDB _id of the event (required)
 *   eventTitle    {string}  – Display title of the event
 *   eventDescription {string} – Short description of the event
 */
function CommentSection({ eventId, eventTitle, eventDescription }) {
  const [comments,    setComments]    = useState([]);
  const [userName,    setUserName]    = useState('');
  const [newComment,  setNewComment]  = useState('');
  const [loading,     setLoading]     = useState(false);
  const [posting,     setPosting]     = useState(false);
  const [error,       setError]       = useState('');
  const [inputError,  setInputError]  = useState('');

  const listEndRef = useRef(null);

  // ─── Fetch comments whenever eventId changes ──────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    fetchComments();
  }, [eventId]);

  const fetchComments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/comments/${eventId}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setComments(data);
    } catch (err) {
      setError('Unable to load comments. Please check your connection.');
      console.error('Fetch comments error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Submit new comment ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setInputError('');

    if (!userName.trim()) {
      setInputError('Please enter your name.');
      return;
    }
    if (!newComment.trim()) {
      setInputError('Comment cannot be empty.');
      return;
    }

    setPosting(true);
    try {
      const res = await fetch(`${API_BASE}/comments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          eventId,
          userName: userName.trim(),
          text:     newComment.trim()
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server error: ${res.status}`);
      }

      const saved = await res.json();
      // Prepend to top (matching the newest-first sort from backend)
      setComments(prev => [saved, ...prev]);
      setNewComment('');
      // scroll to top so user sees the new comment
      if (listEndRef.current) {
        listEndRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setInputError(err.message || 'Failed to post comment. Try again.');
      console.error('Post comment error:', err);
    } finally {
      setPosting(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getTimeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)              return `${diff}s ago`;
    if (diff < 3600)            return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)           return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800)          return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const getInitial = (name) => (name?.charAt(0) || '?').toUpperCase();

  const avatarColors = [
    '#7c3aed', '#2563eb', '#059669', '#d97706',
    '#db2777', '#0891b2', '#65a30d', '#dc2626'
  ];
  const getAvatarColor = (name) => {
    const idx = (name?.charCodeAt(0) || 0) % avatarColors.length;
    return avatarColors[idx];
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="cs-wrapper">

      {/* ── Event Header ─────────────────────────────────────────── */}
      <div className="cs-event-header">
        <div className="cs-event-badge">EVENT</div>
        <h2 className="cs-event-title">{eventTitle || 'Event Title'}</h2>
        {eventDescription && (
          <p className="cs-event-desc">{eventDescription}</p>
        )}
      </div>

      {/* ── Discussion Panel ─────────────────────────────────────── */}
      <div className="cs-panel">

        {/* Header bar */}
        <div className="cs-panel-header">
          <span className="cs-header-icon">💬</span>
          <span className="cs-header-title">Discussion</span>
          <span className="cs-comment-count">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
          <button
            className="cs-refresh-btn"
            onClick={fetchComments}
            title="Refresh comments"
            disabled={loading}
          >
            {loading ? '⏳' : '🔄'}
          </button>
        </div>

        {/* Global error */}
        {error && (
          <div className="cs-error-banner">
            <span>⚠️ {error}</span>
            <button onClick={fetchComments} className="cs-retry-btn">Retry</button>
          </div>
        )}

        {/* Comment list */}
        <div className="cs-list" ref={listEndRef}>
          {loading && comments.length === 0 ? (
            <div className="cs-loading">
              <div className="cs-spinner" />
              <p>Loading comments…</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="cs-empty">
              <div className="cs-empty-icon">🗨️</div>
              <p>No comments yet. Be the first to start the discussion!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div className="cs-comment-card" key={c._id}>
                <div
                  className="cs-avatar"
                  style={{ background: getAvatarColor(c.userName) }}
                >
                  {getInitial(c.userName)}
                </div>
                <div className="cs-comment-body">
                  <div className="cs-comment-meta">
                    <span className="cs-comment-author">{c.userName}</span>
                    <span className="cs-comment-time">{getTimeAgo(c.createdAt)}</span>
                  </div>
                  <p className="cs-comment-text">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Composer */}
        <form className="cs-composer" onSubmit={handleSubmit} noValidate>
          {inputError && (
            <div className="cs-input-error">⚠️ {inputError}</div>
          )}
          <div className="cs-composer-row">
            <input
              className="cs-input cs-name-input"
              type="text"
              placeholder="Your name"
              value={userName}
              onChange={(e) => { setUserName(e.target.value); setInputError(''); }}
              maxLength={50}
            />
          </div>
          <div className="cs-composer-row cs-composer-main">
            <textarea
              className="cs-input cs-textarea"
              placeholder="Write a comment…"
              value={newComment}
              onChange={(e) => { setNewComment(e.target.value); setInputError(''); }}
              rows={3}
              maxLength={1000}
            />
          </div>
          <div className="cs-composer-row cs-composer-footer">
            <span className="cs-char-count">{newComment.length}/1000</span>
            <button
              type="submit"
              className="cs-submit-btn"
              disabled={posting}
            >
              {posting ? (
                <><span className="cs-btn-spinner" /> Posting…</>
              ) : (
                <><span>✉️</span> Post Comment</>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default CommentSection;
