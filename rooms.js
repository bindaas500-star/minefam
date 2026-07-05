import { auth, db, onAuthStateChanged, ref, get } from "./firebase-config.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  const snap = await get(ref(db, `users/${user.uid}/coins`));
  document.getElementById("coinBalance").textContent = Math.floor(snap.val() || 0);
});
