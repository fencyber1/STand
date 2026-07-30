import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Trash2, Heart, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { markStatusViewed, toggleStatusLike, addStatusComment, subscribeToStatusComments, deleteStatus } from '../../services/statusService';
import type { Status, StatusComment } from '../../types';

interface Props {
  statuses: Status[];
  startIndex: number;
  onClose: () => void;
  onStatusUpdate?: (updated: Status) => void;
}

export default function StatusViewer({ statuses, startIndex, onClose, onStatusUpdate }: Props) {
  const { user } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showInfo, setShowInfo] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<StatusComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const current = statuses[currentIdx];
  const isOwner = current?.uid === user?.uid;
  const DURATION = 5000;

  // Sync like state
  useEffect(() => {
    if (!current || !user?.uid) return;
    setLiked(current.likes.includes(user.uid));
    setLikeCount(current.likes.length);
  }, [current, user?.uid]);

  // Subscribe to comments
  useEffect(() => {
    if (!current) return;
    const unsub = subscribeToStatusComments(current.id, setComments);
    return unsub;
  }, [current?.id]);

  const goNext = useCallback(() => {
    setShowComments(false);
    if (currentIdx < statuses.length - 1) {
      setCurrentIdx((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIdx, statuses.length, onClose]);

  const goPrev = useCallback(() => {
    setShowComments(false);
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
      setProgress(0);
    }
  }, [currentIdx]);

  // Mark as viewed
  useEffect(() => {
    if (current && user?.uid && !current.viewedBy.includes(user.uid)) {
      markStatusViewed(current.id, user.uid).catch(() => {});
    }
  }, [current, user?.uid]);

  // Progress timer — pause when comments open
  useEffect(() => {
    if (showComments) { if (timerRef.current) clearInterval(timerRef.current); return; }
    setProgress(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        goNext();
      }
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIdx, goNext, showComments]);

  // Tap zones
  const handleTap = (e: React.MouseEvent) => {
    if (showComments) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) goPrev();
    else if (x > (rect.width * 2) / 3) goNext();
    else setShowInfo((s) => !s);
  };

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showComments) return;
      if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onClose, showComments]);

  const handleLike = async () => {
    if (!current || !user?.uid) return;
    await toggleStatusLike(current.id, user.uid);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => newLiked ? c + 1 : c - 1);
    onStatusUpdate?.({ ...current, likes: newLiked ? [...current.likes, user.uid] : current.likes.filter((l) => l !== user.uid) });
  };

  const handleComment = async () => {
    if (!current || !user || !commentText.trim()) return;
    const text = commentText.trim();
    setCommentText('');
    await addStatusComment(current.id, { uid: user.uid, displayName: user.fullName, photoURL: user.photoURL || null }, text);
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleDelete = async () => {
    if (!current || !isOwner) return;
    if (!confirm('Delete this status?')) return;
    await deleteStatus(current.id);
    if (statuses.length <= 1) onClose();
    else if (currentIdx >= statuses.length - 1) setCurrentIdx((i) => i - 1);
  };

  if (!current) return null;

  const timeAgo = (() => {
    const diff = Math.floor((Date.now() - new Date(current.createdAt).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  })();

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Progress bars */}
      <div className="flex gap-1 p-2 pt-3 px-3 shrink-0">
        {statuses.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-75"
              style={{
                width: i < currentIdx ? '100%' : i === currentIdx ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 shrink-0">
        {current.photoURL ? (
          <img src={current.photoURL} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
            {current.displayName.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{current.displayName}</p>
          <p className="text-white/50 text-xs">{timeAgo}</p>
        </div>
        {isOwner && (
          <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="p-2 text-white/60 hover:text-red-400">
            <Trash2 size={18} />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 text-white/60 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden min-h-0"
        onClick={handleTap}
      >
        {current.type === 'image' ? (
          <img src={current.content} alt="" className="max-w-full max-h-full object-contain" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ backgroundColor: current.backgroundColor }}
          >
            <p
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-center leading-relaxed break-words max-w-lg"
              style={{ color: current.textColor }}
            >
              {current.content}
            </p>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex items-center gap-2 px-4 py-3 shrink-0">
        {/* Like button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleLike(); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Heart size={18} className={liked ? 'fill-red-500 text-red-500' : 'text-white'} />
          {likeCount > 0 && <span className="text-white text-sm">{likeCount}</span>}
        </button>

        {/* Comment button */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowComments(true); setTimeout(() => commentInputRef.current?.focus(), 100); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <MessageCircle size={18} className="text-white" />
          {comments.length > 0 && <span className="text-white text-sm">{comments.length}</span>}
        </button>

        {/* View count (owner) */}
        {isOwner && showInfo && (
          <div className="flex items-center gap-1.5 ml-auto text-white/50 text-sm">
            <Eye size={16} />
            <span>{current.viewedBy.length}</span>
          </div>
        )}
      </div>

      {/* Comments Panel */}
      {showComments && (
        <div
          className="absolute inset-x-0 bottom-0 z-10 bg-gray-900/95 backdrop-blur-sm rounded-t-2xl max-h-[60vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Comments header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <p className="text-white font-semibold text-sm">
              Comments {comments.length > 0 && `(${comments.length})`}
            </p>
            <button onClick={() => setShowComments(false)} className="p-1 text-white/50 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {comments.length === 0 ? (
              <p className="text-white/30 text-center text-sm py-6">No comments yet. Be the first!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  {c.photoURL ? (
                    <img src={c.photoURL} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {c.displayName.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-white text-xs font-semibold">{c.displayName.split(' ')[0]}</span>
                      <span className="text-white/30 text-[10px]">
                        {(() => {
                          const diff = Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 1000);
                          if (diff < 60) return 'now';
                          if (diff < 3600) return `${Math.floor(diff / 60)}m`;
                          if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
                          return `${Math.floor(diff / 86400)}d`;
                        })()}
                      </span>
                    </div>
                    <p className="text-white/80 text-sm leading-snug">{c.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Comment input */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10">
            <input
              ref={commentInputRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
              placeholder="Write a comment..."
              className="flex-1 bg-white/10 text-white text-sm rounded-full px-4 py-2.5 outline-none placeholder-white/30"
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim()}
              className="p-2.5 rounded-full bg-primary-500 text-white disabled:opacity-30 disabled:bg-white/10 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Nav arrows (desktop) */}
      {!showComments && currentIdx > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {!showComments && currentIdx < statuses.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  );
}
