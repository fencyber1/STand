import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, Share2, Loader2, Image as ImageIcon } from 'lucide-react';
import type { Post } from '../../types';

interface SharePostCardProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

const W = 540;
const H = 680;

function timeAgoShort(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString();
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines: number): number {
  if (!text || !text.trim()) return y;
  const words = text.trim().split(/\s+/);
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

function drawIcons(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const s = 20;
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Heart
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y - s * 0.15, x - s * 0.5, y - s * 0.5, x, y - s * 0.25);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.5, x + s * 0.5, y - s * 0.15, x, y + s * 0.3);
  ctx.stroke();

  // Comment bubble
  const cx2 = x + 44;
  const rr = s * 0.42;
  ctx.beginPath();
  roundedRect(ctx, cx2 - rr, y - rr * 0.8, rr * 2, rr * 1.5, rr * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx2 - rr * 0.3, y + rr * 0.7);
  ctx.lineTo(cx2 - rr * 0.6, y + rr * 1.15);
  ctx.stroke();

  // Share arrow
  const cx3 = x + 88;
  ctx.beginPath();
  ctx.moveTo(cx3, y - s * 0.35);
  ctx.lineTo(cx3 + s * 0.35, y);
  ctx.lineTo(cx3, y + s * 0.35);
  ctx.stroke();

  // Bookmark (far right)
  const bx = W - 30;
  const bw = s * 0.55;
  const bh = s * 0.7;
  ctx.beginPath();
  ctx.moveTo(bx - bw / 2, y - bh / 2);
  ctx.lineTo(bx + bw / 2, y - bh / 2);
  ctx.lineTo(bx + bw / 2, y + bh / 2);
  ctx.lineTo(bx, y + bh * 0.25);
  ctx.lineTo(bx - bw / 2, y + bh / 2);
  ctx.closePath();
  ctx.stroke();
}

function buildCard(post: Post, isDark: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  const bg = isDark ? '#1A1A2E' : '#FFFFFF';
  const textPri = isDark ? '#F1F5F9' : '#111827';
  const textSec = isDark ? '#94A3B8' : '#6B7280';
  const border = isDark ? '#334155' : '#E5E7EB';
  const caption = isDark ? '#CBD5E1' : '#1F2937';

  // ── Card background ──
  roundedRect(ctx, 0, 0, W, H, 22);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // ── HEADER ──
  const hx = 28, hy = 34, ar = 20;

  // Gradient ring
  const g = ctx.createLinearGradient(hx - ar, hy - ar, hx + ar, hy + ar);
  g.addColorStop(0, '#F472B6');
  g.addColorStop(0.5, '#C084FC');
  g.addColorStop(1, '#60A5FA');
  ctx.beginPath();
  ctx.arc(hx, hy, ar + 2.5, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  // Avatar fill (initial)
  ctx.beginPath();
  ctx.arc(hx, hy, ar, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? '#4C1D95' : '#6366F1';
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((post.authorName || '?')[0].toUpperCase(), hx, hy + 1);

  // Name
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textPri;
  ctx.font = '600 15px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(post.authorName, hx + ar + 14, hy - 3);

  // Time
  ctx.fillStyle = textSec;
  ctx.font = '400 11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(timeAgoShort(post.createdAt), hx + ar + 14, hy + 15);

  // Three dots
  ctx.fillStyle = textSec;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(W - 28, hy - 10 + i * 10, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── DIVIDER ──
  ctx.strokeStyle = border;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(28, 62);
  ctx.lineTo(W - 28, 62);
  ctx.stroke();

  // ── POST CONTENT ──
  const cx = 28, cy = 80, cw = W - 56;
  ctx.fillStyle = textPri;
  ctx.font = '400 15px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textBaseline = 'top';
  const bottom = wrapText(ctx, post.content, cx, cy, cw, 22, 14);

  // ── ICONS ──
  const iy = Math.max(bottom + 26, 460);
  drawIcons(ctx, cx + 18, iy);

  // ── LIKES ──
  const ly = iy + 34;
  ctx.fillStyle = textPri;
  ctx.font = '700 14px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(`${post.likes.length.toLocaleString()} ${post.likes.length === 1 ? 'like' : 'likes'}`, cx, ly);

  // ── CAPTION ──
  const capY = ly + 24;
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = caption;
  const nw = ctx.measureText(post.authorName + ' ').width;
  ctx.fillText(post.authorName + ' ', cx, capY);
  ctx.font = '400 13px -apple-system, BlinkMacSystemFont, sans-serif';
  wrapText(ctx, post.content, cx + nw, capY, cw - nw, 18, 2);

  // ── COMMENTS ──
  const comY = capY + 40;
  ctx.fillStyle = textSec;
  ctx.font = '400 12px -apple-system, BlinkMacSystemFont, sans-serif';
  if (post.commentCount > 0) {
    ctx.fillText(`View all ${post.commentCount} comment${post.commentCount !== 1 ? 's' : ''}`, cx, comY);
  }

  // ── TIMESTAMP ──
  ctx.fillText(timeAgoShort(post.createdAt).toUpperCase(), cx, comY + 22);

  // ── WATERMARK ──
  ctx.fillStyle = textSec;
  ctx.font = '500 9px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Made with STand', W / 2, H - 16);

  return canvas;
}

export default function SharePostCard({ post, isOpen, onClose }: SharePostCardProps) {
  const displayRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(true);
  const isDark = document.documentElement.classList.contains('dark');

  useEffect(() => {
    if (!isOpen || !displayRef.current) return;
    setGenerating(true);

    const timer = setTimeout(() => {
      try {
        const offscreen = buildCard(post, isDark);
        const dest = displayRef.current;
        if (dest) {
          dest.width = offscreen.width;
          dest.height = offscreen.height;
          const dCtx = dest.getContext('2d');
          if (dCtx) {
            dCtx.drawImage(offscreen, 0, 0);
          }
        }
      } catch (err) {
        console.error('Share card render failed:', err);
      }
      setGenerating(false);
    }, 60);

    return () => clearTimeout(timer);
  }, [isOpen, post, isDark]);

  const handleSave = useCallback(() => {
    if (!displayRef.current) return;
    const link = document.createElement('a');
    link.download = `stand-post-${Date.now()}.png`;
    link.href = displayRef.current.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleShare = useCallback(async () => {
    if (!displayRef.current) return;
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        displayRef.current!.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed'))), 'image/png');
      });
      const file = new File([blob], 'stand-post.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: 'Check this out on STand!' });
      } else {
        const url = URL.createObjectURL(blob);
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <ImageIcon size={18} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">Share as Image</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-4 flex justify-center relative">
          <canvas
            ref={displayRef}
            style={{ width: '100%', borderRadius: 16, display: 'block' }}
            className="border border-gray-200 dark:border-gray-700 shadow-lg"
          />
          {generating && (
            <div className="absolute inset-4 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl">
              <Loader2 size={28} className="animate-spin text-indigo-400" />
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 pb-4">
          <button onClick={handleSave} disabled={generating} className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition disabled:opacity-40 flex items-center justify-center gap-2">
            <Download size={16} /> Save
          </button>
          <button onClick={handleShare} disabled={generating} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold transition disabled:opacity-40 flex items-center justify-center gap-2">
            <Share2 size={16} /> Share
          </button>
        </div>
      </div>
    </div>
  );
}
