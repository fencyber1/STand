import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  onSnapshot, query, where, serverTimestamp,
  writeBatch, documentId,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile, FriendRequest, Friend, Post, PostComment, ChatRoom, ChatMessage, ChatGroup, GroupMessage, Presence } from '../types';

function sanitize(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize).filter((v) => v !== undefined);
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) { if (v !== undefined) clean[k] = sanitize(v); }
  return clean;
}

function ts(): string {
  return new Date().toISOString();
}

// ── User Presence ──

export function setOnline(uid: string): () => void {
  const ref = doc(db, 'presence', uid);
  setDoc(ref, sanitize({ uid, online: true, lastSeen: ts(), typingIn: null }), { merge: true });
  const disconnect = () => {
    setDoc(ref, sanitize({ uid, online: false, lastSeen: ts(), typingIn: null }), { merge: true });
  };
  window.addEventListener('beforeunload', disconnect);
  return () => {
    window.removeEventListener('beforeunload', disconnect);
    disconnect();
  };
}

export function setTyping(uid: string, chatId: string | null): void {
  const ref = doc(db, 'presence', uid);
  updateDoc(ref, sanitize({ typingIn: chatId })).catch(() => {
    setDoc(ref, sanitize({ uid, online: true, lastSeen: ts(), typingIn: chatId }), { merge: true });
  });
}

export function subscribeToPresence(uids: string[], cb: (presences: Record<string, Presence>) => void): () => void {
  if (uids.length === 0) { cb({}); return () => {}; }
  const chunks: string[][] = [];
  for (let i = 0; i < uids.length; i += 10) chunks.push(uids.slice(i, i + 10));
  const unsubs: (() => void)[] = [];
  const state: Record<string, Presence> = {};
  for (const chunk of chunks) {
    const q = query(collection(db, 'presence'), where(documentId(), 'in', chunk));
    unsubs.push(onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          delete state[change.doc.id];
        } else {
          const d = change.doc.data();
          state[change.doc.id] = {
            uid: change.doc.id,
            online: d.online ?? false,
            lastSeen: d.lastSeen ?? '',
            typingIn: d.typingIn ?? null,
          };
        }
      });
      cb({ ...state });
    }));
  }
  return () => unsubs.forEach((u) => u());
}

// ── User Profiles ──

export async function upsertUserProfile(profile: { uid: string; displayName: string; photoURL: string | null; status?: string; bio?: string }): Promise<void> {
  const ref = doc(db, 'userProfiles', profile.uid);
  const existing = await getDoc(ref);
  const data: any = {
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    status: profile.status || 'Available',
    bio: profile.bio || '',
    lastSeen: ts(),
  };
  if (!existing.exists()) {
    data.uid = profile.uid;
    data.online = false;
    data.typingIn = null;
  }
  await setDoc(ref, sanitize(data), { merge: true });
}

export function subscribeToUserProfile(uid: string, cb: (profile: UserProfile | null) => void): () => void {
  return onSnapshot(doc(db, 'userProfiles', uid), (snap) => {
    if (!snap.exists()) { cb(null); return; }
    const d = snap.data();
    cb({
      uid: snap.id,
      displayName: d.displayName || '',
      photoURL: d.photoURL || null,
      status: d.status || 'Available',
      online: d.online ?? false,
      lastSeen: d.lastSeen || '',
      typingIn: d.typingIn || null,
      bio: d.bio || '',
    });
  });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, 'userProfiles', uid), sanitize(data));
}

export async function searchUsers(searchTerm: string, excludeUid?: string): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'userProfiles'));
  const term = searchTerm.toLowerCase().trim();
  const words = term.split(/\s+/).filter(Boolean);
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
    .filter((u) => {
      if (excludeUid && u.uid === excludeUid) return false;
      const name = u.displayName.toLowerCase();
      if (words.length === 0) return false;
      return words.every((w) => name.includes(w));
    })
    .slice(0, 30);
}

export async function getSuggestedUsers(uid: string, limit: number = 10): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'userProfiles'));
  const friendSnap1 = await getDocs(query(collection(db, 'friendRequests'), where('from', '==', uid)));
  const friendSnap2 = await getDocs(query(collection(db, 'friendRequests'), where('to', '==', uid)));
  const friendUids = new Set<string>();
  friendSnap1.docs.forEach((d) => friendUids.add(d.data().to));
  friendSnap2.docs.forEach((d) => friendUids.add(d.data().from));
  friendUids.add(uid);
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
    .filter((u) => !friendUids.has(u.uid))
    .sort(() => Math.random() - 0.5)
    .slice(0, limit);
}

// ── Friends ──

export async function sendFriendRequest(from: { uid: string; name: string; photo: string | null }, to: { uid: string; name: string; photo: string | null }): Promise<{ success: boolean; error?: string }> {
  if (from.uid === to.uid) return { success: false, error: "You can't add yourself." };

  const existing = await getDocs(query(
    collection(db, 'friendRequests'),
    where('from', '==', from.uid),
    where('to', '==', to.uid),
  ));
  if (!existing.empty) return { success: false, error: 'Request already sent.' };

  const reverse = await getDocs(query(
    collection(db, 'friendRequests'),
    where('from', '==', to.uid),
    where('to', '==', from.uid),
  ));
  if (!reverse.empty) {
    const doc = reverse.docs[0];
    const data = doc.data();
    if (data.status === 'pending') {
      await updateDoc(doc.ref, { status: 'accepted' });
      return { success: true };
    }
    return { success: false, error: 'They already sent you a request.' };
  }

  await setDoc(doc(collection(db, 'friendRequests')), sanitize({
    from: from.uid,
    fromName: from.name,
    fromPhoto: from.photo,
    to: to.uid,
    toName: to.name,
    toPhoto: to.photo,
    status: 'pending',
    createdAt: ts(),
  }));
  return { success: true };
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'accepted' });
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'rejected' });
}

export async function removeFriend(myUid: string, friendUid: string): Promise<void> {
  const snap1 = await getDocs(query(collection(db, 'friendRequests'), where('from', '==', myUid), where('to', '==', friendUid)));
  const snap2 = await getDocs(query(collection(db, 'friendRequests'), where('from', '==', friendUid), where('to', '==', myUid)));
  const batch = writeBatch(db);
  snap1.docs.forEach((d) => batch.update(d.ref, { status: 'rejected' }));
  snap2.docs.forEach((d) => batch.update(d.ref, { status: 'rejected' }));
  await batch.commit();
}

export function subscribeToFriendRequests(uid: string, cb: (requests: FriendRequest[]) => void): () => void {
  const q1 = query(collection(db, 'friendRequests'), where('to', '==', uid), where('status', '==', 'pending'));
  const q2 = query(collection(db, 'friendRequests'), where('from', '==', uid), where('status', '==', 'pending'));
  let incoming: FriendRequest[] = [];
  let outgoing: FriendRequest[] = [];
  const emit = () => cb([...incoming, ...outgoing]);
  const u1 = onSnapshot(q1, (snap) => {
    incoming = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequest));
    emit();
  });
  const u2 = onSnapshot(q2, (snap) => {
    outgoing = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequest));
    emit();
  });
  return () => { u1(); u2(); };
}

export function subscribeToFriends(uid: string, cb: (friends: Friend[]) => void): () => void {
  const q1 = query(collection(db, 'friendRequests'), where('from', '==', uid), where('status', '==', 'accepted'));
  const q2 = query(collection(db, 'friendRequests'), where('to', '==', uid), where('status', '==', 'accepted'));
  let friendUids = new Set<string>();
  let friendData: Record<string, Friend> = {};
  const emit = () => cb(Array.from(friendUids).map((uid) => friendData[uid]).filter(Boolean));
  const processDocs = (snap: any, isFrom: boolean) => {
    snap.docChanges().forEach((change: any) => {
      const d = change.doc.data();
      const otherUid = isFrom ? d.to : d.from;
      const otherName = isFrom ? d.toName : d.fromName;
      const otherPhoto = isFrom ? d.toPhoto : d.fromPhoto;
      if (change.type === 'removed') {
        friendUids.delete(otherUid);
        delete friendData[otherUid];
      } else {
        friendUids.add(otherUid);
        friendData[otherUid] = {
          uid: otherUid,
          displayName: otherName,
          photoURL: otherPhoto,
          status: '',
          online: false,
          lastSeen: '',
        };
      }
    });
    emit();
  };
  const u1 = onSnapshot(q1, (snap) => processDocs(snap, true));
  const u2 = onSnapshot(q2, (snap) => processDocs(snap, false));
  return () => { u1(); u2(); };
}

export async function getFriendUids(uid: string): Promise<string[]> {
  const snap1 = await getDocs(query(collection(db, 'friendRequests'), where('from', '==', uid), where('status', '==', 'accepted')));
  const snap2 = await getDocs(query(collection(db, 'friendRequests'), where('to', '==', uid), where('status', '==', 'accepted')));
  const uids = new Set<string>();
  snap1.docs.forEach((d) => uids.add(d.data().to));
  snap2.docs.forEach((d) => uids.add(d.data().from));
  return Array.from(uids);
}

// ── Posts ──

export async function createPost(author: { uid: string; name: string; photo: string | null }, content: string): Promise<string> {
  const ref = doc(collection(db, 'posts'));
  await setDoc(ref, sanitize({
    authorUid: author.uid,
    authorName: author.name,
    authorPhoto: author.photo,
    content,
    likes: [],
    commentCount: 0,
    createdAt: ts(),
  }));
  return ref.id;
}

export function subscribeToFeed(uid: string, friendUids: string[], cb: (posts: Post[]) => void): () => void {
  const allUids = [uid, ...friendUids];
  if (allUids.length > 10) allUids.length = 10;
  const q = query(collection(db, 'posts'), where('authorUid', 'in', allUids));
  return onSnapshot(q, (snap) => {
    const posts = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        authorUid: data.authorUid,
        authorName: data.authorName,
        authorPhoto: data.authorPhoto,
        content: data.content,
        likes: data.likes || [],
        commentCount: data.commentCount || 0,
        createdAt: data.createdAt,
      } as Post;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
    cb(posts);
  });
}

export async function toggleLike(postId: string, uid: string, liked: boolean): Promise<void> {
  const ref = doc(db, 'posts', postId);
  if (liked) {
    await updateDoc(ref, { likes: [uid] });
  } else {
    await updateDoc(ref, { likes: [] });
  }
}

export async function likePost(postId: string, uid: string): Promise<void> {
  const ref = doc(db, 'posts', postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const likes: string[] = snap.data().likes || [];
  if (!likes.includes(uid)) {
    await updateDoc(ref, { likes: [...likes, uid] });
  }
}

export async function unlikePost(postId: string, uid: string): Promise<void> {
  const ref = doc(db, 'posts', postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const likes: string[] = snap.data().likes || [];
  await updateDoc(ref, { likes: likes.filter((l) => l !== uid) });
}

export async function deletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId));
}

// ── Comments ──

export function subscribeToComments(postId: string, cb: (comments: PostComment[]) => void): () => void {
  const q = query(collection(db, 'postComments'), where('postId', '==', postId));
  return onSnapshot(q, (snap) => {
    const comments = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        postId: data.postId,
        authorUid: data.authorUid,
        authorName: data.authorName,
        authorPhoto: data.authorPhoto,
        content: data.content,
        createdAt: data.createdAt,
      } as PostComment;
    }).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    cb(comments);
  });
}

export async function addComment(postId: string, author: { uid: string; name: string; photo: string | null }, content: string): Promise<string> {
  const ref = doc(collection(db, 'postComments'));
  await setDoc(ref, sanitize({
    postId,
    authorUid: author.uid,
    authorName: author.name,
    authorPhoto: author.photo,
    content,
    createdAt: ts(),
  }));
  const postRef = doc(db, 'posts', postId);
  const postSnap = await getDoc(postRef);
  if (postSnap.exists()) {
    await updateDoc(postRef, { commentCount: (postSnap.data().commentCount || 0) + 1 });
  }
  return ref.id;
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'postComments', commentId));
  const postRef = doc(db, 'posts', postId);
  const postSnap = await getDoc(postRef);
  if (postSnap.exists()) {
    await updateDoc(postRef, { commentCount: Math.max(0, (postSnap.data().commentCount || 1) - 1) });
  }
}

// ── Chat (1-on-1) ──

export async function findOrCreateChatRoom(myUid: string, friendUid: string, myInfo: { name: string; photo: string | null }, friendInfo: { name: string; photo: string | null }): Promise<string> {
  const q1 = query(collection(db, 'chatRooms'), where('members', 'array-contains', myUid));
  const snap = await getDocs(q1);
  for (const d of snap.docs) {
    const data = d.data();
    if ((data.members || []).includes(friendUid)) return d.id;
  }
  const ref = doc(collection(db, 'chatRooms'));
  const members = [myUid, friendUid];
  const memberNames: Record<string, string> = { [myUid]: myInfo.name, [friendUid]: friendInfo.name };
  const memberPhotos: Record<string, string | null> = { [myUid]: myInfo.photo, [friendUid]: friendInfo.photo };
  await setDoc(ref, sanitize({
    members,
    memberNames,
    memberPhotos,
    lastMessage: '',
    lastMessageBy: '',
    lastMessageAt: ts(),
    createdAt: ts(),
  }));
  return ref.id;
}

export function subscribeToUserChats(uid: string, cb: (chats: ChatRoom[]) => void): () => void {
  const q = query(collection(db, 'chatRooms'), where('members', 'array-contains', uid));
  return onSnapshot(q, (snap) => {
    const chats = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        members: data.members || [],
        memberNames: data.memberNames || {},
        memberPhotos: data.memberPhotos || {},
        lastMessage: data.lastMessage || '',
        lastMessageBy: data.lastMessageBy || '',
        lastMessageAt: data.lastMessageAt || '',
        createdAt: data.createdAt || '',
      } as ChatRoom;
    }).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
    cb(chats);
  });
}

export function subscribeToChatMessages(chatId: string, cb: (messages: ChatMessage[]) => void): () => void {
  const q = query(collection(db, 'chatMessages'), where('chatId', '==', chatId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        chatId: data.chatId,
        senderUid: data.senderUid,
        senderName: data.senderName,
        senderPhoto: data.senderPhoto,
        text: data.text,
        type: data.type || 'text',
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        fileName: data.fileName,
        fileSize: data.fileSize,
        contact: data.contact,
        location: data.location,
        createdAt: data.createdAt,
        read: data.read ?? false,
        edited: data.edited ?? false,
      } as ChatMessage;
    }).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  });
}

export async function sendChatMessage(chatId: string, sender: { uid: string; name: string; photo: string | null }, text: string, media?: { type: string; mediaUrl: string; mediaType?: string; fileName?: string; fileSize?: number; contact?: { name: string; phone: string; email: string }; location?: { lat: number; lng: number; name: string } }): Promise<void> {
  const ref = doc(collection(db, 'chatMessages'));
  await setDoc(ref, sanitize({
    chatId,
    senderUid: sender.uid,
    senderName: sender.name,
    senderPhoto: sender.photo,
    text,
    ...(media || {}),
    createdAt: ts(),
    read: false,
  }));
  const preview = media?.type === 'image' ? '📷 Photo' : media?.type === 'audio' ? '🎵 Audio' : media?.type === 'document' ? '📄 Document' : media?.type === 'contact' ? '👤 Contact' : media?.type === 'location' ? '📍 Location' : text;
  await updateDoc(doc(db, 'chatRooms', chatId), sanitize({
    lastMessage: preview,
    lastMessageBy: sender.uid,
    lastMessageAt: ts(),
  }));
}

export async function markChatRead(chatId: string, uid: string): Promise<void> {
  const q = query(collection(db, 'chatMessages'), where('chatId', '==', chatId), where('read', '==', false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    if (d.data().senderUid !== uid) batch.update(d.ref, { read: true });
  });
  await batch.commit();
}

export async function editChatMessage(messageId: string, newText: string): Promise<void> {
  await updateDoc(doc(db, 'chatMessages', messageId), sanitize({ text: newText, edited: true }));
}

export async function editGroupMessage(messageId: string, newText: string): Promise<void> {
  await updateDoc(doc(db, 'groupMessages', messageId), sanitize({ text: newText, edited: true }));
}

export async function getUserProfile(uid: string): Promise<{ uid: string; displayName: string; photoURL: string | null; email: string } | null> {
  try {
    const snap = await getDoc(doc(db, 'userProfiles', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return { uid: d.uid || uid, displayName: d.displayName || 'Unknown', photoURL: d.photoURL || null, email: d.email || '' };
  } catch { return null; }
}

// ── Group Chat ──

export async function createChatGroup(creator: { uid: string; name: string; photo: string | null }, groupName: string, memberUids: string[]): Promise<string> {
  const members = [{ uid: creator.uid, name: creator.name, photoURL: creator.photo, role: 'admin' as const }];
  const ref = doc(collection(db, 'chatGroups'));
  await setDoc(ref, sanitize({
    name: groupName,
    members,
    createdBy: creator.uid,
    lastMessage: '',
    lastMessageBy: '',
    lastMessageAt: ts(),
    createdAt: ts(),
  }));
  return ref.id;
}

export async function addGroupMember(groupId: string, member: { uid: string; name: string; photo: string | null }): Promise<void> {
  const snap = await getDoc(doc(db, 'chatGroups', groupId));
  if (!snap.exists()) return;
  const data = snap.data();
  const members = data.members || [];
  if (members.some((m: any) => m.uid === member.uid)) return;
  members.push({ uid: member.uid, name: member.name, photoURL: member.photo, role: 'member' });
  await updateDoc(doc(db, 'chatGroups', groupId), { members });
}

export async function removeGroupMember(groupId: string, uid: string): Promise<void> {
  const snap = await getDoc(doc(db, 'chatGroups', groupId));
  if (!snap.exists()) return;
  const data = snap.data();
  const members = (data.members || []).filter((m: any) => m.uid !== uid);
  await updateDoc(doc(db, 'chatGroups', groupId), { members });
}

export function subscribeToUserGroups(uid: string, cb: (groups: ChatGroup[]) => void): () => void {
  const q = query(collection(db, 'chatGroups'), where('members', 'array-contains', { uid }));
  return onSnapshot(q, (snap) => {
    const groups = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        members: data.members || [],
        createdBy: data.createdBy,
        lastMessage: data.lastMessage || '',
        lastMessageBy: data.lastMessageBy || '',
        lastMessageAt: data.lastMessageAt || '',
        createdAt: data.createdAt || '',
      } as ChatGroup;
    }).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
    cb(groups);
  });
}

export function subscribeToGroupMessages(groupId: string, cb: (messages: GroupMessage[]) => void): () => void {
  const q = query(collection(db, 'groupMessages'), where('groupId', '==', groupId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        groupId: data.groupId,
        senderUid: data.senderUid,
        senderName: data.senderName,
        senderPhoto: data.senderPhoto,
        text: data.text,
        type: data.type || 'text',
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        fileName: data.fileName,
        fileSize: data.fileSize,
        contact: data.contact,
        location: data.location,
        createdAt: data.createdAt,
        readBy: data.readBy || [],
        edited: data.edited ?? false,
      } as GroupMessage;
    }).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  });
}

export async function sendGroupMessage(groupId: string, sender: { uid: string; name: string; photo: string | null }, text: string, media?: { type: string; mediaUrl: string; mediaType?: string; fileName?: string; fileSize?: number; contact?: { name: string; phone: string; email: string }; location?: { lat: number; lng: number; name: string } }): Promise<void> {
  const ref = doc(collection(db, 'groupMessages'));
  await setDoc(ref, sanitize({
    groupId,
    senderUid: sender.uid,
    senderName: sender.name,
    senderPhoto: sender.photo,
    text,
    ...(media || {}),
    createdAt: ts(),
    readBy: [sender.uid],
  }));
  const preview = media?.type === 'image' ? '📷 Photo' : media?.type === 'audio' ? '🎵 Audio' : media?.type === 'document' ? '📄 Document' : media?.type === 'contact' ? '👤 Contact' : media?.type === 'location' ? '📍 Location' : text;
  await updateDoc(doc(db, 'chatGroups', groupId), sanitize({
    lastMessage: preview,
    lastMessageBy: sender.uid,
    lastMessageAt: ts(),
  }));
}

export async function markGroupRead(groupId: string, uid: string): Promise<void> {
  const q = query(collection(db, 'groupMessages'), where('groupId', '==', groupId), where('readBy', 'not-in', [[uid]]));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    const readBy: string[] = d.data().readBy || [];
    if (!readBy.includes(uid)) batch.update(d.ref, { readBy: [...readBy, uid] });
  });
  await batch.commit();
}
