import {
  auth, db,
  onAuthStateChanged,
  ref, get, update, push, onValue,
  query, orderByChild, limitToLast, increment
} from "./firebase-config.js";

const params = new URLSearchParams(window.location.search);
const roomId = params.get("id") || "general";

const ROOM_NAMES = {
  "general": "General Chat",
  "mining-tips": "Mining Tips",
  "family-lounge": "Family Lounge"
};

let currentUser = null;
let displayName = "Miner";
let activeInterval = null;

document.getElementById("roomTitle").textContent = ROOM_NAMES[roomId] || "Room";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;

  const snap = await get(ref(db, `users/${user.uid}`));
  const data = snap.val();
  displayName = data.displayName || "Miner";
  document.getElementById("coinBalance").textContent = Math.floor(data.coins || 0);

  listenToMessages();
  startActiveEarning();
});

function listenToMessages() {
  const msgsQ = query(
    ref(db, `rooms/${roomId}/messages`),
    orderByChild("createdAt"),
    limitToLast(100)
  );

  onValue(msgsQ, (snap) => {
    const container = document.getElementById("chatMessages");
    if (!snap.exists()) {
      container.innerHTML = '<div class="empty-state">Koi message nahi, sabse pehle aap likhen!</div>';
      return;
    }
    container.innerHTML = "";
    snap.forEach((childSnap) => {
      const m = childSnap.val();
      const isMine = m.uid === currentUser.uid;
      const bubble = document.createElement("div");
      bubble.className = `msg-bubble ${isMine ? "mine" : ""}`;
      bubble.innerHTML = `
        ${isMine ? "" : `<div class="msg-sender">${escapeHtml(m.senderName || "Miner")}</div>`}
        ${escapeHtml(m.text)}
      `;
      container.appendChild(bubble);
    });
    container.scrollTop = container.scrollHeight;
  });
}

document.getElementById("sendBtn").addEventListener("click", sendMessage);
document.getElementById("msgInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  await push(ref(db, `rooms/${roomId}/messages`), {
    uid: currentUser.uid,
    senderName: displayName,
    text,
    createdAt: Date.now()
  });
}

// Reward 1 coin for every 5 minutes actively spent in the room
function startActiveEarning() {
  const REWARD_INTERVAL_MS = 5 * 60 * 1000;
  activeInterval = setInterval(async () => {
    if (document.visibilityState !== "visible") return;
    await update(ref(db), {
      [`users/${currentUser.uid}/coins`]: increment(1)
    });
    const coinEl = document.getElementById("coinBalance");
    coinEl.textContent = parseInt(coinEl.textContent) + 1;
    showToast("+1 🪙 active reward");
  }, REWARD_INTERVAL_MS);
}

window.addEventListener("beforeunload", () => {
  if (activeInterval) clearInterval(activeInterval);
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message) {
  const host = document.getElementById("toastHost");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}
