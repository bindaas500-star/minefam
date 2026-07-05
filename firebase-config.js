// ============================================
// MineFam - Firebase Configuration
// Using Realtime Database (free, no billing account required)
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  runTransaction,
  query,
  orderByChild,
  limitToLast,
  increment
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAKtbSPeTE4BdMJA6apPHH-yPYGPvI-ftk",
  authDomain: "minefam-earn.firebaseapp.com",
  databaseURL: "https://minefam-earn-default-rtdb.firebaseio.com",
  projectId: "minefam-earn",
  storageBucket: "minefam-earn.firebasestorage.app",
  messagingSenderId: "130871115475",
  appId: "1:130871115475:web:12f797cf776af2f4a91e26"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

export {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  runTransaction,
  query,
  orderByChild,
  limitToLast,
  increment
};
