import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAs_gWcw_2fi9Omk1YRjc4iyUyH4N45jUg",
  authDomain: "fenu-50598.firebaseapp.com",
  projectId: "fenu-50598",
  storageBucket: "fenu-50598.firebasestorage.app",
  messagingSenderId: "649930645704",
  appId: "1:649930645704:web:0416cf15267ac9d6ccc5fd",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Storage: lazy-loaded only when photo uploads happen
let _storage: any = null;
export async function getFirebaseStorage() {
  if (!_storage) {
    const { getStorage } = await import('firebase/storage');
    _storage = getStorage(app);
  }
  return _storage;
}

// Messaging: lazy-loaded only when push is enabled
let _messaging: any = null;
export async function getFirebaseMessaging() {
  try {
    if (!_messaging) {
      const { getMessaging } = await import('firebase/messaging');
      _messaging = getMessaging(app);
    }
    return _messaging;
  } catch {
    return null;
  }
}
