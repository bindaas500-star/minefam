import {
  auth, db,
  onAuthStateChanged, signOut,
  ref, get, update, runTransaction
} from "./firebase-config.js";

// Rate per miner level: coins earned per hour
const LEVEL_RATE = { 1: 10, 2: 22, 3: 40, 4: 65, 5: 100 };
const LEVEL_COST = { 2: 200, 3: 600, 4: 1500, 5: 3500 };
const MAX_LEVEL = 5;
const MAX_ACCRUAL_HOURS = 12; // cap offline earnings at 12h

let currentUser = null;
let userData = null;

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
  userData = snap.val();

  document.getElementById("userName").textContent = userData.displayName || "Miner";
  renderCoins(userData.coins || 0);
  renderMinerInfo();
  computeClaimable();
}

function renderCoins(coins) {
  document.getElementById("coinBalance").textContent = Math.floor(coins);
  document.getElementById("walletCoins").textContent = `${Math.floor(coins)} 🪙`;
}

function renderMinerInfo() {
  const level = userData.minerLevel || 1;
  document.getElementById("minerLevel").textContent = level;
  document.getElementById("miningRate").textContent = `Earning ${LEVEL_RATE[level]} coins/hour idle`;

  if (level >= MAX_LEVEL) {
    document.getElementById("upgradeBtn").textContent = "Max Level Reached";
    document.getElementById("upgradeBtn").disabled = true;
  } else {
    document.getElementById("nextLevel").textContent = level + 1;
    document.getElementById("upgradeCost").textContent = LEVEL_COST[level + 1];
  }
}

function computeClaimable() {
  const level = userData.minerLevel || 1;
  const rate = LEVEL_RATE[level];
  const lastClaim = userData.lastClaim || Date.now();
  const hoursElapsed = Math.min((Date.now() - lastClaim) / 3600000, MAX_ACCRUAL_HOURS);
  const claimable = Math.floor(hoursElapsed * rate);
  document.getElementById("claimableAmount").textContent = `+${claimable} 🪙`;
  document.getElementById("claimBtn").disabled = claimable <= 0;
}

document.getElementById("claimBtn").addEventListener("click", async () => {
  const userRef = ref(db, `users/${currentUser.uid}`);
  try {
    const result = await runTransaction(userRef, (data) => {
      if (!data) return data;
      const level = data.minerLevel || 1;
      const rate = LEVEL_RATE[level];
      const lastClaim = data.lastClaim || Date.now();
      const hoursElapsed = Math.min((Date.now() - lastClaim) / 3600000, MAX_ACCRUAL_HOURS);
      const claimable = Math.floor(hoursElapsed * rate);
      if (claimable <= 0) return data; // abort, nothing to claim
      data.coins = (data.coins || 0) + claimable;
      data.lastClaim = Date.now();
      return data;
    });

    if (result.committed) {
      const newData = result.snapshot.val();
      const claimed = newData.coins - (userData.coins || 0);
      if (claimed > 0) showToast(`Claimed +${claimed} coins! 🎉`);
      await loadUser();
    }
  } catch (e) {
    showToast("Claim failed, try again.");
  }
});

document.getElementById("upgradeBtn").addEventListener("click", async () => {
  const userRef = ref(db, `users/${currentUser.uid}`);
  const level = userData.minerLevel || 1;
  if (level >= MAX_LEVEL) return;
  const cost = LEVEL_COST[level + 1];

  try {
    const result = await runTransaction(userRef, (data) => {
      if (!data) return data;
      if ((data.coins || 0) < cost) return; // abort transaction
      data.coins -= cost;
      data.minerLevel = (data.minerLevel || 1) + 1;
      return data;
    });

    if (!result.committed) {
      showToast("Coins kam hen upgrade ke liye.");
    } else {
      showToast(`Upgraded to Level ${level + 1}! ⛏️`);
      await loadUser();
    }
  } catch (e) {
    showToast("Upgrade failed, try again.");
  }
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

// refresh claimable amount every 30s while user stays on page
setInterval(() => {
  if (userData) computeClaimable();
}, 30000);
