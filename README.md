# CSE camp site

Online migration of https://www.catholicway.net/ — Catholic School of Evangelization / École catholique d’évangélisation.

## Build and hosting

The user selected GitHub source hosting and Vercel deployment. All capture, development, and validation run online through GitHub Actions. No local checkout is required.

The capture workflow visits public site routes in English and French, captures separate desktop and mobile layouts, preserves rendered HTML and styles, and copies image/font/document assets into this repository. Explicit language parameters prevent Wix language-cookie redirects from contaminating English captures.

The Vercel route handler serves the appropriate language and device layout. Registration and donations retain their original external destinations. Preview pages use noindex.

## Status

Capture and verification in progress. This is not yet a verified exact replica. See migration/reports for captured routes, asset inventory, missing-page reports, and visual comparisons when the workflow finishes.

Wix form submissions still require the current Wix website; the preview explicitly routes visitors there. A replacement form backend is not configured. Domain/DNS changes are not part of this preview.

The connected Vercel account currently exposes only a Pro team. The user is connecting a free Hobby account before deployment. Do not deploy to or change the Pro team without authorization.

## Online operations

- Run the “Capture original bilingual website” workflow to regenerate captured pages and assets.
- Inspect migration/reports/capture.json and verification.json before treating the copy as ready.
- Import this repository in the authorized Vercel workspace. The framework is Other; build command is npm run build; output directory is public.
