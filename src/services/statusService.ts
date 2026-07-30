import {
  collection, doc, setDoc, getDocs, updateDoc, deleteDoc,
  onSnapshot, query, where, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Status } from '../types';

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

const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function postStatus(
  user: { uid: string; displayName: string; photoURL: string | null },
  type: 'text' | 'image',
  content: string,
  backgroundColor: string = '#6366f1',
  textColor: string = '#ffffff'
): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRY_MS).toISOString();
  const ref = doc(collection(db, 'statuses'));
  await setDoc(ref, sanitize({
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL || '',
    type,
    content,
    backgroundColor,
    textColor,
    viewedBy: [],
    createdAt: ts(),
    expiresAt,
  }));
  return ref.id;
}

export function subscribeToStatuses(uid: string, cb: (statuses: Status[]) => void): () => void {
  const q = query(collection(db, 'statuses'));
  return onSnapshot(q, (snap) => {
    const now = Date.now();
    const items = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid,
          displayName: data.displayName || '',
          photoURL: data.photoURL || null,
          type: data.type || 'text',
          content: data.content || '',
          backgroundColor: data.backgroundColor || '#6366f1',
          textColor: data.textColor || '#ffffff',
          viewedBy: data.viewedBy || [],
          createdAt: data.createdAt || '',
          expiresAt: data.expiresAt || '',
        } as Status;
      })
      .filter((s) => {
        const expires = new Date(s.expiresAt).getTime();
        return expires > now;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    cb(items);
  });
}

export async function markStatusViewed(statusId: string, viewerUid: string): Promise<void> {
  const ref = doc(db, 'statuses', statusId);
  const snap = await import('firebase/firestore').then((m) => m.getDoc(ref));
  if (!snap.exists()) return;
  const viewedBy: string[] = snap.data().viewedBy || [];
  if (!viewedBy.includes(viewerUid)) {
    await updateDoc(ref, { viewedBy: [...viewedBy, viewerUid] });
  }
}

export async function deleteStatus(statusId: string): Promise<void> {
  await deleteDoc(doc(db, 'statuses', statusId));
}

export async function deleteExpiredStatuses(): Promise<void> {
  const snap = await getDocs(collection(db, 'statuses'));
  const now = Date.now();
  const batch = writeBatch(db);
  let count = 0;
  snap.docs.forEach((d) => {
    const expiresAt = new Date(d.data().expiresAt).getTime();
    if (expiresAt <= now) {
      batch.delete(d.ref);
      count++;
    }
  });
  if (count > 0) await batch.commit();
}
