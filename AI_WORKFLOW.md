# AI Workflow Note

## AI tools used

I used ChatGPT to help plan the product slice, structure the codebase, and draft repetitive boilerplate.

## Where AI sped up the work

- turning the assignment into a clean, minimal scope
- outlining the file structure
- drafting server routes and storage helpers
- creating the README, architecture note, and submission file structure

## What I changed or rejected

- I kept the stack simpler than a heavier framework-based build
- I removed features that were attractive but not necessary, such as real-time collaboration and version history
- I adjusted generated code so the access checks, validation, and persistence flow were easy to understand

## How correctness and UX were verified

- Manual end-to-end checks in the browser:
  - create a document
  - rename it
  - edit formatting
  - import a `.txt` or `.md` file
  - share it with another seeded user
  - switch users and reopen the shared doc
- Automated test for the storage layer
- Basic validation on API inputs
- UI state feedback for save, error, and sharing actions

## Practical use of AI

AI was most useful as a force multiplier for scaffolding and organization. I still made the product judgment calls, simplified the scope, and verified the behavior manually.
