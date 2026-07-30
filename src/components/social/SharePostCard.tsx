import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, Share2, Loader2, Image as ImageIcon } from 'lucide-react';
import type { Post } from '../../types';

interface SharePostCardProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

const CARD_W = 540;
const CARD_H = 680;
const DPR = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 2;
const S = DPR;
const R = 24 * S;

function timeAgoShort(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, type: 'heart' | 'comment' | 'share' | 'bookmark') {
  const s = size * S;
  ctx.save();
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 1.8 * S;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'transparent';

  if (type === 'heart') {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.3);
    ctx.bezierCurveTo(cx - s * 0.5, cy - s * 0.15, cx - s * 0.5, cy - s * 0.5, cx, cy - s * 0.25);
    ctx.bezierCurveTo(cx + s * 0.5, cy - s * 0.5, cx + s * 0.5, cy - s * 0.15, cx, cy + s * 0.3);
    ctx.stroke();
  } else if (type === 'comment') {
    ctx.beginPath();
    const rr = s * 0.42;
    roundRect(ctx, cx - rr, cy - rr * 0.8, rr * 2, rr * 1.5, rr * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - rr * 0.3, cy + rr * 0.7);
    ctx.lineTo(cx - rr * 0.6, cy + rr * 1.15);
    ctx.stroke();
  } else if (type === 'share') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.35);
    ctx.lineTo(cx + s * 0.35, cy);
    ctx.lineTo(cx, cy + s * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.05, cy - s * 0.05);
    ctx.lineTo(cx + s * 0.05, cy + s * 0.05);
    ctx.stroke();
  } else if (type === 'bookmark') {
    const w = s * 0.55;
    const h = s * 0.7;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy + h / 2);
    ctx.lineTo(cx, cy + h * 0.25);
    ctx.lineTo(cx - w / 2, cy + h / 2);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines: number): number {
  const words = text.split(/\s+/);
  let line = '';
  let linesUsed = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      linesUsed++;
      if (linesUsed >= maxLines) {
        ctx.fillText(line.slice(0, -3) + '...', x, y);
        return y + lineH;
      }
      ctx.fillText(line, x, y);
      line = words[i];
      y += lineH;
    } else {
      line = test;
    }
  }
  if (line) {
    linesUsed++;
    if (linesUsed >= maxLines) {
      ctx.fillText(line.slice(0, -3) + '...', x, y);
    } else {
      ctx.fillText(line, x, y);
    }
  }
  return y + lineH;
}

function renderCard(
  canvas: HTMLCanvasElement,
  post: Post,
  isDark: boolean,
  avatarImg: HTMLImageElement | null,
): Promise<void> {
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d')!;
    canvas.width = CARD_W * S;
    canvas.height = CARD_H * S;

    const bg = isDark ? '#1A1A2E' : '#FFFFFF';
    const textPrimary = isDark ? '#F1F5F9' : '#111827';
    const textSecondary = isDark ? '#94A3B8' : '#6B7280';
    const borderColor = isDark ? '#334155' : '#E5E7EB';
    const captionColor = isDark ? '#CBD5E1' : '#1F2937';
    const tagColor = isDark ? '#818CF8' : '#4F46E5';

    // Card background
    roundRect(ctx, 0, 0, CARD_W * S, CARD_H * S, R);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1 * S;
    ctx.stroke();
    ctx.clip();

    // ── HEADER ──
    const hx = 28 * S, hy = 32 * S;
    const avatarR = 22 * S;
    const gradient = ctx.createLinearGradient(hx - avatarR, hy - avatarR, hx + avatarR, hy + avatarR);
    gradient.addColorStop(0, '#F472B6');
    gradient.addColorStop(0.5, '#C084FC');
    gradient.addColorStop(1, '#60A5FA');
    ctx.beginPath();
    ctx.arc(hx, hy, avatarR + 3 * S, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(hx, hy, avatarR, 0, Math.PI * 2);
    ctx.clip();
    if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
      ctx.drawImage(avatarImg, hx - avatarR, hy - avatarR, avatarR * 2, avatarR * 2);
    } else {
      ctx.fillStyle = isDark ? '#334155' : '#E5E7EB';
      ctx.fill();
      ctx.fillStyle = textPrimary;
      ctx.font = `bold ${20 * S}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((post.authorName || '?')[0].toUpperCase(), hx, hy);
    }
    ctx.restore();

    ctx.fillStyle = textPrimary;
    ctx.font = `600 ${16 * S}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(post.authorName, hx + avatarR + 16 * S, hy - 4 * S);

    ctx.fillStyle = textSecondary;
    ctx.font = `400 ${12 * S}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(timeAgoShort(post.createdAt), hx + avatarR + 16 * S, hy + 16 * S);

    // Three-dot menu
    const menuX = CARD_W * S - 32 * S;
    ctx.fillStyle = textSecondary;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(menuX, hy - 12 * S + i * 12 * S, 2.5 * S, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── POST CONTENT ──
    const contentX = 28 * S;
    const contentY = 100 * S;
    const contentMaxW = (CARD_W - 56) * S;
    ctx.fillStyle = textPrimary;
    ctx.font = `400 ${16 * S}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textBaseline = 'top';
    const contentBottom = wrapText(ctx, post.content, contentX, contentY, contentMaxW, 24 * S, 12);

    // ── DECORATIVE ICONS ROW ──
    const iconY = Math.max(contentBottom + 28 * S, 480 * S);
    const iconSize = 22;
    drawIcon(ctx, contentX + 18 * S, iconY, iconSize, 'heart');
    drawIcon(ctx, contentX + 62 * S, iconY, iconSize, 'comment');
    drawIcon(ctx, contentX + 106 * S, iconY, iconSize, 'share');
    drawIcon(ctx, CARD_W * S - 32 * S, iconY, iconSize, 'bookmark');

    // ── LIKE COUNT ──
    const likesY = iconY + 36 * S;
    ctx.fillStyle = textPrimary;
    ctx.font = `700 ${15 * S}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(`${post.likes.length.toLocaleString()} ${post.likes.length === 1 ? 'like' : 'likes'}`, contentX, likesY);

    // ── CAPTION ──
    const captionY = likesY + 26 * S;
    ctx.font = `600 ${14 * S}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = captionColor;
    const nameW = ctx.measureText(post.authorName + ' ').width;
    ctx.fillText(post.authorName + ' ', contentX, captionY);
    ctx.font = `400 ${14 * S}px -apple-system, BlinkMacSystemFont, sans-serif`;
    wrapText(ctx, post.content, contentX + nameW, captionY, contentMaxW - nameW, 20 * S, 2);

    // ── COMMENTS LINE ──
    const commentsY = captionY + 44 * S;
    ctx.fillStyle = textSecondary;
    ctx.font = `400 ${13 * S}px -apple-system, BlinkMacSystemFont, sans-serif`;
    if (post.commentCount > 0) {
      ctx.fillText(`View all ${post.commentCount} comment${post.commentCount !== 1 ? 's' : ''}`, contentX, commentsY);
    }

    // ── TIMESTAMP ──
    const tsY = commentsY + 26 * S;
    ctx.fillText(timeAgoShort(post.createdAt).toUpperCase(), contentX, tsY);

    resolve();
  });
}

export default function SharePostCard({ post, isOpen, onClose }: SharePostCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarImg, setAvatarImg] = useState<HTMLImageElement | null>(null);
  const isDark = document.documentElement.classList.contains('dark');

  useEffect(() => {
    if (!isOpen) return;
    setGenerating(true);
    setShareUrl(null);
    setAvatarLoaded(false);

    if (post.authorPhoto) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { setAvatarImg(img); setAvatarLoaded(true); };
      img.onerror = () => { setAvatarImg(null); setAvatarLoaded(true); };
      img.src = post.authorPhoto;
    } else {
      setAvatarImg(null);
      setAvatarLoaded(true);
    }
  }, [isOpen, post]);

  useEffect(() => {
    if (!isOpen || !avatarLoaded || !canvasRef.current) return;
    renderCard(canvasRef.current, post, isDark, avatarImg).then(() => {
      setGenerating(false);
    });
  }, [isOpen, avatarLoaded, isDark, avatarImg, post]);

  const handleSave = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `stand-post-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }, []);

  const handleShare = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvasRef.current!.toBlob((b) => b ? resolve(b) : reject(new Error('Failed')), 'image/png');
      });
      const file = new File([blob], 'stand-post.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: 'Check this out on STand!' });
      } else {
        const url = URL.createObjectURL(blob);
        setShareUrl(url);
        window.open(url, '_blank');
      }
    } catch {
      handleSave();
    }
  }, [handleSave]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-[420px] border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <ImageIcon size={18} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">Share as Image</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Canvas preview */}
        <div className="p-4 flex justify-center">
          {generating ? (
            <div className="w-[270px] h-[340px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl">
              <Loader2 size={28} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              style={{ width: CARD_W / 2.2, height: CARD_H / 2.2, borderRadius: 16 }}
              className="border border-gray-200 dark:border-gray-700 shadow-lg"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={handleSave}
            disabled={generating}
            className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Download size={16} /> Save
          </button>
          <button
            onClick={handleShare}
            disabled={generating}
            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Share2 size={16} /> Share
          </button>
        </div>
      </div>
    </div>
  );
}
