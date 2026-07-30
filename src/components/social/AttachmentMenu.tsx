import { Image, Music, FileText, User, MapPin, X } from 'lucide-react';

interface Props {
  onSelect: (type: string) => void;
  onClose: () => void;
}

const ITEMS = [
  { type: 'image', label: 'Photo', icon: Image, gradient: 'linear-gradient(135deg, #a855f7, #ec4899)', shadow: 'rgba(168,85,247,0.4)' },
  { type: 'audio', label: 'Audio', icon: Music, gradient: 'linear-gradient(135deg, #f97316, #ef4444)', shadow: 'rgba(249,115,22,0.4)' },
  { type: 'document', label: 'Document', icon: FileText, gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)', shadow: 'rgba(59,130,246,0.4)' },
  { type: 'contact', label: 'Contact', icon: User, gradient: 'linear-gradient(135deg, #22c55e, #10b981)', shadow: 'rgba(34,197,94,0.4)' },
  { type: 'location', label: 'Location', icon: MapPin, gradient: 'linear-gradient(135deg, #ef4444, #f43f5e)', shadow: 'rgba(239,68,68,0.4)' },
];

export default function AttachmentMenu({ onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-white/[0.06] p-6 pb-10"
        style={{ background: 'linear-gradient(180deg, rgba(17,24,39,0.98) 0%, rgba(10,10,15,0.99) 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[13px] font-semibold text-white/70 tracking-widest uppercase">Share</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-all duration-200">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Items */}
        <div className="grid grid-cols-5 gap-4">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                onClick={() => { onSelect(item.type); onClose(); }}
                className="group flex flex-col items-center gap-2.5"
              >
                {/* Icon circle */}
                <div
                  className="relative w-[52px] h-[52px] rounded-[18px] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1"
                  style={{
                    background: item.gradient,
                    boxShadow: `0 4px 20px ${item.shadow}, 0 0 0 1px rgba(255,255,255,0.08) inset`,
                  }}
                >
                  {/* Shine overlay */}
                  <div
                    className="absolute inset-0 rounded-[18px] opacity-40"
                    style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 50%)' }}
                  />
                  <Icon className="w-[22px] h-[22px] text-white relative z-10 drop-shadow-sm" />
                </div>
                {/* Label */}
                <span className="text-[10px] text-white/40 font-medium tracking-wide group-hover:text-white/70 transition-colors duration-200">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
