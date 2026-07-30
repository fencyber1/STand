import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { markStatusViewed, deleteStatus } from '../../services/statusService';
import type { Status } from '../../types';

interface Props {
  statuses: Status[];
  startIndex: number;
  onClose: () => void;
}

export default function StatusViewer({ statuses, startIndex, onClose }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showInfo, setShowInfo] = useState(true);

  const current = statuses[currentIdx];
  const isOwner = current?.uid === user?.uid;
  const DURATION = 5000; // 5 seconds per status

  const goNext = useCallback(() => {
    if (currentIdx < statuses.length - 1) {
      setCurrentIdx((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIdx, statuses.length, onClose]);

  const goPrev = useCallback(() => {
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

  // Progress timer
  useEffect(() => {
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
  }, [currentIdx, goNext]);

  // Tap zones
  const handleTap = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) goPrev();
    else if (x > (rect.width * 2) / 3) goNext();
    else setShowInfo((s) => !s);
  };

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onClose]);

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
    <div className="fixed inset-0 z-[100] bg-black flex flex-col" onClick={handleTap}>
      {/* Progress bars */}
      <div className="flex gap-1 p-2 pt-3 px-3">
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
      <div className="flex items-center gap-3 px-3 py-2">
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
      <div className="flex-1 flex items-center justify-center overflow-hidden">
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

      {/* View count (owner only) */}
      {isOwner && showInfo && current.viewedBy.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-3 text-white/60 text-sm">
          <Eye size={16} />
          <span>Viewed by {current.viewedBy.length}</span>
        </div>
      )}

      {/* Nav arrows (desktop) */}
      {currentIdx > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {currentIdx < statuses.length - 1 && (
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
