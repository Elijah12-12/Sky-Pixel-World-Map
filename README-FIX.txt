SKY PIXEL ATLAS — WORKER FETCH/CORS FIX

WHAT WAS WRONG
The original Worker only returned the GitHub Pages origin in Access-Control-Allow-Origin.
When the map was tested from a local HTML file, the browser sent Origin: null. The browser
then blocked the response and Atlas displayed only "Failed to fetch".

FILES TO REPLACE
1. Replace E:\Atlas\atlas-worker\src\index.js with src\index.js from this package.
2. Replace E:\Atlas\atlas-worker\wrangler.toml with wrangler.toml from this package.
3. sky-pixel-ai.js is an optional client improvement. Upload it to GitHub beside index.html
   to get clearer connection errors.
4. atlas-config.js is already configured with your deployed Worker URL.

REDEPLOY
Open Command Prompt in E:\Atlas\atlas-worker and run:

npx wrangler deploy

You do NOT need to add the OpenRouter secret again. The existing Worker secret remains attached.

TEST THE WORKER
Open this URL in a browser:
https://sky-pixel-atlas-openrouter.elijahjones1322.workers.dev

It should now show JSON containing:
"ok": true

TEST THE MAP
Upload sky-pixel-ai.js and atlas-config.js to the live map, replacing the old files.
Then press Ctrl+F5 and ask:
What's the weather in Harlow?

LOCAL TESTING
The corrected Worker allows GitHub Pages, localhost ports 3000/5173/8000,
127.0.0.1 on those ports, and local file Origin: null.
