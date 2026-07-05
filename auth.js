import {
  auth, db,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  ref, get, set, update, push
} from "./firebase-config.js";

let mode = "login"; // or "signup"

const form = document.getElementById("authForm");
const formTitle = document.getElementById("formTitle");
const formSub = document.getElementById("formSub");
const nameField = document.getElementById("nameField");
const refField = document.getElementById("refField");
const submitBtn = document.getElementById("submitBtn");
const switchText = document.getElementById("switchText");
const switchLink = document.getElementById("switchLink");
const errorMsg = document.getElementById("errorMsg");

// If already logged in, skip straight to dashboard
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "dashboard.html";
});

switchLink.addEventListener("click", () => {
  mode = mode === "login" ? "signup" : "login";
  const isSignup = mode === "signup";
  formTitle.textContent = isSignup ? "Create your account" : "Welcome back";
  formSub.textContent = isSignup
    ? "Set up your wallet and start mining."
    : "Log in to keep mining and earning.";
  nameField.style.display = isSignup ? "block" : "none";
  refField.style.display = isSignup ? "block" : "none";
  submitBtn.textContent = isSignup ? "Create Account" : "Log In";
  switchText.textContent = isSignup ? "Already have an account?" : "Don't have an account?";
  switchLink.textContent = isSignup ? "Log in" : "Sign up";
  errorMsg.textContent = "";
});

function generateReferralCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function findUidByReferralCode(code) {
  const snap = await get(ref(db, `referralCodes/${code.toUpperCase()}`));
  return snap.exists() ? snap.val() : null;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";
  submitBtn.disabled = true;

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    if (mode === "signup") {
      const name = document.getElementById("displayName").value.trim() || "Miner";
      const refCodeInput = document.getElementById("refCode").value.trim();

      let referredBy = null;
      if (refCodeInput) {
        referredBy = await findUidByReferralCode(refCodeInput);
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });

      const myReferralCode = generateReferralCode();

      await set(ref(db, `users/${cred.user.uid}`), {
        displayName: name,
        email,
        coins: 100, // welcome bonus
        minerLevel: 1,
        lastClaim: Date.now(),
        referralCode: myReferralCode,
        referredBy: referredBy,
        familyId: null,
        createdAt: Date.now()
      });

      // map referral code -> uid for lookups
      await set(ref(db, `referralCodes/${myReferralCode}`), cred.user.uid);

      // reward the referrer
      if (referredBy) {
        const referrerSnap = await get(ref(db, `users/${referredBy}/coins`));
        const currentCoins = referrerSnap.exists() ? referrerSnap.val() : 0;
        await set(ref(db, `users/${referredBy}/coins`), currentCoins + 50);

        await push(ref(db, `users/${referredBy}/referrals`), {
          newUserId: cred.user.uid,
          newUserName: name,
          reward: 50,
          createdAt: Date.now()
        });
      }
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    window.location.href = "dashboard.html";
  } catch (err) {
    errorMsg.textContent = humanizeError(err.code);
  } finally {
    submitBtn.disabled = false;
  }
});

function humanizeError(code) {
  const map = {
    "auth/email-already-in-use": "Ye email pehle se registered hai.",
    "auth/invalid-email": "Email sahi format mein nahi hai.",
    "auth/weak-password": "Password kam az kam 6 characters ka ho.",
    "auth/user-not-found": "Account nahi mila, sign up karen.",
    "auth/wrong-password": "Password ghalat hai.",
    "auth/invalid-credential": "Email ya password ghalat hai."
  };
  return map[code] || "Kuch masla hua, dobara koshish karen.";
}
