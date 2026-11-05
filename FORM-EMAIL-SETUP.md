# CSE website form delivery setup

Changes are isolated on branch `fix/form-email-delivery`. Do not merge into production until verified.

## Required Vercel environment variables
- `RESEND_API_KEY`: API key from Resend
- `FORM_FROM_EMAIL`: sender address on a domain verified in Resend (for example `forms@catholicway.net` after domain verification)

All notifications currently go to `wess@catholicway.net`.

## Verification before deployment
1. Configure the two environment variables on the **test Vercel project** and deploy this branch there.
2. Verify the sending domain in Resend. Do not put the API key in GitHub or browser code.
3. Submit each real form on the test site with test-only data. Verify delivery to the recipient inbox and reply-to behavior.
4. Confirm validation, errors, and successful-submission states in both languages and mobile/desktop.
5. IMPORTANT: The endpoint handles text fields only. Forms that upload resumes or other files will show a warning and **must not be considered fixed** until a secure attachment workflow is implemented.
6. Confirm each form's field names and all form categories are correctly serialized. Check spam protection/rate limits before production rollout.
7. Only then merge/deploy with explicit production approval.

The endpoint intentionally returns HTTP 503 if email configuration is missing; it never reports successful delivery without an email provider acceptance.
