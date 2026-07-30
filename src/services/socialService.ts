import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, serverTimestamp,
  writeBatch, documentId,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { createNotification } from './notificationService';
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

export async function uploadMedia(file: Blob, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
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

export async function upsertUserProfile(profile: { uid: string; displayName: string; photoURL: string | null; email?: string; status?: string; bio?: string; surname?: string; role?: string; hobby?: string; country?: string }): Promise<void> {
  const ref = doc(db, 'userProfiles', profile.uid);
  const existing = await getDoc(ref);
  const data: any = {
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    status: profile.status || 'Available',
    lastSeen: ts(),
  };
  if (profile.email !== undefined) data.email = profile.email;
  if (profile.bio !== undefined) data.bio = profile.bio;
  if (profile.surname !== undefined) data.surname = profile.surname;
  if (profile.role !== undefined) data.role = profile.role;
  if (profile.hobby !== undefined) data.hobby = profile.hobby;
  if (profile.country !== undefined) data.country = profile.country;
  if (!existing.exists()) {
    data.uid = profile.uid;
    data.online = false;
    data.typingIn = null;
    if (!data.bio) data.bio = '';
    if (!data.surname) data.surname = '';
    if (!data.role) data.role = '';
    if (!data.hobby) data.hobby = '';
    if (!data.country) data.country = '';
    if (!data.email) data.email = '';
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
      surname: d.surname || '',
      role: d.role || '',
      hobby: d.hobby || '',
      country: d.country || '',
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

  try {
    const existingSnap = await getDocs(query(
      collection(db, 'friendRequests'),
      where('from', '==', from.uid),
    ));
    const alreadySent = existingSnap.docs.some((d) => d.data().to === to.uid && d.data().status === 'pending');
    if (alreadySent) return { success: false, error: 'Request already sent.' };

    const reverseSnap = await getDocs(query(
      collection(db, 'friendRequests'),
      where('from', '==', to.uid),
    ));
    const reverseDoc = reverseSnap.docs.find((d) => d.data().to === from.uid);
    if (reverseDoc) {
      const data = reverseDoc.data();
      if (data.status === 'pending') {
        await updateDoc(reverseDoc.ref, { status: 'accepted' });
        return { success: true };
      }
      return { success: false, error: 'They already sent you a request.' };
    }
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to check existing requests.' };
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
  createNotification(to.uid, {
    type: 'friend_request',
    title: 'New Friend Request',
    body: `${from.name} sent you a friend request`,
    link: '/friends',
    fromUid: from.uid,
    fromName: from.name,
    fromPhoto: from.photo || '',
  }).catch(() => {});
  return { success: true };
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'accepted' });
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'rejected' });
}

export async function removeFriend(myUid: string, friendUid: string): Promise<void> {
  const snap1 = await getDocs(query(collection(db, 'friendRequests'), where('from', '==', myUid)));
  const snap2 = await getDocs(query(collection(db, 'friendRequests'), where('from', '==', friendUid)));
  const batch = writeBatch(db);
  snap1.docs.forEach((d) => {
    if (d.data().to === friendUid) batch.update(d.ref, { status: 'rejected' });
  });
  snap2.docs.forEach((d) => {
    if (d.data().to === myUid) batch.update(d.ref, { status: 'rejected' });
  });
  await batch.commit();
}

export function subscribeToFriendRequests(uid: string, cb: (requests: FriendRequest[]) => void): () => void {
  const q1 = query(collection(db, 'friendRequests'), where('to', '==', uid));
  const q2 = query(collection(db, 'friendRequests'), where('from', '==', uid));
  let incoming: FriendRequest[] = [];
  let outgoing: FriendRequest[] = [];
  const emit = () => cb([...incoming, ...outgoing]);
  const u1 = onSnapshot(q1, (snap) => {
    incoming = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as FriendRequest))
      .filter((r) => r.status === 'pending');
    emit();
  });
  const u2 = onSnapshot(q2, (snap) => {
    outgoing = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as FriendRequest))
      .filter((r) => r.status === 'pending');
    emit();
  });
  return () => { u1(); u2(); };
}

export function subscribeToFriends(uid: string, cb: (friends: Friend[]) => void): () => void {
  const q1 = query(collection(db, 'friendRequests'), where('from', '==', uid));
  const q2 = query(collection(db, 'friendRequests'), where('to', '==', uid));
  let friendUids = new Set<string>();
  let friendData: Record<string, Friend> = {};
  const emit = () => cb(Array.from(friendUids).map((uid) => friendData[uid]).filter(Boolean));
  const processDocs = (snap: any, isFrom: boolean) => {
    snap.docChanges().forEach((change: any) => {
      const d = change.doc.data();
      if (d.status !== 'accepted') return;
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
  const snap1 = await getDocs(query(collection(db, 'friendRequests'), where('from', '==', uid)));
  const snap2 = await getDocs(query(collection(db, 'friendRequests'), where('to', '==', uid)));
  const uids = new Set<string>();
  snap1.docs.forEach((d) => { if (d.data().status === 'accepted') uids.add(d.data().to); });
  snap2.docs.forEach((d) => { if (d.data().status === 'accepted') uids.add(d.data().from); });
  return Array.from(uids);
}

// ── Posts ──

export async function createPost(author: { uid: string; name: string; photo: string | null }, content: string, media?: { url: string; type: 'image' | 'video'; mediaType: string }): Promise<string> {
  const ref = doc(collection(db, 'posts'));
  const docData: any = {
    authorUid: author.uid,
    authorName: author.name,
    authorPhoto: author.photo,
    content,
    type: media ? media.type : 'text',
    likes: [],
    commentCount: 0,
    reposts: [],
    shares: 0,
    createdAt: ts(),
  };
  if (media) {
    docData.mediaUrl = media.url;
    docData.mediaType = media.mediaType;
  }
  await setDoc(ref, sanitize(docData));
  return ref.id;
}

export async function repostPost(author: { uid: string; name: string; photo: string | null }, originalPostId: string, caption: string): Promise<string> {
  const ref = doc(collection(db, 'posts'));
  await setDoc(ref, sanitize({
    authorUid: author.uid,
    authorName: author.name,
    authorPhoto: author.photo,
    content: caption,
    type: 'text',
    mediaUrl: null,
    mediaType: null,
    likes: [],
    commentCount: 0,
    reposts: [],
    shares: 0,
    repostOf: originalPostId,
    createdAt: ts(),
  }));
  // Add to original post's reposts
  const origRef = doc(db, 'posts', originalPostId);
  const origSnap = await getDoc(origRef);
  if (origSnap.exists()) {
    const reposts: string[] = origSnap.data().reposts || [];
    if (!reposts.includes(author.uid)) {
      await updateDoc(origRef, { reposts: [...reposts, author.uid] });
    }
  }
  return ref.id;
}

export async function sharePost(postId: string): Promise<void> {
  const ref = doc(db, 'posts', postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  await updateDoc(ref, { shares: (snap.data().shares || 0) + 1 });
}

export function subscribeToFeed(uid: string, cb: (posts: Post[]) => void): () => void {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const posts = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        authorUid: data.authorUid,
        authorName: data.authorName,
        authorPhoto: data.authorPhoto,
        content: data.content,
        type: data.type || 'text',
        mediaUrl: data.mediaUrl || undefined,
        mediaType: data.mediaType || undefined,
        likes: data.likes || [],
        commentCount: data.commentCount || 0,
        reposts: data.reposts || [],
        shares: data.shares || 0,
        repostOf: data.repostOf || undefined,
        createdAt: data.createdAt,
      } as Post;
    }).slice(0, 50);
    cb(posts);
  });
}

export async function toggleLike(postId: string, uid: string, liked: boolean): Promise<void> {
  const ref = doc(db, 'posts', postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const likes: string[] = snap.data().likes || [];
  if (liked && !likes.includes(uid)) {
    await updateDoc(ref, { likes: [...likes, uid] });
    // Notify post author
    const authorUid = snap.data().authorUid;
    if (authorUid && authorUid !== uid) {
      createNotification(authorUid, {
        type: 'post_like',
        title: 'New Like',
        body: `Someone liked your post`,
        link: '/feed',
        fromUid: uid,
        fromName: '',
        fromPhoto: '',
      }).catch(() => {});
    }
  } else if (!liked) {
    await updateDoc(ref, { likes: likes.filter((l) => l !== uid) });
  }
}

export async function likePost(postId: string, uid: string): Promise<void> {
  const ref = doc(db, 'posts', postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const likes: string[] = snap.data().likes || [];
  if (!likes.includes(uid)) {
    await updateDoc(ref, { likes: [...likes, uid] });
    // Notify post author
    const authorUid = snap.data().authorUid;
    if (authorUid && authorUid !== uid) {
      createNotification(authorUid, {
        type: 'post_like',
        title: 'New Like',
        body: `Someone liked your post`,
        link: '/feed',
        fromUid: uid,
        fromName: '',
        fromPhoto: '',
      }).catch(() => {});
    }
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
    // Notify post author
    const postAuthorUid = postSnap.data().authorUid;
    if (postAuthorUid && postAuthorUid !== author.uid) {
      createNotification(postAuthorUid, {
        type: 'post_comment',
        title: `${author.name} commented on your post`,
        body: content.length > 80 ? content.slice(0, 80) + '...' : content,
        link: '/feed',
        fromUid: author.uid,
        fromName: author.name,
        fromPhoto: author.photo || '',
      }).catch(() => {});
    }
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
  // Notify other member
  try {
    const roomSnap = await getDoc(doc(db, 'chatRooms', chatId));
    if (roomSnap.exists()) {
      const members: string[] = roomSnap.data().members || [];
      const otherUid = members.find((m) => m !== sender.uid);
      if (otherUid) {
        createNotification(otherUid, {
          type: 'message',
          title: sender.name,
          body: preview.length > 80 ? preview.slice(0, 80) + '...' : preview,
          link: `/chat/${chatId}`,
          fromUid: sender.uid,
          fromName: sender.name,
          fromPhoto: sender.photo || '',
        }).catch(() => {});
      }
    }
  } catch { /* best effort */ }
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

export async function getUserProfile(uid: string): Promise<{ uid: string; displayName: string; photoURL: string | null; email: string; bio: string; surname: string; role: string; hobby: string; country: string } | null> {
  try {
    const snap = await getDoc(doc(db, 'userProfiles', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return { uid: d.uid || uid, displayName: d.displayName || 'Unknown', photoURL: d.photoURL || null, email: d.email || '', bio: d.bio || '', surname: d.surname || '', role: d.role || '', hobby: d.hobby || '', country: d.country || '' };
  } catch { return null; }
}

// ── Group Chat ──

export async function createChatGroup(creator: { uid: string; name: string; photo: string | null }, groupName: string, memberUids: string[]): Promise<string> {
  const members = [{ uid: creator.uid, name: creator.name, photoURL: creator.photo, role: 'admin' as const }];
  const ref = doc(collection(db, 'chatGroups'));
  await setDoc(ref, sanitize({
    name: groupName,
    photoURL: null,
    description: '',
    members,
    memberUids,
    createdBy: creator.uid,
    settings: { messagePermission: 'all', editProfile: 'all' },
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
  const memberUids = data.memberUids || [];
  if (members.some((m: any) => m.uid === member.uid)) return;
  members.push({ uid: member.uid, name: member.name, photoURL: member.photo, role: 'member' });
  memberUids.push(member.uid);
  await updateDoc(doc(db, 'chatGroups', groupId), { members, memberUids });
}

export async function removeGroupMember(groupId: string, uid: string): Promise<void> {
  const snap = await getDoc(doc(db, 'chatGroups', groupId));
  if (!snap.exists()) return;
  const data = snap.data();
  const members = (data.members || []).filter((m: any) => m.uid !== uid);
  const memberUids = (data.memberUids || []).filter((u: string) => u !== uid);
  await updateDoc(doc(db, 'chatGroups', groupId), { members, memberUids });
}

export async function updateGroupProfile(groupId: string, updates: { name?: string; photoURL?: string | null; description?: string }): Promise<void> {
  await updateDoc(doc(db, 'chatGroups', groupId), sanitize(updates));
}

export async function updateGroupSettings(groupId: string, settings: { messagePermission?: 'all' | 'admins'; editProfile?: 'all' | 'admins' }): Promise<void> {
  const snap = await getDoc(doc(db, 'chatGroups', groupId));
  if (!snap.exists()) return;
  const current = snap.data().settings || { messagePermission: 'all' };
  await updateDoc(doc(db, 'chatGroups', groupId), { settings: { ...current, ...settings } });
}

export async function setGroupMemberRole(groupId: string, memberUid: string, role: 'admin' | 'member'): Promise<void> {
  const snap = await getDoc(doc(db, 'chatGroups', groupId));
  if (!snap.exists()) return;
  const data = snap.data();
  const members = (data.members || []).map((m: any) => m.uid === memberUid ? { ...m, role } : m);
  await updateDoc(doc(db, 'chatGroups', groupId), { members });
}

export function subscribeToUserGroups(uid: string, cb: (groups: ChatGroup[]) => void): () => void {
  const q = query(collection(db, 'chatGroups'), where('memberUids', 'array-contains', uid));
  return onSnapshot(q, (snap) => {
    const groups = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        photoURL: data.photoURL || null,
        description: data.description || '',
        members: data.members || [],
        memberUids: data.memberUids || [],
        createdBy: data.createdBy,
        settings: data.settings || { messagePermission: 'all', editProfile: 'all' },
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
  // Notify other group members
  try {
    const groupSnap = await getDoc(doc(db, 'chatGroups', groupId));
    if (groupSnap.exists()) {
      const memberUids: string[] = groupSnap.data().memberUids || [];
      const groupName: string = groupSnap.data().name || 'Group';
      const otherUids = memberUids.filter((m) => m !== sender.uid);
      otherUids.forEach((uid) => {
        createNotification(uid, {
          type: 'group_message',
          title: groupName,
          body: `${sender.name}: ${preview.length > 60 ? preview.slice(0, 60) + '...' : preview}`,
          link: `/groups-chat/${groupId}`,
          fromUid: sender.uid,
          fromName: sender.name,
          fromPhoto: sender.photo || '',
        }).catch(() => {});
      });
    }
  } catch { /* best effort */ }
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
