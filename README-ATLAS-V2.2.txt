SKY PIXEL ATLAS v2.2 — NON-DESTRUCTIVE CONTROL ADAPTER

WHAT THIS UPDATE DOES
- Keeps every existing Atlas feature: OpenRouter, weather, search, places, map opening, nearby, and chat history.
- Keeps every existing Sky Pixel button, panel, toggle, overlay, and manual control.
- Adds an Atlas adapter that operates the existing Teleport Network UI rather than duplicating its route graph.
- Adds AI control for teleport layers/focus plus Night Mode, Political Map, Cloud Layer, Teleport panel, and Map Brightness.

MAP FILES TO REPLACE / UPLOAD
- index.html
- atlas-config.js (already contains your Worker URL)
- atlas-db.js
- sky-pixel-ai-actions.js
- sky-pixel-ai.js
- sky-pixel-ai-ui.js
- sky-pixel-ai.css
- tools/atlas-tools.js

WORKER FILE TO REPLACE
- atlas-worker/src/index.js
Then run: npx wrangler deploy
Your existing OPENROUTER_API_KEY secret remains attached.

TESTS
- Show the teleport route from Octavian to Elowah.
- Can I teleport directly from Harlow to Alouette?
- Open the teleport network and focus on Razalia.
- Show direct and layover routes, but hide third layovers.
- Hide ATL and XXL towers.
- Turn on Night Mode.
- Set map brightness to 65%.
- Turn on the Political Map.

IMPORTANT
Atlas clicks and changes the same visible controls that users can still operate manually. Nothing in the existing map UI is removed.
