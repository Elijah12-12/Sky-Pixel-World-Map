SKY PIXEL ATLAS v2.1 — WORLD TOOLS

INCLUDED TOOLS
- Weather and weather comparisons
- Local Atlas search
- Verified place/country information
- Map control (open a place through the existing Sky Pixel search/panel)
- Nearby places by stored X/Z block distance
- Teleport path planning through confirmed links

NOT INCLUDED
- Road routing
- Internet/Exa search

INSTALL FRONTEND
Upload these beside your live map index.html, preserving folders:
- index.html
- atlas-config.js
- atlas-db.js
- sky-pixel-ai-actions.js
- sky-pixel-ai.js
- sky-pixel-ai-ui.js
- sky-pixel-ai.css
- tools/atlas-tools.js
- database/atlas-db.json (source/reference; runtime uses atlas-db.js for file:// compatibility)

WORKER UPDATE
Replace E:\Atlas\atlas-worker\src\index.js and wrangler.toml with the included atlas-worker files.
Then run: npx wrangler deploy
Your existing OPENROUTER_API_KEY secret remains attached.

DATABASE
The database is deliberately conservative. It contains confirmed names/facts from the supplied Sky Pixel project context. Places without confirmed coordinates are searchable but cannot be used for distance-based nearby results until coordinates are added.
Edit database/atlas-db.json as the source of truth, then mirror changes into atlas-db.js (window.SKY_PIXEL_ATLAS_DB = ...).

TEST QUESTIONS
- Tell me about Harlow.
- Which country is Harlow in?
- Show me Mount Noraker.
- What is near Harlow?
- Find all capitals.
- What is the teleport path from Octavian to Harlow?
- What is the weather in Harlow Thursday?

IMPORTANT
The free OpenRouter model may occasionally choose tools imperfectly or hit free limits. Tool results remain deterministic and Atlas is instructed not to invent missing facts.
