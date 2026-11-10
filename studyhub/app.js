import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const show = (el, on = true) => { el.hidden = !on; };

const TYPE_LABEL = { note: "Poznámka", link: "Odkaz", task: "Úloha" };

// ---------------------------------------------------------------------------
// Inicializácia
// ---------------------------------------------------------------------------
if (firebaseConfig.apiKey.startsWith("VLOZ_")) {
  show($("setup-banner"));
  throw new Error("Firebase nie je nakonfigurovaný (firebase-config.js).");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let items = [];           // všetky položky prihláseného používateľa
let unsubscribeItems = null;
let editingId = null;     // id upravovanej položky, alebo null pri novej
let registerMode = false;

// ---------------------------------------------------------------------------
// Pomocné funkcie
// ---------------------------------------------------------------------------
function friendlyError(err) {
  const map = {
    "auth/invalid-email": "Neplatný e-mail.",
    "auth/missing-password": "Zadaj heslo.",
    "auth/weak-password": "Heslo musí mať aspoň 6 znakov.",
    "auth/email-already-in-use": "Tento e-mail je už zaregistrovaný.",
    "auth/invalid-credential": "Nesprávny e-mail alebo heslo.",
    "auth/user-not-found": "Nesprávny e-mail alebo heslo.",
    "auth/wrong-password": "Nesprávny e-mail alebo heslo.",
    "auth/too-many-requests": "Príliš veľa pokusov. Skús to neskôr.",
    "auth/popup-closed-by-user": "Prihlásenie bolo zrušené.",
    "auth/cancelled-popup-request": "Prihlásenie bolo zrušené.",
    "auth/network-request-failed": "Chyba siete. Skontroluj pripojenie.",
    "permission-denied": "Nemáš oprávnenie. Skontroluj Firestore pravidlá."
  };
  return map[err.code] || `Niečo sa pokazilo (${err.code || err.message}).`;
}

function showMsg(el, text) {
  el.textContent = text || "";
  show(el, Boolean(text));
}

function safeUrl(raw) {
  // Povolíme len http(s). Ak chýba schéma, doplníme https://.
  let value = (raw || "").trim();
  if (!value) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = "https://" + value;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysUntil(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due - today) / 86400000);
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

function initials(name) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// ---------------------------------------------------------------------------
// Prihlásenie
// ---------------------------------------------------------------------------
function setRegisterMode(on) {
  registerMode = on;
  show($("name-row"), on);
  $("auth-submit").textContent = on ? "Vytvoriť účet" : "Prihlásiť sa";
  $("auth-toggle").textContent = on ? "Už máš účet? Prihlás sa" : "Nemáš účet? Zaregistruj sa";
  $("auth-password").autocomplete = on ? "new-password" : "current-password";
  show($("reset-link"), !on);
  show($("reset-sep"), !on);
  showMsg($("auth-error"), "");
}

$("auth-toggle").addEventListener("click", (e) => {
  e.preventDefault();
  setRegisterMode(!registerMode);
});

$("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  showMsg($("auth-error"), "");
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  const name = $("auth-name").value.trim();
  $("auth-submit").disabled = true;
  try {
    if (registerMode) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    showMsg($("auth-error"), friendlyError(err));
  } finally {
    $("auth-submit").disabled = false;
  }
});

$("google-btn").addEventListener("click", async () => {
  showMsg($("auth-error"), "");
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    showMsg($("auth-error"), friendlyError(err));
  }
});

$("reset-link").addEventListener("click", async (e) => {
  e.preventDefault();
  const email = $("auth-email").value.trim();
  if (!email) {
    showMsg($("auth-error"), "Najprv zadaj e-mail, na ktorý pošleme odkaz.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showMsg($("auth-error"), "");
    alert("Ak účet existuje, poslali sme naň e-mail s odkazom na obnovu hesla.");
  } catch (err) {
    showMsg($("auth-error"), friendlyError(err));
  }
});

$("signout-btn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (unsubscribeItems) { unsubscribeItems(); unsubscribeItems = null; }

  if (!user) {
    items = [];
    show($("app-view"), false);
    show($("auth-view"), true);
    return;
  }

  show($("auth-view"), false);
  show($("app-view"), true);
  showMsg($("load-error"), "");
  $("status").textContent = "Načítavam…";

  await ensureProfile(user);
  renderUser();
  subscribeItems(user.uid);
});

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------
let profile = { displayName: "", school: "" };

async function ensureProfile(user) {
  const ref = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      profile = { displayName: "", school: "", ...snap.data() };
    } else {
      profile = {
        displayName: user.displayName || (user.email || "").split("@")[0],
        school: ""
      };
      await setDoc(ref, { ...profile, email: user.email || "", createdAt: serverTimestamp() });
    }
  } catch (err) {
    showMsg($("load-error"), friendlyError(err));
    profile = { displayName: user.displayName || "", school: "" };
  }
}

function renderUser() {
  const name = profile.displayName || currentUser.displayName || currentUser.email || "Používateľ";
  $("user-name").textContent = name;
  const avatar = $("avatar");
  avatar.textContent = "";
  if (currentUser.photoURL) {
    const img = document.createElement("img");
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.src = currentUser.photoURL;
    avatar.appendChild(img);
  } else {
    avatar.textContent = initials(name);
  }
}

$("profile-btn").addEventListener("click", () => {
  $("profile-name").value = profile.displayName || "";
  $("profile-school").value = profile.school || "";
  showMsg($("profile-error"), "");
  $("profile-dialog").showModal();
});
$("profile-cancel").addEventListener("click", () => $("profile-dialog").close());

$("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const displayName = $("profile-name").value.trim();
  const school = $("profile-school").value.trim();
  if (!displayName) return;
  try {
    await setDoc(doc(db, "users", currentUser.uid), { displayName, school }, { merge: true });
    profile = { ...profile, displayName, school };
    renderUser();
    $("profile-dialog").close();
  } catch (err) {
    showMsg($("profile-error"), friendlyError(err));
  }
});

// ---------------------------------------------------------------------------
// Položky (Firestore: users/{uid}/items/{id})
// ---------------------------------------------------------------------------
function itemsCol() {
  return collection(db, "users", currentUser.uid, "items");
}

function subscribeItems(uid) {
  unsubscribeItems = onSnapshot(
    itemsCol(),
    (snap) => {
      // Ak sa medzitým prihlásil niekto iný, výsledok ignorujeme.
      if (!currentUser || currentUser.uid !== uid) return;
      items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      showMsg($("load-error"), "");
      render();
    },
    (err) => {
      $("status").textContent = "";
      showMsg($("load-error"), friendlyError(err));
    }
  );
}

function render() {
  refreshSubjects();

  const q = $("search").value.trim().toLowerCase();
  const type = $("filter-type").value;
  const subject = $("filter-subject").value;
  const sort = $("sort").value;

  let view = items.filter((it) => {
    if (type && it.type !== type) return false;
    if (subject && (it.subject || "") !== subject) return false;
    if (q) {
      const hay = [it.title, it.subject, it.content, it.url].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const created = (it) => it.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER; // čakajúce zápisy sú najnovšie
  view.sort((a, b) => {
    if (sort === "title") return (a.title || "").localeCompare(b.title || "", "sk");
    if (sort === "due") {
      const ad = a.due || "9999-99-99";
      const bd = b.due || "9999-99-99";
      return ad === bd ? created(b) - created(a) : ad.localeCompare(bd);
    }
    return created(b) - created(a);
  });

  const list = $("list");
  list.replaceChildren(...view.map(renderCard));
  show($("empty"), items.length === 0);
  $("status").textContent = items.length
    ? `Zobrazených ${view.length} z ${items.length}`
    : "";
}

function refreshSubjects() {
  const subjects = [...new Set(items.map((i) => (i.subject || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "sk"));

  const select = $("filter-subject");
  const selected = select.value;
  select.replaceChildren(new Option("Všetky predmety", ""));
  subjects.forEach((s) => select.appendChild(new Option(s, s)));
  select.value = subjects.includes(selected) ? selected : "";

  $("subject-list").replaceChildren(...subjects.map((s) => new Option(s)));
}

function renderCard(it) {
  const card = document.createElement("article");
  card.className = "card" + (it.type === "task" && it.done ? " done" : "");

  const head = document.createElement("div");
  head.className = "card-head";

  if (it.type === "task") {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = Boolean(it.done);
    cb.setAttribute("aria-label", "Hotovo");
    cb.addEventListener("change", () => toggleDone(it, cb));
    head.appendChild(cb);
  }

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = it.title || "(bez názvu)";
  head.appendChild(title);
  card.appendChild(head);

  const meta = document.createElement("div");
  meta.className = "card-meta";
  const addChip = (text, extra = "") => {
    const c = document.createElement("span");
    c.className = "chip " + extra;
    c.textContent = text;
    meta.appendChild(c);
  };
  addChip(TYPE_LABEL[it.type] || "Položka");
  if (it.subject) addChip(it.subject);
  if (it.type === "task" && it.due) {
    const d = daysUntil(it.due);
    let cls = "chip-due";
    let label = `Termín: ${formatDate(it.due)}`;
    if (!it.done && d < 0) { cls += " overdue"; label += " (po termíne)"; }
    else if (!it.done && d <= 2) { cls += " soon"; label += d === 0 ? " (dnes)" : " (čoskoro)"; }
    addChip(label, cls);
  }
  card.appendChild(meta);

  if (it.type === "link" && it.url) {
    const href = safeUrl(it.url);
    if (href) {
      const a = document.createElement("a");
      a.className = "card-link";
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = href;
      card.appendChild(a);
    }
  }

  if (it.content) {
    const p = document.createElement("p");
    p.className = "card-content";
    p.textContent = it.content;
    card.appendChild(p);
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "btn btn-small";
  edit.textContent = "Upraviť";
  edit.addEventListener("click", () => openItemDialog(it));
  const del = document.createElement("button");
  del.type = "button";
  del.className = "btn btn-small btn-danger";
  del.textContent = "Zmazať";
  del.addEventListener("click", () => removeItem(it));
  actions.append(edit, del);
  card.appendChild(actions);

  return card;
}

async function toggleDone(it, checkbox) {
  try {
    await updateDoc(doc(db, "users", currentUser.uid, "items", it.id), {
      done: checkbox.checked,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    checkbox.checked = !checkbox.checked;
    showMsg($("load-error"), friendlyError(err));
  }
}

async function removeItem(it) {
  if (!confirm(`Naozaj zmazať „${it.title || "položku"}“?`)) return;
  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "items", it.id));
  } catch (err) {
    showMsg($("load-error"), friendlyError(err));
  }
}

// ---------------------------------------------------------------------------
// Dialóg položky
// ---------------------------------------------------------------------------
function syncTypeFields() {
  const t = $("item-type").value;
  show($("row-url"), t === "link");
  show($("row-due"), t === "task");
}
$("item-type").addEventListener("change", syncTypeFields);

function openItemDialog(it = null) {
  editingId = it ? it.id : null;
  $("item-dialog-title").textContent = it ? "Upraviť položku" : "Nová položka";
  $("item-type").value = it?.type || "note";
  $("item-title").value = it?.title || "";
  $("item-subject").value = it?.subject || "";
  $("item-url").value = it?.url || "";
  $("item-due").value = it?.due || "";
  $("item-content").value = it?.content || "";
  showMsg($("item-error"), "");
  syncTypeFields();
  $("item-dialog").showModal();
  $("item-title").focus();
}

$("add-btn").addEventListener("click", () => openItemDialog());
$("item-cancel").addEventListener("click", () => $("item-dialog").close());

$("item-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  showMsg($("item-error"), "");

  const type = $("item-type").value;
  const title = $("item-title").value.trim();
  if (!title) return;

  const data = {
    type,
    title,
    subject: $("item-subject").value.trim(),
    content: $("item-content").value,
    updatedAt: serverTimestamp()
  };

  if (type === "link") {
    const raw = $("item-url").value.trim();
    const href = raw ? safeUrl(raw) : "";
    if (raw && !href) {
      showMsg($("item-error"), "Adresa odkazu musí byť platná (http alebo https).");
      return;
    }
    data.url = href || "";
  } else {
    data.url = "";
  }

  data.due = type === "task" ? $("item-due").value : "";

  $("item-save").disabled = true;
  try {
    if (editingId) {
      await updateDoc(doc(db, "users", currentUser.uid, "items", editingId), data);
    } else {
      await addDoc(itemsCol(), { ...data, done: false, createdAt: serverTimestamp() });
    }
    $("item-dialog").close();
  } catch (err) {
    showMsg($("item-error"), friendlyError(err));
  } finally {
    $("item-save").disabled = false;
  }
});

// ---------------------------------------------------------------------------
// Filtre
// ---------------------------------------------------------------------------
["search", "filter-type", "filter-subject", "sort"].forEach((id) =>
  $(id).addEventListener("input", render)
);
