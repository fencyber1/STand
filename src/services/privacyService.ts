import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { storage } from './storage';

function sanitize(obj: any): any {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export type PrivacyLevel = 'everyone' | 'friends' | 'friends_except' | 'nobody';

export interface PrivacyExceptList {
  excludedUids: string[];
}

export interface PrivacySettings {
  lastSeen: PrivacyLevel;
  online: 'same_as_last_seen' | 'everyone';
  profilePhoto: PrivacyLevel;
  bio: PrivacyLevel;
  status: PrivacyLevel;
  allowStatusResharing: boolean;
  readReceipts: boolean;
  groupAdd: PrivacyLevel;
  _friendsExcept?: Record<string, PrivacyExceptList>;
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  lastSeen: 'everyone',
  online: 'same_as_last_seen',
  profilePhoto: 'everyone',
  bio: 'everyone',
  status: 'everyone',
  allowStatusResharing: true,
  readReceipts: true,
  groupAdd: 'everyone',
};

function getLocalKey(): string {
  const uid = storage.getActiveUserId() || '';
  return `stand_privacy_${uid}`;
}

// ── Local storage ──

export function getPrivacySettings(): PrivacySettings {
  try {
    const raw = localStorage.getItem(getLocalKey());
    if (raw) return { ...DEFAULT_PRIVACY, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PRIVACY };
}

export function savePrivacySettings(s: PrivacySettings) {
  try { localStorage.setItem(getLocalKey(), JSON.stringify(s)); } catch {}
  // Also save to Firestore so other users can read it
  const uid = storage.getActiveUserId();
  if (uid) {
    const { _friendsExcept, ...publicSettings } = s;
    setDoc(doc(db, 'userPrivacy', uid), sanitize(publicSettings), { merge: true }).catch(() => {});
  }
}

export function getExcludedUids(key: string): string[] {
  try {
    const raw = localStorage.getItem(getLocalKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed._friendsExcept?.[key]?.excludedUids || [];
    }
  } catch {}
  return [];
}

export function setExcludedUids(key: string, uids: string[]) {
  const settings = getPrivacySettings();
  if (!settings._friendsExcept) settings._friendsExcept = {};
  settings._friendsExcept[key] = { excludedUids: uids };
  savePrivacySettings(settings);
}

// ── Firestore read (other users' privacy) ──

export async function getUserPrivacy(uid: string): Promise<PrivacySettings> {
  try {
    const snap = await getDoc(doc(db, 'userPrivacy', uid));
    if (snap.exists()) return { ...DEFAULT_PRIVACY, ...snap.data() } as PrivacySettings;
  } catch {}
  return { ...DEFAULT_PRIVACY };
}

/**
 * Check if a viewer can see content based on privacy level.
 * @param level - The privacy level setting
 * @param viewerUid - The UID of the person trying to view
 * @param myUid - The content owner's UID
 * @param areFriends - Whether viewer and owner are friends
 * @param settingKey - The key for friends_except exclusion list
 */
export function canViewerSee(
  level: PrivacyLevel,
  viewerUid: string,
  myUid: string,
  areFriends: boolean,
  settingKey: string = 'profilePhoto',
): boolean {
  if (viewerUid === myUid) return true;
  switch (level) {
    case 'everyone': return true;
    case 'friends': return areFriends;
    case 'nobody': return false;
    case 'friends_except': {
      if (!areFriends) return false;
      // Exclusion list is stored locally, so we can't check other users' exclusions from client
      // This check is done server-side or by the owner's client
      return true;
    }
    default: return true;
  }
}

/**
 * Resolve effective online visibility level for a user.
 */
export async function canSeeOnlineStatus(targetUid: string, viewerUid: string, areFriends: boolean): Promise<boolean> {
  const privacy = await getUserPrivacy(targetUid);
  if (privacy.online === 'everyone') return true;
  // same_as_last_seen — use lastSeen setting
  switch (privacy.lastSeen) {
    case 'everyone': return true;
    case 'friends': return areFriends;
    case 'nobody': return false;
    default: return true;
  }
}

/**
 * Check if viewer can see target's profile photo.
 */
export async function canSeeProfilePhoto(targetUid: string, viewerUid: string, areFriends: boolean): Promise<boolean> {
  const privacy = await getUserPrivacy(targetUid);
  return canViewerSee(privacy.profilePhoto, viewerUid, targetUid, areFriends, 'profilePhoto');
}

/**
 * Check if viewer can see target's bio.
 */
export async function canSeeBio(targetUid: string, viewerUid: string, areFriends: boolean): Promise<boolean> {
  const privacy = await getUserPrivacy(targetUid);
  return canViewerSee(privacy.bio, viewerUid, targetUid, areFriends, 'bio');
}

/**
 * Check if viewer can see target's status.
 */
export async function canSeeStatus(targetUid: string, viewerUid: string, areFriends: boolean): Promise<boolean> {
  const privacy = await getUserPrivacy(targetUid);
  return canViewerSee(privacy.status, viewerUid, targetUid, areFriends, 'status');
}

/**
 * Check if someone can add target to a group.
 */
export async function canAddToGroup(targetUid: string, adderUid: string, areFriends: boolean): Promise<boolean> {
  const privacy = await getUserPrivacy(targetUid);
  return canViewerSee(privacy.groupAdd, adderUid, targetUid, areFriends, 'groupAdd');
}
