const $ = (id) => document.getElementById(id);
const MAX_PDF_BYTES = 4 * 1024 * 1024;
let resumeState = [];

function setStatus(text, kind) {
  const s = $("status");
  s.textContent = text;
  s.className = kind || "";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error("Couldn't read that file."));
    r.readAsDataURL(file);
  });
}

function renderResumes() {
  const box = $("resumes");
  box.replaceChildren();
  resumeState.forEach((r, i) => {
    const node = $("resumeTpl").content.cloneNode(true);
    const name = node.querySelector(".r-name");
    const text = node.querySelector(".r-text");
    const file = node.querySelector(".r-file");
    const pdfName = node.querySelector(".r-pdfname");
    const clear = node.querySelector(".r-clear");

    name.value = r.name;
    text.value = r.text;
    name.id = `rname${i}`;
    text.id = `rtext${i}`;
    node.querySelectorAll("label")[0].htmlFor = name.id;
    node.querySelectorAll("label")[1].htmlFor = text.id;
    pdfName.textContent = r.pdf ? `Attached: ${r.pdfName || "resume.pdf"}` : "";
    clear.hidden = !r.pdf;

    name.addEventListener("input", () => (r.name = name.value));
    text.addEventListener("input", () => (r.text = text.value));
    file.addEventListener("change", async () => {
      const f = file.files[0];
      if (!f) return;
      if (f.size > MAX_PDF_BYTES) {
        setStatus("That PDF is over 4 MB. Use a smaller export.", "bad");
        return;
      }
      r.pdf = await fileToBase64(f);
      r.pdfName = f.name;
      renderResumes();
      setStatus("PDF attached. Save to keep it.");
    });
    clear.addEventListener("click", () => {
      r.pdf = "";
      r.pdfName = "";
      renderResumes();
    });
    box.appendChild(node);
  });
}

async function load() {
  const s = { ...DEFAULTS, ...(await chrome.storage.local.get(null)) };
  $("apiKey").value = s.apiKey;
  $("model").value = s.model;
  $("senderName").value = s.senderName;
  $("signature").value = s.signature;
  $("profileNotes").value = s.profileNotes;
  $("rules").value = s.rules;
  MODEL_OPTIONS.forEach((m) => $("models").appendChild(new Option(m, m)));
  resumeState = structuredClone(s.resumes);
  while (resumeState.length < 3) resumeState.push({ name: "", text: "", pdf: "", pdfName: "" });
  renderResumes();
}

$("save").addEventListener("click", async () => {
  const names = resumeState.filter((r) => r.pdf || r.text.trim()).map((r) => r.name.trim());
  if (names.some((n) => !n)) return setStatus("Give every filled-in resume a name.", "bad");
  if (new Set(names).size !== names.length) return setStatus("Resume names must be different.", "bad");
  try {
    await chrome.storage.local.set({
      apiKey: $("apiKey").value.trim(),
      model: $("model").value.trim() || DEFAULTS.model,
      senderName: $("senderName").value.trim(),
      signature: $("signature").value,
      profileNotes: $("profileNotes").value,
      rules: $("rules").value.trim() || DEFAULT_RULES,
      resumes: resumeState.map((r) => ({ ...r, name: r.name.trim() })),
    });
    setStatus("Saved.", "ok");
  } catch (e) {
    setStatus(`Couldn't save: ${e.message}`, "bad");
  }
});

$("testKey").addEventListener("click", async () => {
  setStatus("Testing…");
  const res = await chrome.runtime.sendMessage({
    type: "testKey",
    apiKey: $("apiKey").value.trim(),
    model: $("model").value.trim() || DEFAULTS.model,
  });
  setStatus(res.ok ? "Key and model work." : res.error, res.ok ? "ok" : "bad");
});

$("resetRules").addEventListener("click", () => {
  $("rules").value = DEFAULT_RULES;
  setStatus("Default rules restored. Save to keep them.");
});

load();
