import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, UserPlus, MessageSquare, Users, Trophy, Heart, MessageCircle, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { markAsRead, markAllAsRead, clearAllNotifications } from '../../services/notificationService';
import type { Notification } from '../../types';

const typeIcons: Record<Notification['type'], typeof Bell> = {
  friend_request: UserPlus,
  message: MessageSquare,
  group_message: Users,
  achievement: Trophy,
  post_like: Heart,
  post_comment: MessageCircle,
};

const typeColors: Record<Notification['type'], string> = {
  friend_request: 'text-blue-500',
  message: 'text-green-500',
  group_message: 'text-teal-500',
  achievement: 'text-yellow-500',
  post_like: 'text-pink-500',
  post_comment: 'text-purple-500',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount } = useNotifications();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = async (notif: Notification) => {
    if (!notif.read) await markAsRead(notif.id);
    setOpen(false);
    if (notif.link) navigate(notif.link);
  };

  const handleMarkAllRead = async () => {
    if (notifications.length > 0) {
      await markAllAsRead(notifications[0].uid);
    }
  };

  const handleClearAll = async () => {
    if (notifications.length > 0) {
      await clearAllNotifications(notifications[0].uid);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
              Notifications {unreadCount > 0 && <span className="text-primary-500">({unreadCount})</span>}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={16} />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Clear all"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = typeIcons[notif.type] || Bell;
                const color = typeColors[notif.type] || 'text-gray-500';
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${
                      !notif.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0 mt-0.5">
                      {notif.fromPhoto ? (
                        <img src={notif.fromPhoto} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <Icon size={16} className={color} />
                        </div>
                      )}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center`}>
                        <Icon size={10} className={color} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!notif.read ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{notif.body}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                    {!notif.read && (
                      <div className="flex-shrink-0 mt-2">
                        <div className="w-2 h-2 rounded-full bg-primary-500" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
