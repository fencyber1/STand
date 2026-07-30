import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Image, Palette, Type } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { postStatus } from '../../services/statusService';

const BG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#1e1b4b', '#0f172a', '#18181b', '#ffffff',
];

const TEXT_COLORS = ['#ffffff', '#000000', '#f8fafc', '#1e293b'];

export default function StatusComposer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState('#6366f1');
  const [textColor, setTextColor] = useState('#ffffff');
  const [showColors, setShowColors] = useState(false);
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
        await postStatus({ uid: user.uid, displayName: user.fullName, photoURL: user.photoURL || null }, 'image', imagePreview, bgColor, textColor);
      } else {
        await postStatus({ uid: user.uid, displayName: user.fullName, photoURL: user.photoURL || null }, 'text', text.trim(), bgColor, textColor);
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
            onClick={() => {}}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <Type size={22} />
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

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center px-6 min-h-0 overflow-y-auto">
        {imagePreview ? (
          <div className="relative w-full max-w-sm">
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
            className="w-full bg-transparent text-center text-3xl font-light outline-none resize-none placeholder-white/30 leading-relaxed"
            style={{ color: textColor }}
            rows={5}
          />
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-end p-4 shrink-0 safe-area-bottom" style={{ color: textColor }}>
        {/* Send button */}
        <button
          onClick={handlePost}
          disabled={loading || !canPost}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
          style={{ backgroundColor: canPost ? '#22c55e' : 'rgba(255,255,255,0.15)' }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={22} className="text-white" style={{ transform: 'translateX(1px)' }} />
          )}
        </button>
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
    </div>
  );
}
