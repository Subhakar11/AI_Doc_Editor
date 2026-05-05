# Ajaia Docs Lite

A lightweight collaborative document editor built for the assignment.

## What is included

- Create, rename, edit, save, and reopen documents
- Basic rich-text formatting:
  - Bold
  - Italic
  - Underline
  - Headings
  - Bulleted and numbered lists
- File import for `.txt` and `.md`
- Simple sharing between seeded users
- Persistence in a local JSON data file
- One automated test

## Tech stack

- Node.js HTTP server
- Vanilla HTML/CSS/JS frontend
- Local JSON persistence
- Built-in `node:test` for tests

## Run it locally

1. Open this folder in VS Code.
2. Make sure Node.js 18+ is installed.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the app:
   ```bash
   npm run dev
   ```
5. Open:
   ```text
   http://localhost:3000
   ```

## Seeded users

Use these for the login selector:

- Alicia Dev — `alicia@ajaia.internal`
- Ben Collaborator — `ben@ajaia.internal`
- Cara Reviewer — `cara@ajaia.internal`

## Sharing flow

- Sign in as **Alicia Dev**
- Open the sample document
- Share it with `ben@ajaia.internal`
- Switch the user selector to **Ben Collaborator**
- The shared document should appear in the sidebar

## File upload flow

- Use the **Import file** button
- Supported types in this build: `.txt`, `.md`
- A new editable document is created from the file contents

## Test

```bash
npm test
```

## Notes

The editor stores HTML so formatting is preserved across refreshes. It is intentionally scoped to a single-user-at-a-time mock login flow to keep the assignment focused on document workflow, persistence, and sharing logic.
