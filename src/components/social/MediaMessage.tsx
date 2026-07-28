import { MapPin, Download, User, Phone, Mail } from 'lucide-react';

interface MediaProps {
  type: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  contact?: { name: string; phone: string; email: string };
  location?: { lat: number; lng: number; name: string };
  isOwn: boolean;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function MediaMessage({ type, mediaUrl, mediaType, fileName, fileSize, contact, location, isOwn }: MediaProps) {
  if (type === 'image' && mediaUrl) {
    return (
      <div className="rounded-xl overflow-hidden max-w-[260px]">
        <img src={mediaUrl} alt="" className="w-full h-auto rounded-xl" loading="lazy" />
      </div>
    );
  }

  if (type === 'audio' && mediaUrl) {
    return (
      <div className="min-w-[200px]">
        <audio controls src={mediaUrl} className="w-full h-9" style={{ filter: 'invert(1) hue-rotate(180deg)' }} />
      </div>
    );
  }

  if (type === 'document' && mediaUrl) {
    return (
      <a href={mediaUrl} download={fileName || 'file'} className={`flex items-center gap-3 p-3 rounded-xl max-w-[260px] ${isOwn ? 'bg-white/10' : 'bg-white/5'} hover:bg-white/15 transition-colors`}>
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{fileName || 'File'}</p>
          <p className="text-[11px] text-white/40">{formatSize(fileSize)}</p>
        </div>
      </a>
    );
  }

  if (type === 'contact' && contact) {
    return (
      <div className="min-w-[200px] p-3 rounded-xl bg-white/5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm font-bold text-white">{contact.name}</p>
        </div>
        {contact.phone && (
          <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
            <Phone className="w-3 h-3" />
            <span>{contact.phone}</span>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Mail className="w-3 h-3" />
            <span>{contact.email}</span>
          </div>
        )}
      </div>
    );
  }

  if (type === 'location' && location) {
    return (
      <a href={`https://www.google.com/maps?q=${location.lat},${location.lng}`} target="_blank" rel="noopener noreferrer" className="block min-w-[200px] rounded-xl overflow-hidden">
        <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/30 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{location.name || 'Shared Location'}</p>
            <p className="text-[11px] text-white/40">Tap to open in maps</p>
          </div>
        </div>
      </a>
    );
  }

  return null;
}
