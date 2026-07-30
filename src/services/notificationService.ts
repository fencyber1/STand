import {
  collection, doc, setDoc, getDocs, updateDoc, query,
  where, orderBy, onSnapshot, writeBatch, limit,
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
    orderBy('createdAt', 'desc'),
    limit(100),
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
    });
    cb(items);
  });
}

export async function markAsRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

export async function markAllAsRead(uid: string): Promise<void> {
  const q = query(collection(db, 'notifications'), where('uid', '==', uid), where('read', '==', false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'notifications', notificationId));
}

export async function clearAllNotifications(uid: string): Promise<void> {
  const q = query(collection(db, 'notifications'), where('uid', '==', uid));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export function playNotificationSound(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
