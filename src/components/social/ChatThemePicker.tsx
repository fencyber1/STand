import { useRef } from 'react';
import { useChatTheme } from '../../contexts/ChatThemeContext';
import { Palette, X, Upload, Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ChatThemePicker({ open, onClose }: Props) {
  const { theme, setTheme, wallpaper, setWallpaper, removeWallpaper, themes } = useChatTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { alert('Image must be under 4MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setWallpaper(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Chat Theme</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Preset Themes */}
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Preset Themes</p>
            <div className="grid grid-cols-4 gap-3">
              {themes.map((t) => {
                const active = t.id === theme.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`relative rounded-xl p-1 transition-all ${active ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900' : 'hover:ring-2 hover:ring-white/20 hover:ring-offset-2 hover:ring-offset-gray-900'}`}
                  >
                    <div
                      className="w-full aspect-square rounded-lg"
                      style={{ background: t.gradient }}
                    />
                    <p className={`text-[11px] mt-1.5 font-medium text-center truncate ${active ? 'text-blue-400' : 'text-white/60'}`}>{t.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wallpaper */}
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Custom Wallpaper</p>
            <div className="flex gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 text-sm font-medium transition-all"
              >
                <Upload className="w-4 h-4" />
                Upload Image
              </button>
              {wallpaper && (
                <button
                  onClick={removeWallpaper}
                  className="flex items-center justify-center gap-2 py-4 px-5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

            {wallpaper && (
              <div className="mt-3 relative rounded-xl overflow-hidden border border-white/10">
                <img src={wallpaper} alt="Wallpaper preview" className="w-full h-32 object-cover" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <p className="text-xs text-white/60 font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur">Current Wallpaper</p>
                </div>
              </div>
            )}

            {!wallpaper && (
              <p className="text-[11px] text-white/30 mt-2">No wallpaper set. Upload an image to personalize your chat background.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
