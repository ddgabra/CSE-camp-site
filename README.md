# CSE camp site

Migration workspace for https://www.catholicway.net/ — Catholic School of Evangelization / École catholique d’évangélisation.

## Requested result

Preserve all public pages, original English and French wording, images, layout, navigation and functionality. All source code and build work must remain online in GitHub; no local development checkout.

## Status

Repository created. Source Wix site and both language variants verified. Implementation and migration are not complete; this repository is not yet a working replica.

The French language selector uses `?lang=fr`. Both variants must be captured individually; the original English and French landing pages differ in wording and footer details.

External services observed: camp registration at https://stmalocamps.net/ and donations through Zeffy. Migration must preserve and verify those destinations. Contact and mailing-list forms require a functioning backend.

## Hosting decision pending

WordPress.com Free does not support connecting an existing custom domain or uploading a custom theme. An exact custom build requires compatible WordPress hosting, or a different hosting platform if zero hosting cost is the priority. GitHub source hosting does not itself run a WordPress installation.

Official documentation:
- https://wordpress.com/support/domains/connect-existing-domain/
- https://wordpress.com/support/themes/uploading-setting-up-custom-themes/

No domain or live Wix site changes have been made.
