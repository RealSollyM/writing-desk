# Writing Desk plan

_Written by JSM HQ from .jsmhq/plan.json. Edits here are overwritten; change the plan in HQ._

## Backlog (active)

_No tasks._

## Phase 1: Architecture & Core Writing Platform (active)

- [ ] **P1A-T01** Set up Neon Postgres schema and Prisma client for documents — Theo · in progress
  - Create database schema with User, Document models in Neon Postgres. Set up Prisma ORM with Neon connection, generate client, and configure migrations. Documents should support title, content, author, createdAt, updatedAt, and status (draft/published) fields.
  - Done when: Prisma schema defined with User and Document models. Neon Postgres connected via environment variable. Migrations applied. TypeScript types generated.
- [ ] **P1A-T02** Implement Better Auth for email/password authentication — Prosper · in progress
  - Install and configure Better Auth for self-hosted authentication. Set up auth routes, session middleware, and user registration/login flows. The auth should support email/password authentication with JWT sessions and integrate with the Prisma User model.
  - Done when: Better Auth installed and configured. Email/password auth working. Session middleware protecting API routes. Sign-up/login forms functional in the UI.
- [ ] **P1A-T03** Configure Arcjet for rate limiting and bot protection — Theo · in progress
  - Install and configure Arcjet for bot protection, rate limiting, and prompt injection checks. Set up a protection middleware that applies rate limits to all API routes (e.g., 100 requests per 5 minutes) and bot protection to prevent abuse. Note: No AI tools will use Arcjet for AI-specific protection at this stage.
  - Done when: Arcjet installed with rate limiting middleware applied globally. Bot protection active. API routes protected with appropriate limits.
- [ ] **P1A-T04** Build main Writing Desk UI with Tiptap WYSIWYG editor — Prosper
  - Build the main Writing Desk shell UI with navigation, document list view, and WYSIWYG editor. Use Tiptap for the rich text editing experience. Include a document sidebar showing saved drafts/published works, a top navigation bar, and a main content area with the editor.
  - Done when: New document button opens blank editor. Document list shows drafts and published items. WYSIWYG editor (Tiptap) allows formatting. Drafts save automatically. Publishing workflow works.
