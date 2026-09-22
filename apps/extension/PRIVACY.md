# Privacy Policy — Smart Productivity Extension

_Last updated: 2026-07-04_

## What this extension does

Smart Productivity — Save as Task lets you capture tasks and study material
from web pages (YouTube, Coursera, Wikipedia, and other sites) directly into
your Smart Productivity account.

## Data we collect

- **Account credentials**: your email and password when you sign in. Passwords
  are never stored by the extension — they're sent directly to our API over
  HTTPS, which stores only a salted hash.
- **Authentication token**: a JWT is stored locally in `chrome.storage.local`
  on your device to keep you signed in. It never leaves your device except in
  API requests to our own backend.
- **Page data you choose to save**: when you click "Save as Task" or "Add to
  Study", the extension reads the current page's URL, title, and (on a fixed
  list of recognized educational sites) its heading/meta title to pre-fill
  the save form. This data is only sent to our API when you confirm the save
  — nothing is captured or transmitted automatically in the background.
- **Configuration**: the API/app URLs you set on the Options page, stored in
  `chrome.storage.sync`.

## What we don't do

- We do not track your general browsing history.
- We do not read page content on sites outside the recognized educational
  list unless you manually trigger a save from that page.
- We do not sell or share your data with advertisers.
- We do not use your data to train AI models.

## Third-party services

Tasks and study items you create may be processed by our backend using
AI providers (Groq, Google Gemini, or OpenAI, depending on configuration) to
power features like AI-assisted planning. Only the content you explicitly
save is sent to these providers — never your general browsing activity.

## Data storage & retention

Your account data is stored in our backend database until you delete your
account or the specific task/study item. You can request account deletion by
contacting us at the email below.

## Permissions justification

- `activeTab`, `tabs` — to read the URL/title of the page you're currently
  viewing when you choose to save it.
- `storage` — to store your login token and configuration locally.
- `notifications` — to show a confirmation when a save succeeds or fails.
- Host permissions (`<all_urls>`) — the content script needs to run on any
  page so the "Save as Task" banner can appear on educational sites you
  visit, and so the popup can read the active tab's info regardless of
  which site you're on.

## Contact

Questions about this policy or your data: supersmartva@gmail.com
