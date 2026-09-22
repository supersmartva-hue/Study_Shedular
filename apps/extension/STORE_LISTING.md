# Chrome Web Store Listing — Draft Content

Copy/paste these into the Developer Dashboard's store listing form.

## Product name
Smart Productivity — Save as Task

## Summary (max 132 characters)
One-click task & study capture from YouTube, Coursera, Wikipedia and any website.

## Category
Productivity

## Language
English

## Detailed description

```
Smart Productivity turns anything you're reading or watching into an
actionable task or study item — without leaving the page.

HOW IT WORKS
• Browse to any site. On recognized educational platforms (YouTube, Coursera,
  Udemy, Khan Academy, Wikipedia, freeCodeCamp, and more) a small banner
  appears offering to save the page.
• Or click the extension icon any time to save the current tab manually.
• Choose "Save as Task" to add it to your To-Do list, or "Add to Study" to
  add it to your Study Scheduler with the source link attached.

FEATURES
• Auto-detects page title and topic so forms are pre-filled
• Works on any website, not just the supported educational list
• Syncs instantly with your Smart Productivity account (web app included)
• Lightweight — runs quietly in the background, only acts when you choose

REQUIRES A SMART PRODUCTIVITY ACCOUNT
Sign in (or create a free account) from the extension popup. Your tasks and
study items sync with the Smart Productivity web app.

PRIVACY
We only read page data (URL/title) when you explicitly choose to save it.
No background browsing tracking. Full privacy policy linked in this listing.
```

## Privacy policy URL
Once `apps/extension/PRIVACY.md` is pushed to `main`, use the raw GitHub URL:
https://raw.githubusercontent.com/NadiaMahak/smart-productivity/main/apps/extension/PRIVACY.md

(A nicer-looking option: enable GitHub Pages for this repo and link the
rendered page instead — not required, raw markdown renders fine as plain text
and Google accepts it.)

## Single purpose description (required field)
"To let users save the current web page as a task or study item in their
Smart Productivity account with a single click."

## Permission justifications (paste into the relevant dashboard fields)
- **activeTab / tabs**: Needed to read the URL and title of the tab the user
  is currently viewing, so it can be pre-filled into the save form.
- **storage**: Stores the user's login session and configured API/app URL
  locally on their device.
- **notifications**: Shows a native notification confirming a save
  succeeded or failed.
- **Host permissions (`<all_urls>`)**: The content script must be able to run
  on any page so the save banner can appear on educational sites, and so the
  popup can read the active tab regardless of which site the user is on.

## Screenshots (required — at least 1, 1280x800 or 640x400 PNG/JPEG)
Not included yet. Suggested shots:
1. The popup open on a YouTube video, showing the pre-filled "Save as Task" form.
2. The floating banner appearing on a Wikipedia article.
3. A saved task showing up in the Smart Productivity web app.

## Store icon
Uses `apps/extension/icons/icon128.png` (already in the package).
