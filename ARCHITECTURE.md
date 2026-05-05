# Architecture Note

## Scope choice

I intentionally kept the app small and focused on the core workflow:

1. create and reopen documents
2. edit rich text in the browser
3. import file content into a document flow
4. share a document with another user
5. persist data locally so behavior survives refresh

## Main tradeoff

I chose a vanilla frontend and a small Node server instead of a heavier framework. That reduced setup risk and let me spend more time on product behavior, sharing, and persistence.

## Data model

The app stores:

- users
- documents
- document sharing relationships

Documents are saved as HTML so the formatting survives refreshes without a separate rich-text schema.

## Access model

This is a lightweight mock-auth model:

- a user is selected from seeded accounts
- the API checks the `X-User-Id` header
- only the owner can share
- shared users can open the document

## What I deprioritized

- real-time multi-user collaboration
- comments and suggestions
- version history
- PDF export
- enterprise permissions

Those would be good next steps after the core flow is stable.

## Why this is a good slice

It demonstrates the product loop reviewers are likely to care about:

- create a doc
- edit content
- import content from a file
- share it with another user
- reopen it after refresh
