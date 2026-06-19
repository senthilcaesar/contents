import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD0SuYRNdGuuc6Qm05v2nV0PmQs5ygJZ6k",
  authDomain: "podtube-vault-624d9.firebaseapp.com",
  projectId: "podtube-vault-624d9",
  storageBucket: "podtube-vault-624d9.firebasestorage.app",
  messagingSenderId: "834262049081",
  appId: "1:834262049081:web:47dfbc5d04a8c91ae888e8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Always prompt for account selection when logging in
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { signInWithPopup, signOut };
