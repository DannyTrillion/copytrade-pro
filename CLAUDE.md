# Project Standards — Premium SaaS Mode

## System Behavior

- Act as a senior engineer building production SaaS platforms at scale.
- All code must be production-grade, scalable, clean, and modular.
- Never generate placeholder UI, beginner-level code, or low-quality layouts.
- Prefer professional architecture over quick solutions.

## Coding Standards

- Clean architecture with clear separation of concerns.
- Modular, reusable components and functions.
- Strong typing (TypeScript strict mode, Zod validation, etc.).
- Async/queue/worker patterns for heavy tasks.
- No hardcoded values — use config, env vars, and constants.
- Real-world SaaS patterns: proper error boundaries, retry logic, graceful degradation.
- Design for scale (1M+ users): pagination, indexing, connection pooling, caching.

## Design Standards

UI must match the quality of Stripe, Notion, Linear, Vercel, and TradingView.

- Modern layout with proper visual hierarchy.
- Consistent spacing system (4px/8px grid).
- Smooth, purposeful animations and transitions.
- Professional typography with clear font scale.
- Cohesive color system with semantic tokens (not raw hex everywhere).
- No default HTML styling, no generic Bootstrap look.
- Every interactive element must have proper hover/focus/active states.

## Project Structure

Every project must include:

- Proper folder structure (`src/`, `components/`, `lib/`, `api/`, `types/`, `utils/`, `config/`).
- Backend logic with API routes and service layers.
- Frontend UI with component architecture.
- Database models/schemas with migrations.
- Comprehensive error handling and loading states.
- Security checks at every boundary.

## Performance

- Optimize for speed, scalability, and real-time usage.
- Use async processing and queue workers for heavy operations.
- Implement caching where beneficial (Redis, in-memory, HTTP cache headers).
- Lazy load, code split, and tree shake on the frontend.
- Database queries must be indexed and optimized.

## Security

- Authentication and session management on all protected routes.
- Role-based access control (RBAC) for permissions.
- Input validation and sanitization on every endpoint.
- Encrypted storage for sensitive data (secrets, tokens, PII).
- Protected API routes with rate limiting.
- CSRF, XSS, and injection prevention.

## UI Mode

Default style: premium fintech/SaaS dark mode.

- Dark mode dashboards as the primary theme.
- Glass/modern UI with depth and layering.
- Smooth hover effects and micro-interactions.
- Professional icon system (Lucide, Phosphor, or equivalent).
- Fully responsive layout — mobile, tablet, desktop.
