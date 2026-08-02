import { useState, useRef } from 'react';
import { X, Check, Upload, Trash2 } from 'lucide-react';
import { storage } from '../../services/storage';
import { useLanguage } from '../../contexts/LanguageContext';

const PRESET_WALLPAPERS = [
  { id: 'blue-neon-tubes', gradient: 'radial-gradient(ellipse at 20% 50%, #0044cc 0%, transparent 50%), radial-gradient(ellipse at 80% 60%, #0033aa 0%, transparent 45%), radial-gradient(ellipse at 50% 80%, #0055ee 0%, transparent 40%), linear-gradient(180deg, #000000 0%, #000a1a 100%)', label: 'Blue Neon Tubes' },
  { id: 'glass-abstract', gradient: 'radial-gradient(ellipse at 40% 40%, rgba(180,120,200,0.4) 0%, transparent 50%), radial-gradient(ellipse at 60% 50%, rgba(200,100,80,0.3) 0%, transparent 45%), radial-gradient(ellipse at 50% 60%, rgba(100,80,160,0.3) 0%, transparent 40%), linear-gradient(160deg, #0a0008 0%, #1a0a15 50%, #000000 100%)', label: 'Glass Abstract' },
  { id: 'dark-geometric', gradient: 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 50%, #c0392b 55%, #e0e0e0 60%, #2d2d2d 70%, #1a1a1a 100%)', label: 'Dark Geometric' },
  { id: 'fire-swirl', gradient: 'radial-gradient(ellipse at 55% 45%, #ff6600 0%, #cc3300 25%, transparent 55%), radial-gradient(ellipse at 45% 55%, #ff8800 0%, #993300 30%, transparent 50%), linear-gradient(160deg, #000000 0%, #0a0020 40%, #1a0040 70%, #000000 100%)', label: 'Fire Swirl' },
  { id: 'blue-wave', gradient: 'radial-gradient(ellipse at 30% 60%, #0055ff 0%, transparent 50%), radial-gradient(ellipse at 70% 40%, #0033cc 0%, transparent 45%), linear-gradient(135deg, #000000 0%, #001133 50%, #000000 100%)', label: 'Blue Wave' },
  { id: 'blue-gradient', gradient: 'radial-gradient(ellipse at 60% 50%, #0066ff 0%, transparent 55%), radial-gradient(ellipse at 30% 70%, #0044cc 0%, transparent 50%), linear-gradient(145deg, #000833 0%, #001144 40%, #000a2a 100%)', label: 'Blue Gradient' },
  { id: 'blue-horizon', gradient: 'radial-gradient(ellipse at 50% 30%, #0066ff 0%, transparent 60%), linear-gradient(180deg, #000000 0%, #001133 40%, #003366 70%, #000000 100%)', label: 'Blue Horizon' },
  { id: 'blue-streak', gradient: 'radial-gradient(ellipse at 40% 50%, #00aaff 0%, transparent 30%), radial-gradient(ellipse at 45% 50%, #0066cc 0%, transparent 40%), linear-gradient(160deg, #000000 0%, #001133 60%, #000000 100%)', label: 'Blue Streak' },
  { id: 'blue-dune', gradient: 'radial-gradient(ellipse at 50% 70%, #0044cc 0%, transparent 55%), radial-gradient(ellipse at 60% 50%, #003399 0%, transparent 50%), linear-gradient(180deg, #000822 0%, #001144 50%, #000033 100%)', label: 'Blue Dune' },
  { id: 'sunset-waves', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #e94560 100%)', label: 'Sunset Waves' },
  { id: 'purple-glow', gradient: 'linear-gradient(160deg, #0a0015 0%, #1a0033 30%, #6b21a8 60%, #0a0015 100%)', label: 'Purple Glow' },
  { id: 'void', gradient: 'linear-gradient(180deg, #000000 0%, #0a0a0a 50%, #111111 100%)', label: 'Void' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ChatWallpaperPicker({ open, onClose }: Props) {
  const { t } = useLanguage();
  const [current, setCurrent] = useState<string | null>(storage.getChatWallpaper());
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const selectPreset = (gradient: string) => {
    storage.setChatWallpaper(gradient);
    setCurrent(gradient);
  };

  const selectImage = (dataUrl: string) => {
    storage.setChatWallpaper(dataUrl);
    setCurrent(dataUrl);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(t('Image must be under 2MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => selectImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeWallpaper = () => {
    storage.removeChatWallpaper();
    setCurrent(null);
  };

  const isActive = (val: string) => current === val;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{t('Chat Wallpaper')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Preview */}
        <div className="px-5 pt-4">
          <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {current ? (
              current.startsWith('data:') || current.startsWith('http') ? (
                <img src={current} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: current }} />
              )
            ) : (
              <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <span className="text-sm text-gray-400">{t('No wallpaper selected')}</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 right-2 flex gap-2">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[11px] text-white/80 truncate flex-1">
                {current ? (current.startsWith('data:') ? 'Custom image' : current.slice(0, 50)) : t('Default')}
              </div>
            </div>
          </div>
        </div>

        {/* Wallpaper Grid */}
        <div className="px-5 py-4 overflow-y-auto max-h-[50vh]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('Presets')}</span>
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition"
              >
                <Upload size={13} />
                {t('Upload')}
              </button>
              {current && (
                <button
                  onClick={removeWallpaper}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                >
                  <Trash2 size={13} />
                  {t('Remove')}
                </button>
              )}
            </div>
          </div>

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

          <div className="grid grid-cols-3 gap-2.5">
            {PRESET_WALLPAPERS.map((wp) => (
              <button
                key={wp.id}
                onClick={() => selectPreset(wp.gradient)}
                className={`relative group aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all ${
                  isActive(wp.gradient)
                    ? 'border-primary-500 ring-2 ring-primary-500/30 scale-[1.02]'
                    : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="w-full h-full" style={{ background: wp.gradient }} />
                {isActive(wp.gradient) && (
                  <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center shadow-lg">
                      <Check size={14} className="text-white" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                  <span className="text-[10px] text-white/80 font-medium">{wp.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
