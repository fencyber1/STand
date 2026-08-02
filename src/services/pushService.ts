import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseMessaging, db } from './firebase';
import { getPushEnabled } from './notificationService';

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY || '';

export async function requestPushPermission(uid: string): Promise<boolean> {
  if (!getPushEnabled()) return false;
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'denied') return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const messaging = getFirebaseMessaging();
    if (!messaging || !VAPID_KEY) return false;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return false;

    // Store token in Firestore so server can send push
    await setDoc(doc(db, 'fcmTokens', uid), {
      token,
      platform: 'web',
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return true;
  } catch {
    return false;
  }
}

export function listenForForegroundMessages(cb: (payload: any) => void): () => void {
  const messaging = getFirebaseMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    cb(payload);
  });
}

export async function removeFcmToken(uid: string): Promise<void> {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'fcmTokens', uid));
  } catch {}
}
