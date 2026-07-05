# MineFam ⛏️

Ek mining + family + live-rooms earning app — HiFami se inspired, lekin apna khud ka backend aur logic.

## Features
- **Auth** — email/password signup & login (Firebase Auth)
- **Idle Mining** — miner level upgrade karo, offline bhi coins accumulate hote hen (max 12h tak)
- **Wallet** — coin balance, real-time sync
- **Family & Referral** — apna referral code share karo, family create/join karo, referral se 50 coins bonus
- **Live Rooms** — real-time text chat rooms, active rehne par har 5 min mein +1 coin

## Setup

### 1. Naya Firebase project banayen (already done)
Project `minefam-earn` ban chuka hai. Config already `js/firebase-config.js` mein daal di gayi hai.

### 2. Authentication (already enabled)
Email/Password sign-in method already enable ho chuka hai.

### 3. Realtime Database banayen (isay use karte hen, na ke Firestore, bina billing account ke free hai)
1. Firebase Console -> left menu -> Build > Realtime Database
2. "Create Database" dabayen
3. Location select karen
4. "Start in locked mode" choose karen (hum apni khud ki rules deploy karenge)
5. Database banne ke baad URL dikhega jesa: https://minefam-earn-default-rtdb.firebaseio.com
6. Ye poora URL copy karen aur js/firebase-config.js mein databaseURL field mein paste karen

### 4. Database rules deploy karen
database.rules.json file already is repo mein hai. Firebase Console -> Realtime Database -> Rules tab mein iska poora content paste kar ke Publish dabayen.

### 4. Icons add karen (optional, PWA install ke liye)
`icons/icon-192.png` aur `icons/icon-512.png` add karen (192x192 aur 512x512 px).

## GitHub par publish karna

```bash
git init
git add .
git commit -m "Initial commit - MineFam app"
git branch -M main
git remote add origin https://github.com/<your-username>/minefam.git
git push -u origin main
```

Phir **GitHub Pages** se free host kar sakte hen:
1. Repo -> Settings -> Pages
2. Source: `main` branch, `/ (root)` folder
3. Save -> kuch minutes mein `https://<username>.github.io/minefam/` par live ho jayegi

> Netlify bhi use kar sakte hen (jaisa TaskFlow Earn ke liye kiya), bas naya site banayen taake bandwidth limit alag rahe.

## Android APK banana

Live URL milne ke baad (GitHub Pages ya Netlify):
1. https://www.pwabuilder.com par jayen
2. Apni site ka URL paste karen
3. Manifest already configured hai (`manifest.json`) — Android package generate karen
4. APK download karen

## Folder Structure
```
minefam/
├── index.html          # Login/signup
├── dashboard.html       # Wallet + mining
├── family.html          # Family + referral
├── rooms.html            # Rooms list
├── room.html             # Individual chat room
├── css/style.css
├── js/
│   ├── firebase-config.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── family.js
│   ├── rooms.js
│   └── room.js
├── manifest.json
└── firestore.rules
```

## Next steps / ideas
- Withdrawal system + admin panel (jaisa TaskFlow Earn mein hai)
- "Steal coins" PvP feature rooms ke andar
- Family battles / group goals
- Daily streak bonus
- Cloud Functions se coin logic ko server-side move karna (production ke liye zyada secure)
