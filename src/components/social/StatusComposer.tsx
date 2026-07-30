import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image, Palette } from 'lucide-react';
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setImageFile(file);
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: bgColor }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 shrink-0" style={{ color: textColor }}>
        <button onClick={() => navigate(-1)} className="p-1 rounded-lg hover:bg-white/10">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-semibold flex-1">New Status</h1>
        <button
          onClick={() => setShowColors(!showColors)}
          className="p-2 rounded-lg hover:bg-white/10"
        >
          <Palette size={20} />
        </button>
      </div>

      {/* Color Picker */}
      {showColors && (
        <div className="px-4 pb-3 flex gap-2 flex-wrap shrink-0">
          {BG_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setBgColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${bgColor === c ? 'scale-125 border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-px h-8 bg-white/20 mx-1" />
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setTextColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${textColor === c ? 'scale-125 border-white' : 'border-gray-400'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      {/* Content — scrollable */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto min-h-0">
        {imagePreview ? (
          <div className="relative w-full max-w-sm">
            <img src={imagePreview} alt="" className="w-full rounded-2xl shadow-xl" />
            <button
              onClick={() => { setImagePreview(null); setImageFile(null); }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white"
            >
              <ArrowLeft size={16} />
            </button>
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            autoFocus
            className="w-full bg-transparent text-center text-2xl font-medium outline-none resize-none placeholder-white/40"
            style={{ color: textColor }}
            rows={6}
          />
        )}
      </div>

      {/* Bottom Actions — always pinned to bottom */}
      <div className="flex items-center gap-3 p-4 shrink-0 safe-area-bottom" style={{ color: textColor }}>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
        <button
          onClick={() => fileRef.current?.click()}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Image size={22} />
        </button>
        <button
          onClick={handlePost}
          disabled={loading || (!text.trim() && !imagePreview)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all disabled:opacity-40"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send size={18} />
              Post Status
            </>
          )}
        </button>
      </div>
    </div>
  );
}
