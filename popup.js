const $ = (id) => document.getElementById(id);
const LI_LIMIT = 300;

let tab = null;
let storeKey = "";
let job = { url: "", title: "", company: "", location: "", description: "" };
let recipient = { type: "hiring_manager", name: "", email: "", headline: "" };
let lastDraft = null;

// ---------- helpers ----------
function show(el, on) { el.hidden = !on; }

function setError(msg) {
  $("error").textContent = msg || "";
  show($("error"), !!msg);
}

function setBusy(busy) {
  $("generate").disabled = busy;
  $("reviseBtn").disabled = busy;
  show($("loading"), busy);
}

function flash(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = old), 1400);
}

function updateCounts() {
  const n = $("jdText").value.length;
  $("jdCount").textContent = n ? `${n.toLocaleString()} characters` : "";
  const li = $("liNote").value.length;
  $("liCount").textContent = `${li} / ${LI_LIMIT}`;
  $("liCount").classList.toggle("over", li > LI_LIMIT);
}

function setRecipientType(type) {
  recipient.type = type;
  $("typeHM").setAttribute("aria-pressed", String(type === "hiring_manager"));
  $("typeRec").setAttribute("aria-pressed", String(type === "recruiter"));
}

function readForm() {
  job = {
    ...job,
    title: $("jobTitle").value.trim(),
    company: $("company").value.trim(),
    description: $("jdText").value.trim(),
  };
  recipient = {
    ...recipient,
    name: $("recName").value.trim(),
    email: $("recEmail").value.trim(),
  };
}

function fillJob(j, sourceLabel, weak) {
  job = { ...job, ...j };
  $("jobTitle").value = job.title || "";
  $("company").value = job.company || "";
  $("jdText").value = job.description || "";
  const src = $("source");
  src.textContent = sourceLabel;
  src.classList.toggle("weak", !!weak);
  updateCounts();
}

function renderContacts(contacts, emails) {
  const box = $("contacts");
  box.replaceChildren();
  (contacts || []).forEach((c) => {
    const b = document.createElement("button");
    b.textContent = c.name;
    b.title = c.headline || "";
    b.addEventListener("click", () => {
      $("recName").value = c.name;
      recipient.headline = c.headline || "";
      if (/recruit|talent|sourc|people partner/i.test(c.headline || "")) setRecipientType("recruiter");
    });
    box.appendChild(b);
  });
  if (!$("recEmail").value && emails && emails.length) $("recEmail").value = emails[0];
}

function renderDraft(d) {
  if (!d) return;
  lastDraft = d;
  $("subject").value = d.subject || "";
  $("emailBody").value = d.email_body || "";
  $("liNote").value = d.linkedin_note || "";
  $("fitNotes").textContent = d.fit_notes || "";
  $("variantUsed").textContent = d.resume_variant_used ? `Based on: ${d.resume_variant_used}` : "";
  show($("results"), true);
  updateCounts();
}

function applyStored(entry) {
  if (!entry) return;
  if (entry.status === "loading") {
    setBusy(true);
    setError("");
    return;
  }
  setBusy(false);
  if (entry.status === "error") setError(entry.error);
  if (entry.status === "done") setError("");
  if (entry.draft) renderDraft(entry.draft);
}

// ---------- page extraction ----------
async function runExtractor(allFrames) {
  const res = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames },
    files: ["extractor.js"],
  });
  return res.map((r) => r.result).filter(Boolean);
}

const SOURCE_RANK = { "Your selection": 4, "Structured data": 3, "Page scan": 1 };

async function detect() {
  $("source").textContent = "Reading this page…";
  let results = [];
  try {
    try {
      results = await runExtractor(true);
    } catch (_) {
      results = await runExtractor(false); // cross-origin frames we can't touch
    }
  } catch (e) {
    fillJob({ url: tab.url }, "This page can't be read. Paste the job description below.", true);
    return;
  }

  const found = results
    .filter((r) => r.ok)
    .sort((a, b) =>
      (SOURCE_RANK[b.source] ?? 2) - (SOURCE_RANK[a.source] ?? 2) ||
      b.description.length - a.description.length
    );

  if (!found.length) {
    fillJob({ url: tab.url }, "No job description found. Paste it below, or highlight it and scan again.", true);
    return;
  }

  const best = found[0];
  const label =
    `Found via ${best.source.toLowerCase()}` +
    (best.truncated ? " (trimmed to 15,000 characters)" : "") +
    (best.weak ? ". Low confidence, so check the text below." : "");
  fillJob(
    { url: tab.url, title: best.title, company: best.company, location: best.location, description: best.description },
    label,
    best.weak
  );
  const allContacts = found.flatMap((r) => r.contacts || []);
  const allEmails = found.flatMap((r) => r.emails || []);
  renderContacts(allContacts, allEmails);
}

// ---------- generation ----------
async function generate(previous) {
  readForm();
  setError("");
  if (job.description.length < 150) {
    setError("The job description is too short. Paste the full posting.");
    return;
  }
  setBusy(true);
  const res = await chrome.runtime.sendMessage({
    type: "generate",
    key: storeKey,
    job,
    recipient,
    resumeChoice: $("resumeChoice").value,
    instructions: previous ? $("reviseText").value.trim() : $("instructions").value.trim(),
    previous: previous || null,
  });
  applyStored(res);
}

// ---------- init ----------
async function init() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  storeKey = `draft:${tab.url.split("#")[0]}`;
  chrome.action.setBadgeText({ tabId: tab.id, text: "" });

  const settings = { ...DEFAULTS, ...(await chrome.storage.local.get(null)) };
  const usable = (settings.resumes || []).filter((r) => r.name && (r.pdf || (r.text || "").trim()));
  show($("setupBanner"), !settings.apiKey || !usable.length);

  const sel = $("resumeChoice");
  sel.replaceChildren(new Option(usable.length > 1 ? "Let Claude pick the best fit" : "Default", "auto"));
  usable.forEach((r) => sel.add(new Option(r.name, r.name)));

  const session = await chrome.storage.session.get([storeKey, "pendingSelection"]);
  const pending = session.pendingSelection;
  const stored = session[storeKey];

  if (pending && pending.tabId === tab.id) {
    await chrome.storage.session.remove("pendingSelection");
    fillJob({ url: pending.url, title: pending.title, description: pending.text }, "Using the text you selected");
  } else if (stored && stored.job) {
    fillJob(stored.job, "Restored from your last draft on this page");
    recipient = { ...recipient, ...stored.recipient };
    setRecipientType(recipient.type);
    $("recName").value = recipient.name || "";
    $("recEmail").value = recipient.email || "";
    if (stored.resumeChoice) sel.value = stored.resumeChoice;
    applyStored(stored);
  } else {
    await detect();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "session" && changes[storeKey]) applyStored(changes[storeKey].newValue);
  });
}

// ---------- events ----------
$("openSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("setupLink").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("rescan").addEventListener("click", detect);
$("typeHM").addEventListener("click", () => setRecipientType("hiring_manager"));
$("typeRec").addEventListener("click", () => setRecipientType("recruiter"));
$("jdText").addEventListener("input", updateCounts);
$("liNote").addEventListener("input", updateCounts);
$("generate").addEventListener("click", () => generate(null));

$("reviseBtn").addEventListener("click", () => {
  if (!$("reviseText").value.trim()) {
    setError("Say what to change, then select Revise.");
    return;
  }
  generate({
    subject: $("subject").value,
    email_body: $("emailBody").value,
    linkedin_note: $("liNote").value,
  });
});

$("copyEmail").addEventListener("click", async () => {
  await navigator.clipboard.writeText(`Subject: ${$("subject").value}\n\n${$("emailBody").value}`);
  flash($("copyEmail"), "Copied");
});

$("copyLi").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("liNote").value);
  flash($("copyLi"), $("liNote").value.length > LI_LIMIT ? "Copied (over 300)" : "Copied");
});

$("openGmail").addEventListener("click", () => {
  const p = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: $("recEmail").value.trim(),
    su: $("subject").value,
    body: $("emailBody").value,
  });
  chrome.tabs.create({ url: `https://mail.google.com/mail/?${p.toString()}` });
});

init();
