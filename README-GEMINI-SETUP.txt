SKY PIXEL ATLAS v2 — GEMINI WEATHER AGENT
============================================

This package replaces Atlas's phrase-by-phrase weather response engine with Gemini 3.6 Flash function calling.

HOW IT WORKS
------------
1. The map sends the user's natural-language question to a Cloudflare Worker.
2. Gemini decides whether to call get_weather, compare_weather, or get_active_place.
3. The browser executes that tool against the existing Sky Pixel city/weather panels.
4. The structured result goes back to Gemini.
5. Gemini writes the final answer.

The Gemini key is never stored in public GitHub Pages files.

REQUIRED SETUP
--------------
A. Deploy the Worker

1. Install Node.js.
2. Open a terminal inside atlas-worker.
3. Run:

   npm install
   npx wrangler login
   npx wrangler secret put GEMINI_API_KEY
   npm run deploy

4. Copy the workers.dev URL printed after deployment.

B. Connect the map

Open atlas-config.js and set:

   endpoint: "https://YOUR-WORKER.workers.dev"

Upload these files beside index.html:
- atlas-config.js
- sky-pixel-ai.js
- sky-pixel-ai-actions.js
- sky-pixel-ai-ui.js
- sky-pixel-ai.css
- index.html

TEST QUESTIONS
--------------
- What's the weather in Harlow?
- Is it going to rain in Harlow on Thursday?
- What's the weather in Harlow vs Octavian?
- Which one is warmer tomorrow?
- What is the weekend outlook there?
- Should I bring a jacket to Harlow Thursday evening?
- Is it a good day for exploring Octavian?

IMPORTANT
---------
The model cannot create missing forecast data. Atlas still depends on the existing city panel exposing readable forecast cards. Gemini removes brittle language parsing, but the underlying weather panel must provide the requested day.

SECURITY
--------
For production, change ALLOWED_ORIGIN in atlas-worker/wrangler.toml from "*" to your exact GitHub Pages origin, for example:
https://elijah12-12.github.io

MODEL
-----
Default: gemini-3.6-flash
You can change GEMINI_MODEL in wrangler.toml.
