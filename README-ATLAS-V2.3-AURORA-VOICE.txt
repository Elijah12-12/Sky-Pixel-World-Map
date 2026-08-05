SKY PIXEL ATLAS v2.3 — AURORA VOICE MODE

This update adds voice input and spoken Atlas replies without removing any existing Atlas tools, map controls, buttons, overlays, weather, places, nearby, teleport, or chat history features.

NEW FILE
- sky-pixel-ai-voice.js

UPDATED FILES
- index.html
- sky-pixel-ai-ui.js
- sky-pixel-ai.css

INSTALLATION
1. Upload/replace the files from this package in the same map directory.
2. Preserve the tools, database, and atlas-worker directories where applicable.
3. Keep your working Worker URL in atlas-config.js.
4. Hard-refresh with Ctrl+F5.

VOICE USE
- Open Atlas and click the microphone button beside the message field.
- Allow microphone permission when prompted.
- Speak naturally. When you pause, Atlas submits the transcript.
- Atlas displays the normal chat answer and optionally reads it aloud.
- Use the speaker button in the Atlas header to toggle spoken replies.
- Use Stop speaking inside the voice overlay to silence the current reply.

BROWSER SUPPORT
- Voice recognition works best in current Google Chrome or Microsoft Edge.
- Speech recognition may use the browser vendor's online speech service.
- Firefox does not consistently support browser SpeechRecognition.
- Speech synthesis support is broader and may work even when recognition does not.
- Microphone access normally requires HTTPS or localhost. GitHub Pages is HTTPS.

PRIVACY
The browser handles microphone recognition. Atlas sends only the recognized text to the existing OpenRouter Worker; this package does not upload raw microphone audio itself.

WORKER
No Worker redeployment is required solely for voice mode. The included Worker folder is retained because it contains the current v2.2 tool definitions.
