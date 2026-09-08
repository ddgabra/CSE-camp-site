# CSE camp site

Online migration of https://www.catholicway.net/ — Catholic School of Evangelization / École catholique d’évangélisation.

## Build and hosting

The user selected GitHub source hosting and Vercel deployment. All capture, development, and validation run online through GitHub Actions. No local checkout is required.

The capture workflow visits public site routes in English and French, captures separate desktop and mobile layouts, preserves rendered HTML and styles, and copies image/font/document assets into this repository. Explicit language parameters prevent Wix language-cookie redirects from contaminating English captures.

The Vercel route handler serves the appropriate language and device layout. Registration and donations retain their original external destinations. Preview pages use noindex.

## Status

The online copy is deployed at https://cse-camp-site.vercel.app/ in the user-authorized current Vercel account. GitHub Actions run 34279495308 passed on 2026-09-08: 240 route/language/device variants, visible-text comparisons, image loading, all 17 FAQ answers in each layout and language, language switching, desktop menus, and original mobile navigation.

This is a close visual copy, not a certified pixel-perfect or fully independent migration. Twelve full-page screenshot comparisons cover the welcome, home, and camp pages in both languages and device layouts. Six match exactly; the others show approximately 0.5–2.2% differing pixels at the comparison threshold. Other routes were checked for text and image loading, not exhaustively compared pixel by pixel. Reports and screenshots are under migration/.

The source route /category/all-products already returns 404 on Wix. External registration, donation, mailing-list, social, and marketing destinations remain external services. The home slideshow uses captured images with replacement navigation controls.

Wix form submissions still require the current Wix website; the preview explicitly routes visitors there. A replacement form backend is not configured. Domain/DNS changes are not part of this preview.

The user authorized deployment to the existing Vercel account on 2026-09-08. The production deployment completed successfully, and the live welcome page, home banner, images, and French language switch were checked. The existing plan and original catholicway.net domain were not changed.

## Online operations

- Run the “Capture original bilingual website” workflow to regenerate captured pages and assets.
- Inspect migration/reports/capture.json and verification.json before treating the copy as ready.
- GitHub is connected to the Vercel project cse-camp-site. The framework is Other; build command is npm run build; output directory is public. Changes on main deploy through the Git integration.
