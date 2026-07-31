import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Image, Palette } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { postStatus } from '../../services/statusService';

const BG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#1e1b4b', '#0f172a', '#18181b', '#ffffff',
];

const TEXT_COLORS = ['#ffffff', '#000000', '#f8fafc', '#1e293b'];

const FONT_STYLES = [
  { label: 'Sans', css: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", weight: '300', size: 'text-3xl' },
  { label: 'Serif', css: "'Georgia', 'Times New Roman', serif", weight: '400', size: 'text-3xl' },
  { label: 'Mono', css: "'SF Mono', 'Fira Code', 'Courier New', monospace", weight: '400', size: 'text-2xl' },
  { label: 'Bold', css: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", weight: '800', size: 'text-4xl' },
  { label: 'Script', css: "'Brush Script MT', 'Segoe Script', cursive", weight: '400', size: 'text-4xl' },
];

export default function StatusComposer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState('#6366f1');
  const [textColor, setTextColor] = useState('#ffffff');
  const [showColors, setShowColors] = useState(false);
  const [fontIndex, setFontIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!user) return;
    if (!text.trim() && !imagePreview) return;
    setLoading(true);
    try {
      if (imagePreview) {
        await postStatus({ uid: user.uid, displayName: user.fullName, photoURL: user.photoURL || null }, 'image', imagePreview, bgColor, textColor, FONT_STYLES[fontIndex].label.toLowerCase());
      } else {
        await postStatus({ uid: user.uid, displayName: user.fullName, photoURL: user.photoURL || null }, 'text', text.trim(), bgColor, textColor, FONT_STYLES[fontIndex].label.toLowerCase());
      }
      navigate('/statuses');
    } catch {
      alert('Failed to post status');
    } finally {
      setLoading(false);
    }
  };

  const isDark = ['#1e1b4b', '#0f172a', '#18181b', '#000000'].includes(bgColor);
  const canPost = text.trim() || imagePreview;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: bgColor }}>
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 shrink-0" style={{ color: textColor }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <X size={24} />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFontIndex((i) => (i + 1) % FONT_STYLES.length)}
            className="px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors text-sm font-bold"
            title={FONT_STYLES[fontIndex].label}
          >
            T
          </button>
          <button
            onClick={() => setShowColors(!showColors)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <Palette size={22} />
          </button>
        </div>
      </div>

      {/* Color Picker — slides down */}
      {showColors && (
        <div className="px-4 pb-3 flex gap-2 flex-wrap shrink-0 justify-center">
          {BG_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setBgColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${bgColor === c ? 'scale-125 border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-px h-7 bg-white/20 mx-1" />
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setTextColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${textColor === c ? 'scale-125 border-white' : 'border-gray-400'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      {/* Textarea — takes remaining space, scrolls when long */}
      <div className="flex-1 flex items-end min-h-0 px-6 pt-4 pb-2 overflow-y-auto">
        {imagePreview ? (
          <div className="relative w-full max-w-sm mx-auto">
            <img src={imagePreview} alt="" className="w-full rounded-2xl shadow-xl" />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a status"
            autoFocus
            className="w-full bg-transparent outline-none resize-none placeholder-white/30 leading-relaxed"
            style={{
              color: textColor,
              fontFamily: FONT_STYLES[fontIndex].css,
              fontWeight: FONT_STYLES[fontIndex].weight,
              fontSize: FONT_STYLES[fontIndex].label === 'Bold' || FONT_STYLES[fontIndex].label === 'Script' ? '2.25rem' : '1.875rem',
              minHeight: '4rem',
            }}
            rows={1}
          />
        )}
      </div>

      {/* Send button — always above keyboard */}
      <div className="flex justify-end p-4 shrink-0 safe-area-bottom">
        <button
          onClick={handlePost}
          disabled={loading || !canPost}
          className="flex items-center gap-2.5 px-6 py-3 rounded-2xl font-semibold text-sm transition-all disabled:opacity-30"
          style={{
            background: canPost ? 'linear-gradient(135deg, #1e1b4b, #312e81)' : 'rgba(255,255,255,0.1)',
            boxShadow: canPost ? '0 4px 20px rgba(30,27,75,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset' : 'none',
            color: canPost ? '#fff' : 'rgba(255,255,255,0.3)',
          }}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={18} style={{ transform: 'translateX(1px)' }} />
          )}
          <span>Send</span>
        </button>
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
    </div>
  );
}
