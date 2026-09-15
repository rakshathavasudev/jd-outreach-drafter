# Privacy

JD Outreach Drafter has no backend and collects no analytics.

**Stored locally, in `chrome.storage.local`:** your Anthropic API key, resume text and PDFs, name,
signature, notes, and outreach rules. They never leave your browser except as described below.

**Stored for the browser session only, in `chrome.storage.session`:** the most recent draft for each page.
It is cleared when the browser closes.

**Sent to Anthropic (`api.anthropic.com`), only when you click Draft or Revise:** the job description,
title, company, and URL; the recipient details you entered; your resume(s), notes, and rules. Anthropic's
API terms and privacy policy apply to that data.

**Page access:** the extension reads a page only when you click its icon or use its right-click menu.
It doesn't run on pages in the background.

Your API key is stored unencrypted in extension storage. Don't install this extension on a shared computer
profile, and set a spend limit on your key in the Anthropic Console.
