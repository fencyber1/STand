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

export const NOTIFICATION_SOUNDS = [
  { id: 'default', name: 'Default', play: (ctx: AudioContext) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.setValueAtTime(880, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08); o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.16); g.gain.setValueAtTime(0.3, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3); o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.3); } },
  { id: 'chime', name: 'Chime', play: (ctx: AudioContext) => { [523, 659, 784].forEach((f, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.12); g.gain.setValueAtTime(0, ctx.currentTime + i * 0.12); g.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.3); o.start(ctx.currentTime + i * 0.12); o.stop(ctx.currentTime + i * 0.12 + 0.3); }); } },
  { id: 'pop', name: 'Pop', play: (ctx: AudioContext) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.setValueAtTime(600, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15); g.gain.setValueAtTime(0.4, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15); o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.15); } },
  { id: 'ding', name: 'Ding', play: (ctx: AudioContext) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'triangle'; o.frequency.setValueAtTime(1200, ctx.currentTime); g.gain.setValueAtTime(0.3, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5); o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.5); } },
  { id: 'bubble', name: 'Bubble', play: (ctx: AudioContext) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.setValueAtTime(400, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1); o.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2); g.gain.setValueAtTime(0.25, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25); o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.25); } },
  { id: 'swoosh', name: 'Swoosh', play: (ctx: AudioContext) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sawtooth'; o.frequency.setValueAtTime(2000, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2); g.gain.setValueAtTime(0.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2); o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.2); } },
  { id: 'click', name: 'Click', play: (ctx: AudioContext) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'square'; o.frequency.setValueAtTime(1500, ctx.currentTime); g.gain.setValueAtTime(0.2, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05); o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.05); } },
  { id: 'melody', name: 'Melody', play: (ctx: AudioContext) => { [440, 554, 659, 880].forEach((f, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.1); g.gain.setValueAtTime(0, ctx.currentTime + i * 0.1); g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.1 + 0.02); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.25); o.start(ctx.currentTime + i * 0.1); o.stop(ctx.currentTime + i * 0.1 + 0.25); }); } },
  { id: 'pulse', name: 'Pulse', play: (ctx: AudioContext) => { [0, 0.12].forEach((t) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.setValueAtTime(800, ctx.currentTime + t); g.gain.setValueAtTime(0.3, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + t + 0.1); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.1); }); } },
  { id: 'whistle', name: 'Whistle', play: (ctx: AudioContext) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.setValueAtTime(800, ctx.currentTime); o.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.15); o.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3); g.gain.setValueAtTime(0.2, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35); o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.35); } },
];

const NOTIF_SOUND_KEY = 'stand_notif_sound';
const NOTIF_PUSH_KEY = 'stand_notif_push';

export function getNotificationSoundId(): string {
  try { return localStorage.getItem(NOTIF_SOUND_KEY) || 'default'; } catch { return 'default'; }
}

export function setNotificationSoundId(id: string): void {
  try { localStorage.setItem(NOTIF_SOUND_KEY, id); } catch {}
}

export function getPushEnabled(): boolean {
  try { const v = localStorage.getItem(NOTIF_PUSH_KEY); return v === null ? true : v === 'true'; } catch { return true; }
}

export function setPushEnabled(on: boolean): void {
  try { localStorage.setItem(NOTIF_PUSH_KEY, String(on)); } catch {}
}

export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const soundId = getNotificationSoundId();
    const sound = NOTIFICATION_SOUNDS.find((s) => s.id === soundId) || NOTIFICATION_SOUNDS[0];
    sound.play(ctx);
  } catch {}
}
