# Agent Mode Manual QA

## Setup
1. Start backend (`npm run dev`) with `OPENAI_API_KEY` (or `OPENAI_KEY`) set in `.env.local`.
2. In Extension Options, set Backend URL to `http://localhost:8787/resolve`.
3. Enable Agent Mode.

## Test Utterances
1. “Click search and type 5 years.”
2. “Scroll down and find the keyword domain. Stop when you see it.”
3. “Scroll down until I say stop.” (then say “stop”)
4. “Look for the keyword pricing.”
5. “Click checkout.” (if multiple matches, say “option 2”)
6. “Submit.” (should ask for confirmation; say “yes proceed”)

## Expected
1. Multi-step actions execute in order.
2. Scroll loops stop within ~500ms of “stop”.
3. Ambiguity prompts show 2–5 options; voice “option 2” works.
