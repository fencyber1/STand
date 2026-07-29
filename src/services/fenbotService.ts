import {
  collection, doc, setDoc, getDocs, deleteDoc,
  query, where, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

export interface FenBotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface FenBotConversation {
  id: string;
  uid: string;
  title: string;
  messages: FenBotMessage[];
  createdAt: number;
  updatedAt: number;
}

export async function loadFenBotConversations(uid: string): Promise<FenBotConversation[]> {
  try {
    const q = query(
      collection(db, 'fenbotConversations'),
      where('uid', '==', uid),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      uid: d.data().uid,
      title: d.data().title,
      messages: d.data().messages || [],
      createdAt: d.data().createdAt,
      updatedAt: d.data().updatedAt,
    }));
  } catch {
    return [];
  }
}

export async function saveFenBotConversation(uid: string, convo: Omit<FenBotConversation, 'uid'>): Promise<void> {
  const ref = doc(db, 'fenbotConversations', convo.id);
  await setDoc(ref, {
    uid,
    title: convo.title,
    messages: convo.messages,
    createdAt: convo.createdAt,
    updatedAt: convo.updatedAt,
  }, { merge: true });
}

export async function deleteFenBotConversation(id: string): Promise<void> {
  await deleteDoc(doc(db, 'fenbotConversations', id));
}
