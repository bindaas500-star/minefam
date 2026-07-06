import { auth, db, onAuthStateChanged, ref, get } from "./firebase-config.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  const snap = await get(ref(db, `users/${user.uid}`));
  const data = snap.val();
  document.getElementById("coinBalance").textContent = Math.floor(data.coins || 0);

  const avatarEl = document.getElementById("topAvatar");
  if (avatarEl) {
    if (data.photoURL) {
      avatarEl.innerHTML = `<img src="${data.photoURL}" alt="profile">`;
    } else {
      avatarEl.textContent = (data.displayName || "M")[0].toUpperCase();
    }
  }

  if (data.isVIP) {
    document.getElementById("vipRoomItem").style.display = "flex";
  }
});
