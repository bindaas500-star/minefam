import {
  auth, db,
  onAuthStateChanged,
  ref, get, runTransaction
} from "./firebase-config.js";

const VIP_COST = 5000;
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  await loadUser();
});

async function loadUser() {
  const snap = await get(ref(db, `users/${currentUser.uid}`));
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

  const btn = document.getElementById("upgradeVipBtn");
  if (data.isVIP) {
    document.getElementById("vipTitle").textContent = "You're already VIP 👑";
    document.getElementById("vipSub").textContent = "Enjoy your perks!";
    btn.textContent = "Already Active";
    btn.disabled = true;
  } else {
    btn.textContent = `Upgrade for ${VIP_COST} 🪙`;
    btn.disabled = false;
  }
}

document.getElementById("upgradeVipBtn").addEventListener("click", async () => {
  const btn = document.getElementById("upgradeVipBtn");
  btn.disabled = true;
  const userRef = ref(db, `users/${currentUser.uid}`);

  try {
    const result = await runTransaction(userRef, (data) => {
      if (!data) return data;
      if (data.isVIP) return data;
      if ((data.coins || 0) < VIP_COST) return; // abort
      data.coins -= VIP_COST;
      data.isVIP = true;
      data.vipSince = Date.now();
      return data;
    });

    if (!result.committed) {
      showToast("Coins kam hen VIP ke liye.");
      btn.disabled = false;
    } else {
      showToast("Mubarak ho! Ab aap VIP hen 👑");
      await loadUser();
    }
  } catch (e) {
    showToast("Kuch masla hua, try again.");
    btn.disabled = false;
  }
});

function showToast(message) {
  const host = document.getElementById("toastHost");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}
