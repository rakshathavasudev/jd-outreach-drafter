# Contributing

Thanks for helping. Issues and pull requests are welcome.

## Setup

No build step or dependencies. Load the folder with **Load unpacked** in `chrome://extensions`, and click
the reload arrow on the extension card after each change. For the service worker's logs, click
**service worker** on that card. For the popup's logs, right-click the popup and choose **Inspect**.

## Adding or fixing a job site

1. Add or edit an entry in the `SITES` array in `extractor.js`:
   ```js
   { name: "Example", match: /example\.com\/jobs/,
     desc: [".job-description"], title: ["h1.job-title"], company: [".company-name"] }
   ```
   Selectors are tried in order and the first match that has text wins. For sites with generated class
   names, use `custom: yourFunction` returning `{ title, company }` (see `fromHandshake`).
2. Prefer stable hooks: `data-*` attributes, `id`s, or link patterns. Avoid hashed class names.
3. Test on at least two postings on that site. In the PR, include the URLs (or screenshots if they need a login).

## Pull requests

- Keep changes focused, one site or one feature per PR.
- Never commit API keys, resumes, or real personal data.
- Describe how you tested.
