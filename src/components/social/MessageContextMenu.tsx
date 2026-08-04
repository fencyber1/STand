import { useState, useEffect, useRef } from 'react';
import { Info, Copy, Pencil, Pin, X, Check, CheckCheck, Clock } from 'lucide-react';

interface MessageContextMenuProps {
  isOwn: boolean;
  messageText: string;
  messageType?: string;
  read?: boolean;
  readBy?: string[];
  createdAt: string;
  isGroup?: boolean;
  isPinned?: boolean;
  onEdit: () => void;
  onPin: () => void;
  onClose: () => void;
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessageContextMenu({
  isOwn,
  messageText,
  messageType = 'text',
  read,
  readBy,
  createdAt,
  isGroup = false,
  isPinned = false,
  onEdit,
  onPin,
  onClose,
}: MessageContextMenuProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => { setCopied(false); onClose(); }, 800);
    } catch {
      onClose();
    }
  };

  const getDeliveryStatus = () => {
    if (isGroup) {
      const readers = (readBy || []).length;
      if (readers > 1) return { label: `Read by ${readers - 1}`, icon: <CheckCheck className="w-4 h-4 text-blue-400" />, detail: 'Seen by others' };
      return { label: 'Sent', icon: <Check className="w-4 h-4 text-white/50" />, detail: 'Not yet read' };
    }
    if (read) return { label: 'Read', icon: <CheckCheck className="w-4 h-4 text-blue-400" />, detail: 'Seen by recipient' };
    return { label: 'Sent', icon: <Check className="w-4 h-4 text-white/50" />, detail: 'Not yet read by recipient' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={menuRef}
        className="bg-[#1c2333] rounded-2xl border border-white/10 shadow-2xl shadow-black/60 w-56 overflow-hidden animate-in fade-in zoom-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {showInfo ? (
          /* Info Panel */
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Message Info</h3>
              <button onClick={() => setShowInfo(false)} className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-white/40" />
                <div>
                  <p className="text-xs text-white/50">Sent</p>
                  <p className="text-sm text-white">{formatDateTime(createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getDeliveryStatus().icon}
                <div>
                  <p className="text-xs text-white/50">{getDeliveryStatus().label}</p>
                  <p className="text-sm text-white">{getDeliveryStatus().detail}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Menu Items */
          <div className="py-1">
            {/* Info */}
            <button
              onClick={() => setShowInfo(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
            >
              <Info className="w-4 h-4 text-white/50" />
              <span>Info</span>
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/50" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            {/* Edit - only for own text messages */}
            {isOwn && messageType === 'text' && (
              <button
                onClick={() => { onEdit(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
              >
                <Pencil className="w-4 h-4 text-white/50" />
                <span>Edit</span>
              </button>
            )}

            {/* Pin */}
            <button
              onClick={() => { onPin(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
            >
              <Pin className="w-4 h-4 text-white/50" />
              <span>{isPinned ? 'Unpin' : 'Pin'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
