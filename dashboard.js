import {
  auth, db,
  onAuthStateChanged, signOut,
  ref, get, set, update, runTransaction
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

  if (!snap.exists()) {
    function generateReferralCode() {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      return code;
    }
    const freshProfile = {
      displayName: currentUser.displayName || "Miner",
      email: currentUser.email || "",
      coins: 100,
      minerLevel: 1,
      lastClaim: Date.now(),
      referralCode: generateReferralCode(),
      referredBy: null,
      familyId: null,
      createdAt: Date.now()
    };
    await set(ref(db, `users/${currentUser.uid}`), freshProfile);
    await set(ref(db, `referralCodes/${freshProfile.referralCode}`), currentUser.uid);
    showToast("Profile restore ho gaya, welcome bonus mil gaya! 🎉");
  }

  const freshSnap = await get(ref(db, `users/${currentUser.uid}`));
  userData = freshSnap.val();

  document.getElementById("userName").textContent = userData.displayName || "Miner";
  document.getElementById("userName").innerHTML = (userData.displayName || "Miner") + (userData.isVIP ? ' <span class="vip-badge">👑</span>' : "");
  renderCoins(userData.coins || 0);
  renderMinerInfo();
  computeClaimable();
  await handleDailyStreak();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function handleDailyStreak() {
  const userRef = ref(db, `users/${currentUser.uid}`);
  const today = todayStr();

  if (userData.lastLoginDate === today) {
    renderStreak(userData.loginStreak || 1);
    return; // already handled today
  }

  const result = await runTransaction(userRef, (data) => {
    if (!data) return data;
    const t = todayStr();
    if (data.lastLoginDate === t) return data; // race guard

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let newStreak = 1;
    if (data.lastLoginDate === yesterday) {
      newStreak = ((data.loginStreak || 0) % 7) + 1;
    }
    const bonus = newStreak * 5;

    data.loginStreak = newStreak;
    data.lastLoginDate = t;
    data.coins = (data.coins || 0) + bonus;
    return data;
  });

  if (result.committed) {
    const newData = result.snapshot.val();
    userData = newData;
    renderCoins(newData.coins || 0);
    renderStreak(newData.loginStreak || 1);
    const bonus = (newData.loginStreak || 1) * 5;
    showToast(`Day ${newData.loginStreak} streak! +${bonus} 🪙`);
  }
}

function renderStreak(streak) {
  document.getElementById("streakCount").textContent = `Day ${streak}`;
  const daysEl = document.getElementById("streakDays");
  daysEl.innerHTML = "";
  for (let i = 1; i <= 7; i++) {
    const d = document.createElement("div");
    d.className = "streak-day" + (i < streak ? " done" : i === streak ? " today" : "");
    d.textContent = i;
    daysEl.appendChild(d);
  }
}

function renderCoins(coins) {
  document.getElementById("coinBalance").textContent = Math.floor(coins);
  document.getElementById("walletCoins").textContent = `${Math.floor(coins)} 🪙`;
}

function getEffectiveRate() {
  const level = userData.minerLevel || 1;
  const base = LEVEL_RATE[level];
  return userData.isVIP ? base * 2 : base;
}

function renderMinerInfo() {
  const level = userData.minerLevel || 1;
  document.getElementById("minerLevel").textContent = level;
  const rate = getEffectiveRate();
  document.getElementById("miningRate").textContent = userData.isVIP
    ? `Earning ${rate} coins/hour idle (👑 VIP 2x)`
    : `Earning ${rate} coins/hour idle`;

  if (level >= MAX_LEVEL) {
    document.getElementById("upgradeBtn").textContent = "Max Level Reached";
    document.getElementById("upgradeBtn").disabled = true;
  } else {
    document.getElementById("nextLevel").textContent = level + 1;
    document.getElementById("upgradeCost").textContent = LEVEL_COST[level + 1];
  }
}

function computeClaimable() {
  const rate = getEffectiveRate();
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
      let rate = LEVEL_RATE[level];
      if (data.isVIP) rate *= 2;
      const lastClaim = data.lastClaim || Date.now();
      const hoursElapsed = Math.min((Date.now() - lastClaim) / 3600000, MAX_ACCRUAL_HOURS);
      const claimable = Math.floor(hoursElapsed * rate);
      if (claimable <= 0) return data;
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
      if ((data.coins || 0) < cost) return;
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

setInterval(() => {
  if (userData) computeClaimable();
}, 30000);
