SKY PIXEL ATLAS v2 — OPENROUTER SETUP
======================================

WHAT THIS PACKAGE DOES
----------------------
Atlas now uses a secure Cloudflare Worker and OpenRouter tool calling. The default model is OpenRouter's free router: openrouter/free. OpenRouter selects a currently available free model that supports the requested features, including tool calling when available.

The OpenRouter key is NEVER placed in public GitHub Pages files.

STEP 1 — CREATE AN OPENROUTER KEY
---------------------------------
1. Sign in at OpenRouter.
2. Open the API Keys page.
3. Create a key.
4. Copy the key. It normally begins with sk-or-v1-.
5. Do not upload or paste the key into GitHub.

STEP 2 — INSTALL NODE.JS
------------------------
Install the current Node.js LTS release. Confirm in Command Prompt:

node --version
npm --version

STEP 3 — OPEN COMMAND PROMPT IN atlas-worker
---------------------------------------------
Open this package's atlas-worker folder in File Explorer. Click the address bar, type cmd, and press Enter.

STEP 4 — INSTALL AND SIGN IN
----------------------------
Run:

npm install
npx wrangler login

Approve Cloudflare access in your browser.

STEP 5 — STORE THE OPENROUTER KEY
---------------------------------
Run:

npx wrangler secret put OPENROUTER_API_KEY

Paste your OpenRouter key when prompted, then press Enter. The key may remain invisible while pasted; that is normal.

STEP 6 — DEPLOY
---------------
Run:

npm run deploy

Copy the workers.dev URL printed at the end.

STEP 7 — CONNECT YOUR MAP
-------------------------
Open atlas-config.js and set endpoint to the deployed Worker URL:

window.SKY_PIXEL_ATLAS_CONFIG = {
  endpoint: 'https://sky-pixel-atlas-openrouter.YOUR-SUBDOMAIN.workers.dev',
  model: 'openrouter/free',
  requestTimeoutMs: 60000,
  headers: {},
  localFallback: true
};

Upload atlas-config.js and the other Atlas files beside index.html on GitHub Pages. Hard refresh with Ctrl+F5.

STEP 8 — TEST
-------------
Ask:

What's the weather in Harlow?
Will it rain there on Thursday?
Compare Harlow and Octavian tomorrow.
Which city looks better for exploring this weekend?

IMPORTANT NOTES
---------------
• Free model availability and rate limits can change.
• A free model may sometimes be busy or temporarily unavailable.
• The map's weather facts still come from your own weather panels. The model interprets the question, chooses tools, and explains the returned data.
• To choose a specific model later, replace OPENROUTER_MODEL in atlas-worker/wrangler.toml and redeploy.
• Keep ALLOWED_ORIGIN restricted to your real GitHub Pages origin before public launch.
