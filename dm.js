import {
  auth, db,
  onAuthStateChanged,
  ref, get, push, onValue,
  query, orderByChild, limitToLast
} from "./firebase-config.js";

const params = new URLSearchParams(window.location.search);
const targetUid = params.get("uid");
const targetName = params.get("name") || "Miner";

let currentUser = null;
let myName = "Miner";
let chatId = null;

document.getElementById("dmTitle").textContent = targetName;

if (!targetUid) {
  document.getElementById("chatMessages").innerHTML =
    '<div class="empty-state">Koi user select nahi hua. Family page se wapis jayen.</div>';
} else {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    currentUser = user;

    const snap = await get(ref(db, `users/${user.uid}`));
    myName = snap.val().displayName || "Miner";

    chatId = [user.uid, targetUid].sort().join("_");

    listenToMessages();
  });
}

function listenToMessages() {
  const msgsQ = query(
    ref(db, `messages/${chatId}`),
    orderByChild("createdAt"),
    limitToLast(100)
  );

  onValue(msgsQ, (snap) => {
    const container = document.getElementById("chatMessages");
    if (!snap.exists()) {
      container.innerHTML = '<div class="empty-state">Koi message nahi. Kuch likh kar shuru karen!</div>';
      return;
    }
    container.innerHTML = "";
    snap.forEach((childSnap) => {
      const m = childSnap.val();
      const isMine = m.uid === currentUser.uid;
      const bubble = document.createElement("div");
      bubble.className = `msg-bubble ${isMine ? "mine" : ""}`;
      bubble.innerHTML = escapeHtml(m.text);
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
  if (!chatId) return;
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  await push(ref(db, `messages/${chatId}`), {
    uid: currentUser.uid,
    senderName: myName,
    text,
    createdAt: Date.now()
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
