import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
         createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment }
  from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const auth = getAuth(window.__firebaseApp);
const db   = getFirestore(window.__firebaseApp);
const googleProvider = new GoogleAuthProvider();

// ── Auth wall — blocks the app until user is signed in ────────────────────────
const authWall    = document.getElementById('authWall');
const appShell    = document.getElementById('appShell');

function showApp()  { authWall.classList.add('hidden');    appShell.classList.remove('hidden'); }
function showWall() { authWall.classList.remove('hidden'); appShell.classList.add('hidden'); }

onAuthStateChanged(auth, async user => {
  if (user) {
    await ensureUserDoc(user);
    await syncCreditsFromFirestore(user.uid);
    showApp();
  } else {
    showWall();
  }
});

// ── User document — created on first login ────────────────────────────────────
async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email:     user.email,
      displayName: user.displayName || '',
      credits:   0,
      createdAt: new Date().toISOString()
    });
  }
}

// ── Credits — Firestore is source of truth, localStorage is cache ─────────────
async function syncCreditsFromFirestore(uid) {
  const ref  = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const credits = snap.data().credits || 0;
    localStorage.setItem('xroads_credits', credits);
    if (typeof updateCreditsUI === 'function') updateCreditsUI();
  }
}

export async function addCreditsFirestore(n) {
  const user = auth.currentUser;
  if (!user) return;
  await updateDoc(doc(db, 'users', user.uid), { credits: increment(n) });
  await syncCreditsFromFirestore(user.uid);
}

export async function spendCreditsFirestore(n) {
  const user = auth.currentUser;
  if (!user) return false;
  const snap = await getDoc(doc(db, 'users', user.uid));
  const current = snap.data().credits || 0;
  if (current < n) return false;
  await updateDoc(doc(db, 'users', user.uid), { credits: increment(-n) });
  await syncCreditsFromFirestore(user.uid);
  return true;
}

// ── Save/load charts ──────────────────────────────────────────────────────────
export async function saveChart(chartData) {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, 'users', user.uid, 'charts', chartData.id || Date.now().toString());
  await setDoc(ref, { ...chartData, savedAt: new Date().toISOString() });
}

// ── Sign-in handlers ──────────────────────────────────────────────────────────
document.getElementById('googleSignInBtn')?.addEventListener('click', async () => {
  try { await signInWithPopup(auth, googleProvider); }
  catch(e) { showAuthError(e.message); }
});

document.getElementById('emailSignInBtn')?.addEventListener('click', async () => {
  const email = document.getElementById('authEmail').value.trim();
  const pass  = document.getElementById('authPassword').value;
  try { await signInWithEmailAndPassword(auth, email, pass); }
  catch(e) { showAuthError(e.message); }
});

document.getElementById('emailSignUpBtn')?.addEventListener('click', async () => {
  const email = document.getElementById('authEmail').value.trim();
  const pass  = document.getElementById('authPassword').value;
  try { await createUserWithEmailAndPassword(auth, email, pass); }
  catch(e) { showAuthError(e.message); }
});

document.getElementById('signOutBtn')?.addEventListener('click', () => signOut(auth));

function showAuthError(msg) {
  const el = document.getElementById('authError');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

export { auth, db };
