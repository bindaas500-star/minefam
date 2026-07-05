import {
  auth, db,
  onAuthStateChanged,
  ref, get, runTransaction
} from "./firebase-config.js";

// Weighted rewards: smaller amounts are more common
const REWARD_POOL = [10, 10, 15, 20, 25, 30, 50, 100];

let currentUser = null;
let hasOpenedToday = false;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  await loadUser();
  attachBoxHandlers();
});

async function loadUser() {
  const snap = await get(ref(db, `users/${currentUser.uid}`));
  const data = snap.val();
  document.getElementById("coinBalance").textContent = Math.floor(data.coins || 0);

  hasOpenedToday = data.lastMysteryDate === todayStr();
  updateStatus();
}

function updateStatus() {
  const statusEl = document.getElementById("boxStatus");
  const boxes = document.querySelectorAll(".mystery-box");
  if (hasOpenedToday) {
    statusEl.textContent = "Aaj ka box khul chuka hai. Kal wapis ayen!";
    boxes.forEach((b) => b.classList.add("disabled"));
  } else {
    statusEl.textContent = "Ek box choose karen, roz ek free box milta hai";
  }
}

function attachBoxHandlers() {
  document.querySelectorAll(".mystery-box").forEach((box) => {
    box.addEventListener("click", () => openBox(box));
  });
}

async function openBox(boxEl) {
  if (hasOpenedToday) return;

  document.querySelectorAll(".mystery-box").forEach((b) => b.classList.add("disabled"));
  boxEl.classList.add("opened");
  boxEl.textContent = "✨";

  const reward = REWARD_POOL[Math.floor(Math.random() * REWARD_POOL.length)];
  const userRef = ref(db, `users/${currentUser.uid}`);
  const today = todayStr();

  try {
    const result = await runTransaction(userRef, (data) => {
      if (!data) return data;
      if (data.lastMysteryDate === today) return data;
      data.coins = (data.coins || 0) + reward;
      data.lastMysteryDate = today;
      return data;
    });

    setTimeout(() => {
      if (result.committed) {
        const newData = result.snapshot.val();
        document.getElementById("coinBalance").textContent = Math.floor(newData.coins || 0);
        document.getElementById("rewardAmount").textContent = `+${reward} 🪙`;
        document.getElementById("rewardCard").style.display = "block";
        hasOpenedToday = true;
        showToast(`Box khula! +${reward} 🪙`);
      }
      updateStatus();
    }, 600);
  } catch (e) {
    showToast("Kuch masla hua, try again.");
  }
}

function showToast(message) {
  const host = document.getElementById("toastHost");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}
