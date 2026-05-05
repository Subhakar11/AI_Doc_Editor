# Submission Contents

This folder includes:

- `server.js` — Node HTTP server and API routes
- `storage.js` — local JSON persistence and sharing logic
- `public/index.html` — app shell
- `public/styles.css` — UI styling
- `public/app.js` — editor, sharing, and file import logic
- `test/storage.test.js` — automated storage test
- `README.md` — local setup and run instructions
- `ARCHITECTURE.md` — short architecture note
- `AI_WORKFLOW.md` — AI usage note
- `SUBMISSION.md` — this file

What is working:

- create, rename, edit, save, and reopen documents
- rich-text formatting
- importing `.txt` / `.md` files
- owner-based sharing with seeded accounts
- persistence after refresh

What is intentionally incomplete:

- real-time multi-user collaboration
- comment/suggestion mode
- version history
- PDF export
- enterprise-grade auth and permissions

Next 2–4 hours:

- add a document activity log
- improve toolbar UX and keyboard shortcuts
- add a small deployment layer and environment-based config
- add a second API test around the share flow
