import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, type Messaging } from 'firebase/messaging';

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
export const storage = getStorage(app);

let _messaging: Messaging | null = null;
export function getFirebaseMessaging(): Messaging | null {
  try {
    if (!_messaging) _messaging = getMessaging(app);
    return _messaging;
  } catch {
    return null;
  }
}
