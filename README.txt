Sky Pixel Atlas v2.7 — Mobile UX

Desktop:
- Existing desktop Atlas and Tools side drawers remain unchanged.

Mobile (720px and below):
- AI Atlas opens as a full-width bottom sheet.
- Sky Pixel Tools opens as a matching full-width bottom sheet.
- Both use approximately 84% of the viewport height.
- Drag-handle styling, sticky headers, safe-area padding, and larger tap targets.
- Atlas composer remains visible above the phone keyboard.
- Suggested prompts become a horizontal swipe carousel.
- Map interaction is disabled while either sheet is open.
- Search toolbar is optimized for small screens.
- Search keyboard dismisses after pressing Search.
- iOS zoom is prevented by using 16px text inputs.

Replace:
index.html
sky-pixel-main.js
sky-pixel-custom.css
sky-pixel-ai-ui.js
sky-pixel-ai.css

No Cloudflare Worker redeploy is required.
Use Ctrl+F5 or clear the mobile browser cache after replacing files.
