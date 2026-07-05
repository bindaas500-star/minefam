import {
  auth, db,
  onAuthStateChanged,
  ref, get, set, update, push
} from "./firebase-config.js";

let currentUser = null;
let userData = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  await loadUser();
  await loadReferrals();
});

async function loadUser() {
  const snap = await get(ref(db, `users/${currentUser.uid}`));
  userData = snap.val();

  document.getElementById("coinBalance").textContent = Math.floor(userData.coins || 0);
  document.getElementById("myRefCode").textContent = userData.referralCode || "------";

  if (userData.familyId) {
    await loadFamily(userData.familyId);
  } else {
    document.getElementById("noFamilyBlock").style.display = "block";
  }
}

async function loadFamily(familyId) {
  const famSnap = await get(ref(db, `families/${familyId}`));
  if (!famSnap.exists()) return;
  const fam = famSnap.val();

  document.getElementById("familyBlock").style.display = "block";
  document.getElementById("familyNameLabel").textContent = fam.name;

  const memberIds = fam.members ? Object.keys(fam.members) : [];
  document.getElementById("familyMemberCount").textContent = `${memberIds.length} members`;

  const listEl = document.getElementById("memberList");
  listEl.innerHTML = "";

  for (const uid of memberIds) {
    const mSnap = await get(ref(db, `users/${uid}`));
    if (!mSnap.exists()) continue;
    const m = mSnap.val();
    const row = document.createElement("div");
    row.className = "member-row";
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="avatar-dot">${(m.displayName || "M")[0].toUpperCase()}</div>
        <span style="font-size:14px;">${m.displayName || "Miner"}</span>
      </div>
      <span style="font-size:13px; color:var(--gold);">${Math.floor(m.coins || 0)} 🪙</span>
    `;
    listEl.appendChild(row);
  }
}

document.getElementById("createFamilyBtn").addEventListener("click", async () => {
  const name = document.getElementById("familyNameInput").value.trim();
  if (!name) {
    showToast("Family ka naam likhen.");
    return;
  }

  const newFamilyRef = push(ref(db, "families"));
  await set(newFamilyRef, {
    name,
    createdBy: currentUser.uid,
    createdAt: Date.now(),
    members: {
      [currentUser.uid]: true
    }
  });

  await update(ref(db, `users/${currentUser.uid}`), {
    familyId: newFamilyRef.key
  });

  showToast("Family create ho gayi! 🎉");
  document.getElementById("noFamilyBlock").style.display = "none";
  userData.familyId = newFamilyRef.key;
  await loadFamily(newFamilyRef.key);
});

document.getElementById("copyRefBtn").addEventListener("click", () => {
  const code = document.getElementById("myRefCode").textContent;
  navigator.clipboard.writeText(code).then(() => showToast("Code copy ho gaya!"));
});

async function loadReferrals() {
  const snap = await get(ref(db, `users/${currentUser.uid}/referrals`));
  if (!snap.exists()) return;

  const referrals = Object.values(snap.val()).sort((a, b) => b.createdAt - a.createdAt);

  const listEl = document.getElementById("referralList");
  listEl.innerHTML = "";
  referrals.forEach((r) => {
    const row = document.createElement("div");
    row.className = "member-row";
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="avatar-dot">${(r.newUserName || "M")[0].toUpperCase()}</div>
        <span style="font-size:14px;">${r.newUserName || "Miner"}</span>
      </div>
      <span style="font-size:13px; color:var(--gold);">+${r.reward} 🪙</span>
    `;
    listEl.appendChild(row);
  });
}

function showToast(message) {
  const host = document.getElementById("toastHost");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}
