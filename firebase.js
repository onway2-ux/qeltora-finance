// firebase.js — Firebase initialization (modular SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { getDatabase, ref, set, push, get, update, remove, onValue, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAOCHZttff9Z9omhkym_4nm2aMF4mxQHZk",
  authDomain: "earn-bd299.firebaseapp.com",
  databaseURL: "https://earn-bd299-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "earn-bd299",
  storageBucket: "earn-bd299.firebasestorage.app",
  messagingSenderId: "289678993146",
  appId: "1:289678993146:web:07a2a0957c824f642c0b43"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export {
  auth, db,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  ref, set, push, get, update, remove, onValue, query, orderByChild, equalTo
};
