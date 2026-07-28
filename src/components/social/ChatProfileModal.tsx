import { useState, useEffect } from 'react';
import { X, Mail, Briefcase, MapPin, Heart, User, Loader2 } from 'lucide-react';
import { getUserProfile } from '../../services/socialService';

interface Props {
  uid: string;
  name: string;
  photo: string | null;
  online?: boolean;
  onClose: () => void;
}

export default function ChatProfileModal({ uid, name, photo, online, onClose }: Props) {
  const [profile, setProfile] = useState<{ displayName: string; photoURL: string | null; email: string; bio: string; surname: string; role: string; hobby: string; country: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserProfile(uid).then((p) => { setProfile(p); setLoading(false); });
  }, [uid]);

  const p = profile;
  const hasAnyField = p && (p.bio || p.surname || p.role || p.hobby || p.country || p.email);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Banner */}
        <div className="h-24 bg-gradient-to-br from-blue-600 to-purple-600 relative">
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/30 hover:bg-black/50 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Avatar + Info */}
        <div className="flex flex-col items-center -mt-12 px-5">
          <div className="relative">
            {photo ? (
              <img src={photo} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-gray-900 shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-gray-900 shadow-lg">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            {online && <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-3 border-gray-900" />}
          </div>

          {loading ? (
            <Loader2 className="w-6 h-6 text-white/40 animate-spin mt-4" />
          ) : (
            <div className="text-center mt-4 w-full">
              <h3 className="text-xl font-bold text-white">{p?.displayName || name}</h3>
              {p?.surname && <p className="text-sm text-white/40 mt-0.5">@{p.surname}</p>}
              {online !== undefined && <p className="text-sm text-white/40 mt-1">{online ? 'Online' : 'Offline'}</p>}

              {p?.bio && <p className="text-sm text-white/60 mt-3 px-2 leading-relaxed">{p.bio}</p>}

              {hasAnyField && (
                <div className="mt-5 space-y-2.5 w-full">
                  {p?.role && (
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                      <Briefcase className="w-5 h-5 text-white/40 shrink-0" />
                      <div className="text-left"><p className="text-[11px] text-white/40">Role</p><p className="text-sm text-white">{p.role}</p></div>
                    </div>
                  )}
                  {p?.hobby && (
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                      <Heart className="w-5 h-5 text-white/40 shrink-0" />
                      <div className="text-left"><p className="text-[11px] text-white/40">Hobby</p><p className="text-sm text-white">{p.hobby}</p></div>
                    </div>
                  )}
                  {p?.country && (
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                      <MapPin className="w-5 h-5 text-white/40 shrink-0" />
                      <div className="text-left"><p className="text-[11px] text-white/40">Country</p><p className="text-sm text-white">{p.country}</p></div>
                    </div>
                  )}
                  {p?.email && (
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                      <Mail className="w-5 h-5 text-white/40 shrink-0" />
                      <div className="text-left"><p className="text-[11px] text-white/40">Email</p><p className="text-sm text-white truncate">{p.email}</p></div>
                    </div>
                  )}
                </div>
              )}

              {!hasAnyField && !p?.bio && (
                <p className="text-sm text-white/30 mt-4">No profile info yet</p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 mt-4">
          <button onClick={onClose} className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 text-sm font-medium transition-all">Close</button>
        </div>
      </div>
    </div>
  );
}
