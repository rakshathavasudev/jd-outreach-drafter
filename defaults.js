// Shared by background.js (importScripts) and the extension pages (<script>).
// Everything here is a starting point; users edit it on the Settings page.
const MODEL_OPTIONS = ["claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5-20251001"];

const DEFAULT_RULES = `- Structure every message as hook → proof → fit → ask.
- Put a subject line at the top of the email.
- Email: one short opening paragraph (why this role and team), then exactly three proof bullets, then a one-line close.
- Every bullet carries a concrete metric or outcome from the resume.
- Close by noting the resume is attached and inviting a conversation about the role.
- LinkedIn connection note: under 300 characters total, one concrete proof point, same closing intent.
- Confident and specific. No filler ("I hope this finds you well", "I am writing to express").`;

const DEFAULT_PROFILE_NOTES = "";

const DEFAULTS = {
  apiKey: "",
  model: MODEL_OPTIONS[0],
  senderName: "",
  signature: "",
  rules: DEFAULT_RULES,
  profileNotes: DEFAULT_PROFILE_NOTES,
  resumes: [
    { name: "Resume 1", text: "", pdf: "", pdfName: "" },
    { name: "Resume 2", text: "", pdf: "", pdfName: "" },
    { name: "Resume 3", text: "", pdf: "", pdfName: "" },
  ],
};
