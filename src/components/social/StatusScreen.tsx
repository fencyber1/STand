import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { storage } from '../../services/storage';
import { subscribeToStatuses } from '../../services/statusService';
import StatusViewer from './StatusViewer';
import type { Status } from '../../types';

export default function StatusScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [viewIndex, setViewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToStatuses(user.uid, setStatuses);
    return unsub;
  }, [user?.uid]);

  // Group statuses by user, keep only latest per user for circles
  const { circles, userGroups } = useMemo(() => {
    const groupMap = new Map<string, Status[]>();
    statuses.forEach((s) => {
      const arr = groupMap.get(s.uid) || [];
      arr.push(s);
      groupMap.set(s.uid, arr);
    });

    const circles = Array.from(groupMap.entries()).map(([uid, arr]) => ({
      uid,
      displayName: arr[0].displayName,
      photoURL: arr[0].photoURL,
      hasUnread: arr.some((s) => !s.viewedBy.includes(user?.uid || '')),
      latest: arr[0],
      count: arr.length,
    }));

    // Sort: unread first, then by latest
    circles.sort((a, b) => {
      if (a.hasUnread !== b.hasUnread) return a.hasUnread ? -1 : 1;
      return b.latest.createdAt.localeCompare(a.latest.createdAt);
    });

    return { circles, userGroups: groupMap };
  }, [statuses, user?.uid]);

  // Separate my statuses from others
  const myStatuses = statuses.filter((s) => s.uid === user?.uid);
  const otherStatuses = statuses.filter((s) => s.uid !== user?.uid);

  // Group other statuses by user for the feed
  const otherGroups = useMemo(() => {
    const map = new Map<string, Status[]>();
    otherStatuses.forEach((s) => {
      const arr = map.get(s.uid) || [];
      arr.push(s);
      map.set(s.uid, arr);
    });
    return Array.from(map.entries()).map(([uid, arr]) => ({
      uid,
      displayName: arr[0].displayName,
      photoURL: arr[0].photoURL,
      statuses: arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      hasUnread: arr.some((s) => !s.viewedBy.includes(user?.uid || '')),
    }));
  }, [otherStatuses, user?.uid]);

  const openViewer = (uid: string) => {
    const allForUser = userGroups.get(uid) || [];
    if (allForUser.length === 0) return;
    // Find index in the flat statuses array
    const idx = statuses.findIndex((s) => s.id === allForUser[0].id);
    if (idx >= 0) setViewIndex(idx);
  };

  const myCircleStatuses = userGroups.get(user?.uid || '') || [];

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-4 flex items-center gap-1">
        <ArrowLeft size={14} /> {t('Back')}
      </button>

      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{t('Status')}</h1>

      {/* Status Circles */}
      <div className="flex gap-4 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {/* My Status */}
        <button
          onClick={() => {
            if (myCircleStatuses.length > 0) openViewer(user!.uid);
            else navigate('/statuses/new');
          }}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <div className="relative">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              myCircleStatuses.length > 0
                ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              {user?.photoURL || storage.getProfilePhoto() ? (
                <img src={user?.photoURL || storage.getProfilePhoto()!} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-gray-500 dark:text-gray-400">
                  {(user?.fullName || 'S').charAt(0)}
                </span>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center border-2 border-white dark:border-gray-900">
              <Plus size={12} className="text-white" />
            </div>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 w-16 text-center truncate">
            {myCircleStatuses.length > 0 ? t('My Status') : t('Add to My Status')}
          </span>
        </button>

        {/* Other Users */}
        {circles.filter((c) => c.uid !== user?.uid).map((c) => (
          <button
            key={c.uid}
            onClick={() => openViewer(c.uid)}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div className={`w-16 h-16 rounded-full p-0.5 ${
              c.hasUnread
                ? 'bg-gradient-to-br from-primary-500 via-purple-500 to-pink-500'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}>
              <div className="w-full h-full rounded-full p-0.5 bg-white dark:bg-gray-900">
                {c.photoURL ? (
                  <img src={c.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-500 dark:text-gray-400">
                      {c.displayName.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 w-16 text-center truncate">
              {c.displayName.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Recent Updates Feed */}
      <div className="space-y-3">
        {otherGroups.length === 0 && myStatuses.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-center py-12">
            {t('No statuses yet')}
          </p>
        ) : (
          <>
            {otherGroups.map((g) => (
              <button
                key={g.uid}
                onClick={() => openViewer(g.uid)}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
              >
                <div className={`w-12 h-12 rounded-full p-0.5 shrink-0 ${
                  g.hasUnread
                    ? 'bg-gradient-to-br from-primary-500 via-purple-500 to-pink-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className="w-full h-full rounded-full p-0.5 bg-white dark:bg-gray-900">
                    {g.photoURL ? (
                      <img src={g.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="font-bold text-gray-500 dark:text-gray-400">{g.displayName.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{g.displayName}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <span>{g.statuses.length} {t('update')}{g.statuses.length !== 1 ? 's' : ''}</span>
                    {g.statuses.reduce((sum, s) => sum + s.likes.length, 0) > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Heart size={10} className="fill-pink-400 text-pink-400" />
                        {g.statuses.reduce((sum, s) => sum + s.likes.length, 0)}
                      </span>
                    )}
                    <span>· {(() => {
                      const diff = Math.floor((Date.now() - new Date(g.statuses[g.statuses.length - 1].createdAt).getTime()) / 1000);
                      if (diff < 60) return t('Just now');
                      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                      return `${Math.floor(diff / 86400)}d ago`;
                    })()}</span>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full shrink-0 ${g.hasUnread ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
              </button>
            ))}
          </>
        )}
      </div>

      {/* Viewer */}
      {viewIndex !== null && (
        <StatusViewer
          statuses={statuses}
          startIndex={viewIndex}
          onClose={() => setViewIndex(null)}
          onStatusUpdate={(updated) => setStatuses((prev) => prev.map((s) => s.id === updated.id ? updated : s))}
        />
      )}
    </div>
  );
}
