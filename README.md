# 🛡️ CiteKnight

**CiteKnight** empowers Wikipedia editors to uphold community standards through smart, gamified feedback—ensuring every edit aligns with the code of conduct while making the process engaging and rewarding.

---

## 🚨 The Problem It Solves

Editing Wikipedia is powerful—but maintaining **neutrality**, **accuracy**, and **citation integrity** is challenging. Even experienced editors can:

- Miss proper sourcing or overlook NPOV (Neutral Point of View) issues  
- Use biased language or violate tone subtly  
- Forget to ensure edits align with Wikipedia’s code of conduct  

---

## ✅ How CiteKnight Helps

CiteKnight makes Wikipedia editing **safer**, **smarter**, and **more fun** by:

🧠 **Smart Review**  
Automatically scans edits for:
- Citation gaps  
- Biased tone  
- Code of conduct violations  

🎮 **Gamified Experience**  
Earn XP, collect badges, and get real-time feedback—making editing feel like leveling up!

🚦 **Mentorship in Real-Time**  
Provides actionable suggestions that guide editors toward best practices.

🔒 **Improved Edit Quality**  
Reduces risk of reversions or flags by enhancing edit quality before submission.

> It's like having a personal watchdog + Wikipedia mentor—all in one sleek button. 🧙‍♂️📚

---

## 🚀 Getting Started

Follow the steps below to get CiteKnight running locally:

### 1. Backend Setup

```bash
cd backend
npm install
```

Set your environment variable for the OpenAI API Key:

#### On Windows:
```bash
set OPENAI_API_KEY=your_api_key_here
```

#### On macOS/Linux:
```bash
export OPENAI_API_KEY=your_api_key_here
```

Start the server:

```bash
node server.js
```

### 2. Extension Setup

1. Open Chrome (or any Chromium-based browser).
2. Navigate to: `chrome://extensions/`
3. Enable **Developer Mode**.
4. Click **Load unpacked**.
5. Select the `extension` folder from the project directory.

🎉 **You're all set!** CiteKnight is ready to assist your Wikipedia editing adventures.

---

## 📬 Feedback & Contributions

We welcome contributions, feedback, and ideas! Help us make Wikipedia editing better for everyone.
