import {
  auth, db,
  onAuthStateChanged, signOut, updateProfile,
  ref, get, update
} from "./firebase-config.js";

let currentUser = null;
let userData = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  await loadProfile();
});

async function loadProfile() {
  const snap = await get(ref(db, `users/${currentUser.uid}`));
  userData = snap.val();
  if (!userData) return;

  document.getElementById("coinBalance").textContent = Math.floor(userData.coins || 0);
  document.getElementById("nameDisplay").textContent = userData.displayName || "Miner";
  document.getElementById("nameInput").value = userData.displayName || "Miner";
  document.getElementById("emailDisplay").textContent = userData.email || currentUser.email || "";

  if (userData.isVIP) {
    document.getElementById("vipBadgeSpan").innerHTML = '<span class="vip-badge">👑</span>';
  }

  if (userData.photoURL) {
    document.getElementById("avatarLarge").innerHTML = `<img src="${userData.photoURL}" alt="photo">`;
  } else {
    document.getElementById("avatarLarge").textContent = (userData.displayName || "M")[0].toUpperCase();
  }

  document.getElementById("statCoins").textContent = Math.floor(userData.coins || 0);
  document.getElementById("statLevel").textContent = userData.minerLevel || 1;
  document.getElementById("statStreak").textContent = userData.loginStreak || 1;
  document.getElementById("infoRefCode").textContent = userData.referralCode || "------";
  document.getElementById("infoVIP").textContent = userData.isVIP ? "VIP 👑" : "Standard";
  document.getElementById("infoJoined").textContent = formatDate(userData.createdAt);

  const refSnap = await get(ref(db, `users/${currentUser.uid}/referrals`));
  const refCount = refSnap.exists() ? Object.keys(refSnap.val()).length : 0;
  document.getElementById("statReferrals").textContent = refCount;

  if (userData.familyId) {
    const famSnap = await get(ref(db, `families/${userData.familyId}`));
    if (famSnap.exists()) {
      document.getElementById("infoFamily").textContent = famSnap.val().name;
    }
  }
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

document.getElementById("editNameBtn").addEventListener("click", () => {
  document.getElementById("nameEditRow").style.display = "flex";
  document.getElementById("nameEditRow").style.justifyContent = "center";
});

document.getElementById("saveNameBtn").addEventListener("click", async () => {
  const newName = document.getElementById("nameInput").value.trim();
  if (!newName) return;

  await update(ref(db, `users/${currentUser.uid}`), { displayName: newName });
  await updateProfile(currentUser, { displayName: newName });

  document.getElementById("nameDisplay").textContent = newName;
  document.getElementById("nameEditRow").style.display = "none";
  showToast("Naam update ho gaya!");
});

document.getElementById("avatarEditBtn").addEventListener("click", () => {
  document.getElementById("photoInput").click();
});

document.getElementById("photoInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = async () => {
      const size = 160;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

      if (dataUrl.length > 300000) {
        showToast("Photo bohot badi hai, chhoti wali try karen.");
        return;
      }

      await update(ref(db, `users/${currentUser.uid}`), { photoURL: dataUrl });
      document.getElementById("avatarLarge").innerHTML = `<img src="${dataUrl}" alt="photo">`;
      showToast("Photo update ho gayi!");
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

function showToast(message) {
  const host = document.getElementById("toastHost");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}
