import { useRef } from 'react';
import { Image, Music, FileText, User, MapPin, X } from 'lucide-react';

interface Props {
  onSelect: (type: string) => void;
  onClose: () => void;
}

const ITEMS = [
  { type: 'image', label: 'Photo', icon: Image, color: 'from-purple-500 to-pink-500' },
  { type: 'audio', label: 'Audio', icon: Music, color: 'from-orange-500 to-red-500' },
  { type: 'document', label: 'Document', icon: FileText, color: 'from-blue-500 to-cyan-500' },
  { type: 'contact', label: 'Contact', icon: User, color: 'from-green-500 to-emerald-500' },
  { type: 'location', label: 'Location', icon: MapPin, color: 'from-red-500 to-rose-500' },
];

export default function AttachmentMenu({ onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50" onClick={onClose}>
      <div className="w-full max-w-md bg-gray-900 rounded-t-2xl border-t border-white/10 p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Share</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                onClick={() => { onSelect(item.type); onClose(); }}
                className="flex flex-col items-center gap-2"
              >
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] text-white/60 font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
