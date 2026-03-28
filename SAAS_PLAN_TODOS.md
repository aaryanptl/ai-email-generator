# SaaS Packaging Plan (Sales + Marketing Focus)

Goal: turn the internal email generator into a paid SaaS for sales and marketing teams by improving output quality, reducing time-to-value, and creating a repeatable onboarding flow.

## Product Direction

- Target audience: sales reps, growth marketers, and lifecycle marketing teams.
- Core promise: create high-converting, brand-consistent emails in minutes.
- Positioning: not just an email generator, but a campaign-ready email creation workflow.

## Prompt Strategy (Hybrid)

We will use a hybrid prompt architecture:

1. Master prompt for permanent technical + design guardrails.
2. Category context for campaign-specific behavior (marketing newsletter, cold outreach, etc.).

### Master Prompt Responsibilities

- Enforce code rules for React Email generation.
- Enforce layout reliability and responsiveness.
- Enforce consistent modern design principles (spacing, hierarchy, contrast, CTA clarity).
- Enforce safe defaults when user input is vague.

### Category Context Responsibilities

- Adapt copywriting framework by use case (AIDA, PAS, etc.).
- Adapt structure by use case (image-heavy vs plain-text style).
- Adapt CTA style and message length by use case.

## Execution Roadmap

### Phase 1: Output Quality Foundation

- [x] Rewrite `lib/email-system-prompt.ts` with stricter design and copy guardrails.
- [x] Remove placeholder-first image behavior and define real-image rules.
- [x] Add hard rules for spacing scale, typography hierarchy, and button patterns.
- [x] Add explicit instructions for preserving structure during edit requests.

### Phase 2: Real Images with Unsplash

- [ ] Register Unsplash app and store API key in `.env.local` (e.g. `UNSPLASH_ACCESS_KEY`).
- [ ] Add `search_unsplash` tool in `app/api/chat/route.ts`.
- [ ] Update prompt/tool instructions so model fetches real images when needed.
- [ ] Add fallback behavior when image search fails (safe absolute fallback URL).

### Phase 3: Category-Based Generation

- [ ] Define initial categories:
  - [ ] Marketing Newsletter
  - [ ] Product Launch
  - [ ] Cold Outreach (B2B)
  - [ ] Follow-up / Nurture
- [ ] Create backend mapping of category -> category prompt block.
- [ ] Inject selected category context into system prompt per request.
- [ ] Keep master prompt unchanged and category blocks modular.

### Phase 4: UX Packaging for Non-Technical Teams

- [ ] Add starter prompt chips in chat UI for top categories.
- [ ] Pre-fill user prompt + category metadata on chip click.
- [ ] Add “what this template is optimized for” helper text.
- [ ] Add first-run quickstart path (choose goal -> brand tone -> generate).

### Phase 5: Template Library

- [ ] Create curated pre-made templates by business outcome.
- [ ] Add tags and filters (sales, ecommerce, webinar, product update).
- [ ] Use style references to keep generated outputs consistent.
- [ ] Include a small set of proven default templates at launch.

### Phase 6: SaaS Readiness (Monetization Basics)

- [ ] Define free vs paid usage limits.
- [ ] Add usage metering (generation count + image calls).
- [ ] Add upgrade messaging at limits.
- [ ] Prepare Stripe subscription integration plan.

## MVP Acceptance Criteria

- [ ] A sales user can generate a cold outreach email in under 2 minutes.
- [ ] A marketing user can generate a branded newsletter with real imagery.
- [ ] Generated emails compile without manual code fixes.
- [ ] Visual quality is consistently production-usable.
- [ ] Users can export and use email output in external tools.

## Metrics to Track from Day 1

- [ ] Time to first successful generated email.
- [ ] First-session completion rate.
- [ ] Regeneration rate per session.
- [ ] Export rate.
- [ ] Upgrade intent signals (limit reached, pricing clicks).

## Immediate Next 3 Tasks

- [x] Finalize v1 master prompt draft.
- [ ] Implement Unsplash tool in API route.
- [ ] Ship 4 category starter chips in UI and wire prompt injection.
