import {
  auth, db,
  onAuthStateChanged,
  ref, get, runTransaction
} from "./firebase-config.js";

// 8 segments around the wheel, clockwise starting from top (12 o'clock)
const SEGMENTS = [10, 25, 5, 50, 15, 100, 5, 20];
const SEGMENT_COLORS = ["#f2b705", "#8a6c1f", "#f2b705", "#2fd3c7", "#f2b705", "#8a6c1f", "#f2b705", "#2fd3c7"];
const SEGMENT_ANGLE = 360 / SEGMENTS.length;

let currentUser = null;
let hasSpunToday = false;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  drawWheel();
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

  hasSpunToday = data.lastSpinDate === todayStr();
  updateStatus();
}

function updateStatus() {
  const statusEl = document.getElementById("spinStatus");
  const btn = document.getElementById("spinBtn");
  if (hasSpunToday) {
    statusEl.textContent = "Aaj ka spin ho chuka hai. Kal wapis ayen!";
    btn.disabled = true;
    btn.textContent = "Come back tomorrow";
  } else {
    statusEl.textContent = "Roz ek free spin milta hai";
    btn.disabled = false;
    btn.textContent = "Spin Now";
  }
}

function drawWheel() {
  const wheel = document.getElementById("wheel");

  // Build conic-gradient background from segment colors
  const stops = SEGMENT_COLORS.map((color, i) => {
    const start = i * SEGMENT_ANGLE;
    const end = (i + 1) * SEGMENT_ANGLE;
    return `${color} ${start}deg ${end}deg`;
  }).join(", ");
  wheel.style.background = `conic-gradient(${stops})`;

  // Place reward labels around the wheel
  const size = 280;
  const center = size / 2;
  const radius = 95;

  SEGMENTS.forEach((reward, i) => {
    const angleDeg = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const angleRad = (angleDeg - 90) * (Math.PI / 180); // -90 to start from top
    const x = center + radius * Math.cos(angleRad);
    const y = center + radius * Math.sin(angleRad);

    const label = document.createElement("div");
    label.textContent = reward;
    label.style.position = "absolute";
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
    label.style.transform = "translate(-50%, -50%)";
    label.style.color = "#0f1113";
    label.style.fontWeight = "700";
    label.style.fontSize = "14px";
    label.style.fontFamily = "'Space Grotesk', sans-serif";
    label.style.zIndex = "2";
    wheel.appendChild(label);
  });
}

document.getElementById("spinBtn").addEventListener("click", async () => {
  if (hasSpunToday) return;
  const btn = document.getElementById("spinBtn");
  btn.disabled = true;

  const winningIndex = Math.floor(Math.random() * SEGMENTS.length);
  const reward = SEGMENTS[winningIndex];

  // Rotate so the winning segment lands under the top pointer.
  // Add multiple full spins for effect, and land on the center of the winning segment.
  const targetAngle = 360 * 5 - (winningIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);
  const wheel = document.getElementById("wheel");
  wheel.style.transform = `rotate(${targetAngle}deg)`;

  const userRef = ref(db, `users/${currentUser.uid}`);
  const today = todayStr();

  try {
    const result = await runTransaction(userRef, (data) => {
      if (!data) return data;
      if (data.lastSpinDate === today) return data; // already spun, abort logically
      data.coins = (data.coins || 0) + reward;
      data.lastSpinDate = today;
      return data;
    });

    setTimeout(async () => {
      if (result.committed) {
        const newData = result.snapshot.val();
        document.getElementById("coinBalance").textContent = Math.floor(newData.coins || 0);
        showToast(`Mubarak ho! +${reward} 🪙`);
        hasSpunToday = true;
      }
      updateStatus();
    }, 4200); // wait for CSS spin animation to finish
  } catch (e) {
    btn.disabled = false;
    showToast("Spin failed, try again.");
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
