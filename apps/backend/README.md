# Optional Backend (Gemini AI)

This backend enables AI disambiguation and agent planning using Gemini.
Endpoints:
- `POST /resolve`
- `POST /plan`
- `POST /summarize`

## Setup
1. `cd apps/backend`
2. Use Node.js 20+
3. Install deps: `npm install`
4. Create `.env` from `.env.example` and set `GEMINI_API_KEY`
5. Run: `npm run dev`

Backend runs on `http://localhost:8787`.

## Requests
### `POST /resolve`
Accepts:

```json
{
  "command": "click checkout",
  "url": "https://example.com/cart",
  "candidates": [
    { "id": "el_12", "role": "button", "label": "Checkout", "nearbyText": "Order summary" }
  ]
}
```

Returns:

```json
{
  "chosenId": "el_12",
  "confidence": 0.86,
  "needsConfirmation": false,
  "reason": "Primary action button near order summary"
}
```

### `POST /summarize`
Accepts:

```json
{
  "text": "Full article text (capped to ~6k chars)"
}
```

Returns:

```json
{
  "overview": "1 paragraph summary",
  "bullets": ["point 1", "point 2", "point 3"],
  "keyTerms": ["term1", "term2"]
}
```


### `POST /plan`
Accepts:

```json
{
  "utterance": "Click search and enter cheap product, press enter",
  "url": "https://example.com",
  "candidates": [
    { "id": "el_12", "role": "button", "label": "Search", "nearbyText": "Header" }
  ]
}
```

Returns:

```json
{
  "actions": [
    { "kind": "CLICK", "target": { "by": "TEXT", "value": "Search" } },
    { "kind": "TYPE", "value": "cheap product", "fieldHint": "search" },
    { "kind": "PRESS_KEY", "key": "ENTER" }
  ],
  "needsClarification": false,
  "needsConfirmation": false
}
```
