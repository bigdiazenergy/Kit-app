# KIT – Keep In Touch

A mobile-first app to help you stay connected with the people who matter most.

## Features
- 📱 Import contacts (Android Chrome)
- ⭐ Tier contacts by importance (Inner Circle / Close / Casual)
- ✨ AI-crafted check-in messages
- 💬 SMS deep-link (works on iOS & Android)
- 🌸 Cycle Care reminders
- ↩ Log replies & conversation history
- ← Swipe to edit or delete contacts

---

## Deploy to GitHub Pages (step-by-step)

### 1. Create a GitHub repo
- Go to [github.com](https://github.com) → click **New repository**
- Name it `kit-app` (or anything you like)
- Set it to **Public**
- Do NOT initialize with a README (you already have one)
- Click **Create repository**

### 2. Edit two files with your GitHub username

**`package.json`** — change this line:
```
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/kit-app",
```
to your actual username, e.g.:
```
"homepage": "https://johndoe.github.io/kit-app",
```

**`vite.config.js`** — change this line:
```js
base: '/kit-app/',
```
to match your repo name if you named it something different.

### 3. Push the code to GitHub

Open a terminal in the `kit-app` folder and run:

```bash
git init
git add .
git commit -m "Initial KIT app"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/kit-app.git
git push -u origin main
```

### 4. Enable GitHub Pages

- Go to your repo on GitHub
- Click **Settings** → **Pages** (left sidebar)
- Under **Source**, select **GitHub Actions**
- Click **Save**

### 5. Watch it deploy

- Click the **Actions** tab in your repo
- You'll see a workflow running called "Deploy KIT to GitHub Pages"
- Once it turns green ✅, your app is live at:

```
https://YOUR_GITHUB_USERNAME.github.io/kit-app/
```

---

## Add to your Android home screen (PWA)

1. Open the URL above in **Chrome on Android**
2. Tap the **⋮ menu** → **Add to Home screen**
3. KIT installs like a native app — no app store needed!

## Local development

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`
