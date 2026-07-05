import {
  auth, db,
  onAuthStateChanged,
  ref, get, set, remove, push, onValue,
  query, orderByChild, limitToLast
} from "./firebase-config.js";

let currentUser = null;
let myName = "Miner";
let myIsVIP = false;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;

  const snap = await get(ref(db, `users/${user.uid}`));
  const data = snap.val();
  myName = data.displayName || "Miner";
  myIsVIP = !!data.isVIP;
  document.getElementById("coinBalance").textContent = Math.floor(data.coins || 0);

  listenToPosts();
});

document.getElementById("postBtn").addEventListener("click", async () => {
  const input = document.getElementById("postInput");
  const text = input.value.trim();
  if (!text) return;

  await push(ref(db, "posts"), {
    uid: currentUser.uid,
    senderName: myName,
    senderIsVIP: myIsVIP,
    text,
    createdAt: Date.now()
  });

  input.value = "";
  showToast("Post ho gaya!");
});

function listenToPosts() {
  const postsQ = query(ref(db, "posts"), orderByChild("createdAt"), limitToLast(50));

  onValue(postsQ, (snap) => {
    const container = document.getElementById("postList");
    if (!snap.exists()) {
      container.innerHTML = '<div class="empty-state">Abhi tak koi post nahi. Sabse pehle aap likhen!</div>';
      return;
    }

    const posts = [];
    snap.forEach((childSnap) => {
      posts.push({ id: childSnap.key, ...childSnap.val() });
    });
    posts.reverse(); // newest first

    container.innerHTML = "";
    posts.forEach((post) => {
      const likeCount = post.likes ? Object.keys(post.likes).length : 0;
      const iLiked = post.likes && post.likes[currentUser.uid];

      const card = document.createElement("div");
      card.className = "post-card";
      card.innerHTML = `
        <div class="post-header">
          <div class="avatar-dot">${(post.senderName || "M")[0].toUpperCase()}</div>
          <div>
            <div style="font-size:14px; font-weight:600;">
              ${escapeHtml(post.senderName || "Miner")}
              ${post.senderIsVIP ? '<span class="vip-badge">👑</span>' : ""}
            </div>
            <div class="post-time">${timeAgo(post.createdAt)}</div>
          </div>
        </div>
        <div class="post-text">${escapeHtml(post.text)}</div>
        <div class="post-footer">
          <button class="like-btn ${iLiked ? "liked" : ""}" data-id="${post.id}">
            ${iLiked ? "❤️" : "🤍"} ${likeCount > 0 ? likeCount : ""}
          </button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll(".like-btn").forEach((btn) => {
      btn.addEventListener("click", () => toggleLike(btn.dataset.id));
    });
  });
}

async function toggleLike(postId) {
  const likeRef = ref(db, `posts/${postId}/likes/${currentUser.uid}`);
  const snap = await get(likeRef);
  if (snap.exists()) {
    await remove(likeRef);
  } else {
    await set(likeRef, true);
  }
}

function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "abhi";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m pehle`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h pehle`;
  const days = Math.floor(hours / 24);
  return `${days}d pehle`;
}

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
