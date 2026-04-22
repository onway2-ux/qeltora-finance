// auth.js — Authentication logic
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase.js';

// Sign up new user
export async function signup(email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: cred.user };
  } catch (e) {
    return { success: false, error: friendlyError(e.code) };
  }
}

// Sign in existing user
export async function login(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: cred.user };
  } catch (e) {
    return { success: false, error: friendlyError(e.code) };
  }
}

// Sign out
export async function logout() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Auth state listener
export function onAuth(callback) {
  onAuthStateChanged(auth, callback);
}

// Get current user
export function currentUser() {
  return auth.currentUser;
}

// Friendly error messages
function friendlyError(code) {
  const map = {
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please try later.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/network-request-failed': 'Network error. Check your connection.'
  };
  return map[code] || 'Authentication failed. Please try again.';
}
