# Piggy Math

A playful, touch-friendly web app that teaches children the real right-to-left procedure for written column addition.

## What it includes

- Eight progressively harder 2-digit and 3-digit addition levels
- Place-value aligned written calculations
- Ones → tens → hundreds answer entry
- Optional carry marks that start blank and toggle to `1`
- Ten timed questions per session with gentle sound cues
- Correct-answer celebrations and worked corrections
- Gold, silver and bronze Pig results
- Level unlocking and best scores saved on the device
- Responsive layouts for iPhone, iPad and desktop

Subtraction is intentionally not included.

## Run locally

Install dependencies, then start the development server:

```bash
pnpm install
pnpm dev
```

Open the local address shown in the terminal (normally `http://localhost:3000`).

## Test and build

```bash
pnpm test
pnpm typecheck
pnpm build
```

The automated tests generate thousands of problems and verify every level's carry rules, consecutive carries, answer validation and saved-progress recovery.

## Project structure

- `app/page.tsx` — screens, session state, timer, sound and interactions
- `app/globals.css` — child-friendly responsive visual design
- `lib/game.js` — pure problem generation, validation, scoring and persistence parsing
- `tests/game.test.js` — automated level and answer tests
- `public/` — static icons and assets

## Level guide

1. Two digits, no carry
2. Two digits, one carry from the ones column
3. Two-digit mixed practice
4. Three digits, no carry
5. Three digits, exactly one carry
6. Three digits, exactly two carries
7. A carry that triggers another carry
8. Mixed three-digit challenge

## GitHub Pages

Run `pnpm build`, then publish the generated static client output. For a project site hosted below a repository path, set the matching base path in the hosting configuration before building. GitHub Actions can build the project and upload the static output directory as the Pages artifact.
