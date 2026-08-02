import { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToNotifications, playNotificationSound, getPushEnabled } from '../services/notificationService';
import type { Notification } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType>({ notifications: [], unreadCount: 0 });

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!user?.uid) { setNotifications([]); return; }
    const unsub = subscribeToNotifications(user.uid, (items) => {
      const newUnread = items.filter((n) => !n.read).length;
      if (prevCountRef.current > 0 && newUnread > prevCountRef.current && getPushEnabled()) {
        playNotificationSound();
      }
      prevCountRef.current = newUnread;
      setNotifications(items);
    });
    return unsub;
  }, [user?.uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = useMemo(() => ({ notifications, unreadCount }), [notifications, unreadCount]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
