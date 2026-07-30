import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, Share2, Loader2, Image as ImageIcon } from 'lucide-react';
import type { Post } from '../../types';

interface SharePostCardProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

const CARD_W = 540;
const PAD = 28;
const CONTENT_W = CARD_W - PAD * 2;

function timeAgoShort(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString();
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function measureWrappedText(ctx: CanvasRenderingContext2D, text: string, maxW: number, lineH: number, maxLines: number): { lines: string[]; height: number } {
  if (!text || !text.trim()) return { lines: [], height: 0 };
  const words = text.trim().split(/\s+/);
  const result: string[] = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      if (result.length >= maxLines) {
        result[result.length - 1] = result[result.length - 1].slice(0, -3) + '...';
        break;
      }
      result.push(line);
      line = words[i];
    } else {
      line = test;
    }
  }
  if (line) {
    if (result.length >= maxLines) {
      result[result.length - 1] = result[result.length - 1].slice(0, -3) + '...';
    } else {
      result.push(line);
    }
  }
  return { lines: result, height: result.length * lineH };
}

function drawWrappedText(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineH: number) {
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += lineH;
  }
}

function drawIcons(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const s = 20;
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y - s * 0.15, x - s * 0.5, y - s * 0.5, x, y - s * 0.25);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.5, x + s * 0.5, y - s * 0.15, x, y + s * 0.3);
  ctx.stroke();

  const cx2 = x + 44;
  const rr = s * 0.42;
  rrect(ctx, cx2 - rr, y - rr * 0.8, rr * 2, rr * 1.5, rr * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx2 - rr * 0.3, y + rr * 0.7);
  ctx.lineTo(cx2 - rr * 0.6, y + rr * 1.15);
  ctx.stroke();

  const cx3 = x + 88;
  ctx.beginPath();
  ctx.moveTo(cx3, y - s * 0.35);
  ctx.lineTo(cx3 + s * 0.35, y);
  ctx.lineTo(cx3, y + s * 0.35);
  ctx.stroke();

  const bx = CARD_W - 30;
  const bw = s * 0.55, bh = s * 0.7;
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
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;

  const bg = isDark ? '#1A1A2E' : '#FFFFFF';
  const textPri = isDark ? '#F1F5F9' : '#111827';
  const textSec = isDark ? '#94A3B8' : '#6B7280';
  const border = isDark ? '#334155' : '#E5E7EB';
  const caption = isDark ? '#CBD5E1' : '#1F2937';

  // ── Measure content to determine height ──
  ctx.font = '400 15px -apple-system, BlinkMacSystemFont, sans-serif';
  const contentMeasurement = measureWrappedText(ctx, post.content, CONTENT_W, 22, 50);

  // Caption lines (name + content truncated to 2 lines)
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, sans-serif';
  const nameW = ctx.measureText(post.authorName + ' ').width;
  ctx.font = '400 13px -apple-system, BlinkMacSystemFont, sans-serif';
  const captionMeasurement = measureWrappedText(ctx, post.content, CONTENT_W - nameW, 18, 2);

  // ── Calculate total height ──
  const HEADER_H = 70;
  const CONTENT_PAD_TOP = 18;
  const CONTENT_PAD_BOTTOM = 14;
  const ICONS_H = 34;
  const ICONS_GAP = 26;
  const LIKES_H = 22;
  const CAPTION_GAP = 6;
  const CAPTION_H = captionMeasurement.height || 18;
  const COMMENTS_TS_H = post.commentCount > 0 ? 48 : 22;
  const WATERMARK_H = 32;
  const BOTTOM_PAD = 14;

  const contentH = contentMeasurement.height || 0;
  const totalH = HEADER_H + CONTENT_PAD_TOP + contentH + CONTENT_PAD_BOTTOM + ICONS_GAP + ICONS_H + LIKES_H + CAPTION_GAP + CAPTION_H + COMMENTS_TS_H + WATERMARK_H + BOTTOM_PAD;

  const CARD_H = Math.max(totalH, 200);

  c.width = CARD_W * 2;
  c.height = CARD_H * 2;
  ctx.scale(2, 2);

  // ── Background ──
  rrect(ctx, 0, 0, CARD_W, CARD_H, 22);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // ── HEADER ──
  const hx = PAD, hy = 34, ar = 20;
  const g = ctx.createLinearGradient(hx - ar, hy - ar, hx + ar, hy + ar);
  g.addColorStop(0, '#F472B6');
  g.addColorStop(0.5, '#C084FC');
  g.addColorStop(1, '#60A5FA');
  ctx.beginPath();
  ctx.arc(hx, hy, ar + 2.5, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(hx, hy, ar, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? '#4C1D95' : '#6366F1';
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((post.authorName || '?')[0].toUpperCase(), hx, hy + 1);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textPri;
  ctx.font = '600 15px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(post.authorName, hx + ar + 14, hy - 3);

  ctx.fillStyle = textSec;
  ctx.font = '400 11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(timeAgoShort(post.createdAt), hx + ar + 14, hy + 15);

  ctx.fillStyle = textSec;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(CARD_W - 28, hy - 10 + i * 10, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Divider ──
  ctx.strokeStyle = border;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(PAD, HEADER_H - 8);
  ctx.lineTo(CARD_W - PAD, HEADER_H - 8);
  ctx.stroke();

  // ── Content ──
  let y = HEADER_H + CONTENT_PAD_TOP;
  ctx.fillStyle = textPri;
  ctx.font = '400 15px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  if (contentMeasurement.lines.length > 0) {
    drawWrappedText(ctx, contentMeasurement.lines, PAD, y, 22);
  }
  y += contentH + CONTENT_PAD_BOTTOM;

  // ── Icons ──
  y += ICONS_GAP;
  drawIcons(ctx, PAD + 18, y);
  y += ICONS_H;

  // ── Likes ──
  ctx.fillStyle = textPri;
  ctx.font = '700 14px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textBaseline = 'top';
  const likesText = `${post.likes.length.toLocaleString()} ${post.likes.length === 1 ? 'like' : 'likes'}`;
  ctx.fillText(likesText, PAD, y);
  y += LIKES_H + CAPTION_GAP;

  // ── Caption ──
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = caption;
  const nw = ctx.measureText(post.authorName + ' ').width;
  ctx.fillText(post.authorName + ' ', PAD, y);
  ctx.font = '400 13px -apple-system, BlinkMacSystemFont, sans-serif';
  if (captionMeasurement.lines.length > 0) {
    drawWrappedText(ctx, captionMeasurement.lines, PAD + nw, y, 18);
  }
  y += CAPTION_H + 4;

  // ── Comments / timestamp ──
  ctx.fillStyle = textSec;
  ctx.font = '400 12px -apple-system, BlinkMacSystemFont, sans-serif';
  if (post.commentCount > 0) {
    ctx.fillText(`View all ${post.commentCount} comment${post.commentCount !== 1 ? 's' : ''}`, PAD, y);
    y += 22;
  }
  ctx.fillText(timeAgoShort(post.createdAt).toUpperCase(), PAD, y);
  y += 22;

  // ── Watermark ──
  ctx.fillStyle = textSec;
  ctx.font = '500 9px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Made with STand', CARD_W / 2, CARD_H - 14);

  return c;
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
          if (dCtx) dCtx.drawImage(offscreen, 0, 0);
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
