import {
  collection, doc, setDoc, getDocs, updateDoc, query,
  where, onSnapshot, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Notification } from '../types';

function ts(): string {
  return new Date().toISOString();
}

function sanitize(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize).filter((v) => v !== undefined);
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) { if (v !== undefined) clean[k] = sanitize(v); }
  return clean;
}

export async function createNotification(
  uid: string,
  notif: Omit<Notification, 'id' | 'uid' | 'read' | 'createdAt'>
): Promise<void> {
  const ref = doc(collection(db, 'notifications'));
  await setDoc(ref, sanitize({
    uid,
    type: notif.type,
    title: notif.title,
    body: notif.body,
    link: notif.link,
    fromUid: notif.fromUid || '',
    fromName: notif.fromName || '',
    fromPhoto: notif.fromPhoto || '',
    read: false,
    createdAt: ts(),
  }));
}

export function subscribeToNotifications(uid: string, cb: (notifications: Notification[]) => void): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('uid', '==', uid),
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        uid: data.uid,
        type: data.type,
        title: data.title,
        body: data.body,
        link: data.link || '/',
        fromUid: data.fromUid || '',
        fromName: data.fromName || '',
        fromPhoto: data.fromPhoto || '',
        read: data.read ?? false,
        createdAt: data.createdAt,
      } as Notification;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
    cb(items);
  }, (err) => {
    console.error('Notification listener error:', err);
    cb([]);
  });
}

export async function markAsRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

export async function markAllAsRead(uid: string): Promise<void> {
  const q = query(collection(db, 'notifications'), where('uid', '==', uid));
  const snap = await getDocs(q);
  const BATCH_SIZE = 500;
  const toUpdate = snap.docs.filter((d) => !d.data().read);
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    toUpdate.slice(i, i + BATCH_SIZE).forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'notifications', notificationId));
}

export async function clearAllNotifications(uid: string): Promise<void> {
  const q = query(collection(db, 'notifications'), where('uid', '==', uid));
  const snap = await getDocs(q);
  // Firestore batch limit is 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

let _audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  try {
    if (!_audioCtx || _audioCtx.state === 'closed') {
      _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Web Audio API not available
  }
}
