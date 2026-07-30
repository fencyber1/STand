import { Image, Music, FileText, User, MapPin, X } from 'lucide-react';

interface Props {
  onSelect: (type: string) => void;
  onClose: () => void;
}

const ITEMS = [
  { type: 'image', label: 'Photo', icon: Image, glow: '#a855f7' },
  { type: 'audio', label: 'Audio', icon: Music, glow: '#f97316' },
  { type: 'document', label: 'Document', icon: FileText, glow: '#3b82f6' },
  { type: 'contact', label: 'Contact', icon: User, glow: '#22c55e' },
  { type: 'location', label: 'Location', icon: MapPin, glow: '#ef4444' },
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
                {/* App-icon style container */}
                <div className="relative w-[56px] h-[56px] group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
                  {/* Outer glow */}
                  <div
                    className="absolute -inset-1 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"
                    style={{ background: item.glow }}
                  />
                  {/* Base — dark rounded square */}
                  <div
                    className="relative w-full h-full rounded-[16px] overflow-hidden"
                    style={{
                      background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d15 100%)',
                      boxShadow: `0 2px 12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset`,
                    }}
                  >
                    {/* Bottom color glow */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1/2 rounded-b-[16px] opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: `linear-gradient(180deg, transparent 0%, ${item.glow}40 60%, ${item.glow}90 100%)` }}
                    />
                    {/* Top shine / glass highlight */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[45%] rounded-t-[16px]"
                      style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 40%, transparent 100%)' }}
                    />
                    {/* Inner border highlight */}
                    <div
                      className="absolute inset-0 rounded-[16px]"
                      style={{ boxShadow: '0 1px 0 0 rgba(255,255,255,0.08) inset, 0 -1px 0 0 rgba(0,0,0,0.3) inset' }}
                    />
                    {/* Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon className="w-[24px] h-[24px] text-white/90 drop-shadow-sm relative z-10" />
                    </div>
                  </div>
                </div>
                {/* Label */}
                <span className="text-[10px] text-white/35 font-medium tracking-wide group-hover:text-white/65 transition-colors duration-200">
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
