import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Question } from '../types';
import { createChatGroup } from './socialService';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore).filter((v) => v !== undefined);
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    clean[k] = sanitizeForFirestore(v);
  }
  return clean;
}

export interface GroupMember {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  joinedAt: string;
  stats: { sessions: number; avgScore: number; streak: number };
}

export interface StudyGroup {
  id: string;
  name: string;
  code: string;
  createdBy: string;
  members: GroupMember[];
  chatGroupId: string | null;
  createdAt: string;
}

export interface QuizRoom {
  id: string;
  code: string;
  createdBy: string;
  hostName: string;
  topic: string;
  subject: string;
  questionCount: number;
  status: 'waiting' | 'playing' | 'finished';
  questions: Question[];
  players: QuizPlayer[];
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface QuizPlayer {
  uid: string;
  name: string;
  photoURL: string | null;
  answers: { questionId: string; answer: string; correct: boolean; timeMs: number }[];
  score: number;
  finished: boolean;
}

// ── Study Groups ──

export async function createGroup(name: string, creator: { uid: string; name: string; email: string; photoURL: string | null }): Promise<string> {
  const code = generateCode();
  const ref = doc(collection(db, 'studyGroups'));
  const member: GroupMember = {
    uid: creator.uid,
    name: creator.name,
    email: creator.email,
    photoURL: creator.photoURL,
    joinedAt: new Date().toISOString(),
    stats: { sessions: 0, avgScore: 0, streak: 0 },
  };

  // Create a linked chat group for real-time messaging
  let chatGroupId: string | null = null;
  try {
    chatGroupId = await createChatGroup(
      { uid: creator.uid, name: creator.name, photo: creator.photoURL },
      `${name} Chat`,
      [creator.uid],
    );
  } catch { }

  await setDoc(ref, sanitizeForFirestore({
    name,
    code,
    createdBy: creator.uid,
    members: [member],
    chatGroupId,
    createdAt: serverTimestamp(),
  }));
  return code;
}

export async function joinGroup(code: string, member: { uid: string; name: string; email: string; photoURL: string | null }): Promise<{ success: boolean; error?: string; groupId?: string }> {
  const q = query(collection(db, 'studyGroups'), where('code', '==', code));
  const snap = await getDocs(q);
  if (snap.empty) return { success: false, error: 'Group not found. Check the code.' };

  const groupDoc = snap.docs[0];
  const data = groupDoc.data() as any;
  const members: GroupMember[] = data.members || [];

  if (members.some((m) => m.uid === member.uid)) {
    return { success: false, error: 'You are already in this group.' };
  }

  const newMember: GroupMember = {
    uid: member.uid,
    name: member.name,
    email: member.email,
    photoURL: member.photoURL,
    joinedAt: new Date().toISOString(),
    stats: { sessions: 0, avgScore: 0, streak: 0 },
  };

  members.push(newMember);
  await updateDoc(doc(db, 'studyGroups', groupDoc.id), {
    members,
  });

  // Add to linked chat group
  const chatGroupId = data.chatGroupId;
  if (chatGroupId) {
    try {
      const { addGroupMember } = await import('./socialService');
      await addGroupMember(chatGroupId, { uid: member.uid, name: member.name, photo: member.photoURL });
    } catch (e) { console.error('Failed to add to chat group:', e); }
  }

  return { success: true, groupId: groupDoc.id };
}

export function subscribeToGroup(groupId: string, callback: (group: StudyGroup | null) => void): () => void {
  return onSnapshot(doc(db, 'studyGroups', groupId), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    const d = snap.data();
    callback({
      id: snap.id,
      name: d.name,
      code: d.code,
      createdBy: d.createdBy,
      members: d.members || [],
      chatGroupId: d.chatGroupId || null,
      createdAt: d.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
    });
  });
}

export async function leaveGroup(groupId: string, uid: string, member: GroupMember): Promise<void> {
  const snap = await getDoc(doc(db, 'studyGroups', groupId));
  if (!snap.exists()) return;
  const data = snap.data();
  const chatGroupId = data.chatGroupId || null;
  const members = (data.members || []).filter((m: any) => m.uid !== uid);

  await updateDoc(doc(db, 'studyGroups', groupId), { members });

  if (chatGroupId) {
    try {
      const { removeGroupMember } = await import('./socialService');
      await removeGroupMember(chatGroupId, uid);
    } catch { }
  }
}

export async function deleteGroup(groupId: string): Promise<void> {
  await deleteDoc(doc(db, 'studyGroups', groupId));
}

export async function updateMemberStats(groupId: string, members: GroupMember[]): Promise<void> {
  await updateDoc(doc(db, 'studyGroups', groupId), { members });
}

// ── Multiplayer Quiz Rooms ──

export async function createQuizRoom(
  creator: { uid: string; name: string; photoURL: string | null },
  config: { topic: string; subject: string; questionCount: number },
  questions: Question[]
): Promise<string> {
  const code = generateCode();
  const ref = doc(collection(db, 'quizRooms'));
  const player: QuizPlayer = {
    uid: creator.uid,
    name: creator.name,
    photoURL: creator.photoURL,
    answers: [],
    score: 0,
    finished: false,
  };
  await setDoc(ref, sanitizeForFirestore({
    code,
    createdBy: creator.uid,
    hostName: creator.name,
    topic: config.topic,
    subject: config.subject,
    questionCount: config.questionCount,
    status: 'waiting',
    questions,
    players: [player],
    createdAt: serverTimestamp(),
    startedAt: null,
    finishedAt: null,
  }));
  return code;
}

export async function joinQuizRoom(
  code: string,
  player: { uid: string; name: string; photoURL: string | null }
): Promise<{ success: boolean; error?: string; roomId?: string }> {
  const q = query(collection(db, 'quizRooms'), where('code', '==', code));
  const snap = await getDocs(q);
  if (snap.empty) return { success: false, error: 'Room not found. Check the code.' };

  const roomDoc = snap.docs[0];
  const data = roomDoc.data() as any;

  if (data.status !== 'waiting') return { success: false, error: 'Game already started or finished.' };

  const players: QuizPlayer[] = data.players || [];
  if (players.some((p) => p.uid === player.uid)) {
    return { success: false, error: 'You already joined this room.' };
  }
  if (players.length >= 4) return { success: false, error: 'Room is full (max 4 players).' };

  const newPlayer: QuizPlayer = {
    uid: player.uid,
    name: player.name,
    photoURL: player.photoURL,
    answers: [],
    score: 0,
    finished: false,
  };

  // Read-modify-write instead of arrayUnion (unreliable with objects)
  const updatedPlayers = [...players, sanitizeForFirestore(newPlayer)];
  await updateDoc(doc(db, 'quizRooms', roomDoc.id), { players: updatedPlayers });

  return { success: true, roomId: roomDoc.id };
}

export async function startQuizRoom(roomId: string): Promise<void> {
  await updateDoc(doc(db, 'quizRooms', roomId), {
    status: 'playing',
    startedAt: serverTimestamp(),
  });
}

export async function submitAnswer(
  roomId: string,
  uid: string,
  answer: { questionId: string; answer: string; correct: boolean; timeMs: number },
  players: QuizPlayer[]
): Promise<void> {
  const updated = players.map((p) => {
    if (p.uid !== uid) return p;
    const exists = p.answers.some((a) => a.questionId === answer.questionId);
    if (exists) return p;
    const newAnswers = [...p.answers, answer];
    return {
      ...p,
      answers: newAnswers,
      score: newAnswers.filter((a) => a.correct).length,
    };
  });
  await updateDoc(doc(db, 'quizRooms', roomId), sanitizeForFirestore({ players: updated }));
}

export async function finishPlayer(roomId: string, uid: string, players: QuizPlayer[]): Promise<void> {
  const updated = players.map((p) => p.uid === uid ? { ...p, finished: true } : p);
  const allFinished = updated.every((p) => p.finished);
  const update: any = { players: updated };
  if (allFinished || updated.filter((p) => p.finished).length >= 2) {
    update.status = 'finished';
    update.finishedAt = serverTimestamp();
  }
  await updateDoc(doc(db, 'quizRooms', roomId), sanitizeForFirestore(update));
}

export function subscribeToQuizRoom(roomId: string, callback: (room: QuizRoom | null) => void): () => void {
  return onSnapshot(doc(db, 'quizRooms', roomId), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    const d = snap.data();
    callback({
      id: snap.id,
      code: d.code,
      createdBy: d.createdBy,
      hostName: d.hostName,
      topic: d.topic,
      subject: d.subject,
      questionCount: d.questionCount,
      status: d.status,
      questions: d.questions || [],
      players: d.players || [],
      createdAt: d.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
      startedAt: d.startedAt?.toDate?.()?.toISOString?.() || null,
      finishedAt: d.finishedAt?.toDate?.()?.toISOString?.() || null,
    });
  });
}

export async function getUserGroups(uid: string): Promise<StudyGroup[]> {
  const snap = await getDocs(collection(db, 'studyGroups'));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as any))
    .filter((g: any) => (g.members || []).some((m: any) => m.uid === uid))
    .map((g: any) => ({
      id: g.id,
      name: g.name,
      code: g.code,
      createdBy: g.createdBy,
      members: g.members || [],
      chatGroupId: g.chatGroupId || null,
      createdAt: g.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
    }));
}
