# A11y Autopilot Extension (MVP)

Chrome MV3 extension that overlays any site with a command palette + optional voice control, enabling click, focus, type, and scroll without precise pointer control.

## Load Unpacked Extension
1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select `apps/extension`

## Commands
- `click <target>` / `open <target>`
- `scroll down|up [amount]`
- `go back`, `reload`
- `open <number>`
- `agent mode on|off`
- `summarize`, `search ...`
- `stop` / `cancel` / `pause`

## Agent Mode Examples
- “Click search and type 5 years.”
- “Scroll down and find the keyword domain. Stop when you see it.”
- “Scroll down until I say stop.”
- “Look for the keyword pricing.”
- “Explain this article.”

## Settings
Open Extension Options to configure:
- Voice control enable/disable
- Confirm dangerous actions
- Demo metrics display
- Optional backend URL (OpenAI disambiguation)

## OpenAI (Optional)
1. `cd apps/backend`
2. Use Node.js 20+
3. `npm install`
4. Create `.env.local` from `apps/backend/.env.example` and set `OPENAI_API_KEY` (or `OPENAI_KEY`)
5. `npm run dev`
6. Open Extension Options and set Backend URL to `http://localhost:8787/resolve`

## Demo
See `docs/demo.md`.
