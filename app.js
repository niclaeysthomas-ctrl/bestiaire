/* ===================== BESTIAIRE ===================== */
const A = window.ANIMAUX, D = window.DOSSIERS;
const byId = {}; A.forEach(a => byId[a.id] = a);
const KEY = "bestiaire_v1";

/* ---------- état ---------- */
const DEF = {
  xp: 0, streak: 0, best: 0, last: null,
  seen: {},        // id -> {d: date, n: note, x: 1 si trouvée en expédition}
  hist: {},        // date -> id
  exped: {},       // date -> nombre d'expéditions ce jour-là
  queue: null,
  wish: [],        // ids priorisés
  theme: null,     // groupe priorisé
  lus: [],         // dossiers lus
  quiz: {},        // date -> {ok, tot}
  qOk: 0, qTot: 0, parfaits: 0,
  badges: [],
  lex: {},         // id d'espèce -> {ease, interval, reps, due, lapses, introduced}
  lexNew: {},      // date -> nombre de mots introduits ce jour-là
  lexRate: 6,      // nouveaux mots par jour
  lexDone: 0       // révisions cumulées
};
let S = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEF);
    return Object.assign(structuredClone(DEF), JSON.parse(raw));
  } catch (e) { return structuredClone(DEF); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

/* ---------- utilitaires ---------- */
const $ = s => document.querySelector(s);
const app = $("#app");
function today() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function dayN(s) { const [y, m, d] = s.split("-").map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor((r ? r() : Math.random()) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(arr, n, r) { return shuffle(arr, r).slice(0, n); }

const UICN = { LC: "Préoccupation mineure", NT: "Quasi menacée", VU: "Vulnérable", EN: "En danger", CR: "En danger critique", DD: "Données insuffisantes", EW: "Éteinte à l'état sauvage" };
const RARN = { 1: "Commun", 2: "Peu commun", 3: "Rare", 4: "Très rare", 5: "Légendaire" };
const GROUPES = ["Mammifère", "Oiseau", "Reptile", "Amphibien", "Poisson", "Invertébré"];
const PLUR = { "Mammifère": "Mammifères", "Oiseau": "Oiseaux", "Reptile": "Reptiles", "Amphibien": "Amphibiens", "Poisson": "Poissons", "Invertébré": "Invertébrés" };
const RANGS = [[0, "Curieux"], [150, "Pisteur"], [400, "Explorateur"], [800, "Naturaliste"], [1400, "Zoologiste"], [2200, "Éthologue"], [3200, "Taxonomiste"], [4500, "Grand Bestiaire"]];
function rang(xp) { let r = RANGS[0]; for (const x of RANGS) if (xp >= x[0]) r = x; return r; }
function rangSuiv(xp) { for (const x of RANGS) if (xp < x[0]) return x; return null; }
function fmtPoids(kg) {
  if (kg >= 1000) return (kg / 1000) + " t";
  if (kg >= 1) return kg + " kg";
  if (kg >= 0.001) return Math.round(kg * 1000) + " g";
  return (kg * 1e6 < 1 ? (kg * 1e9).toFixed(0) + " ng" : (kg * 1e6).toFixed(1) + " mg");
}

/* ---------- streak ---------- */
(function initStreak() {
  const t = today();
  if (S.last !== t) {
    if (S.last && dayN(t) - dayN(S.last) === 1) S.streak++;
    else if (S.last) S.streak = 1;
    else S.streak = 1;
    S.last = t;
    if (S.streak > S.best) S.best = S.streak;
    save();
  }
})();

/* ---------- animal du jour ---------- */
function buildQueue() {
  const r = rng(hash("bestiaire-queue"));
  const g = [1, 2, 3, 4, 5].map(n => shuffle(A.filter(a => a.rar === n).map(a => a.id), r));
  // progression douce : les communs d'abord, les légendaires plus tard
  return [].concat(g[0], g[1], g[2].slice(0, 8), g[3].slice(0, 4), g[2].slice(8), g[4].slice(0, 3), g[3].slice(4), g[4].slice(3));
}
/* Prochaine espèce à révéler, dans l'ordre : souhaits étoilés, groupe prioritaire,
   file de progression. Renvoie null quand tout le bestiaire a été découvert. */
function prochaineEspece() {
  if (!S.queue) S.queue = buildQueue();
  const pris = new Set(Object.keys(S.seen));
  Object.values(S.hist).forEach(i => pris.add(i));
  for (const w of S.wish) if (!pris.has(w) && byId[w]) return w;
  if (S.theme) { const c = A.filter(a => a.gr === S.theme && !pris.has(a.id)); if (c.length) return c[Math.floor(Math.random() * c.length)].id; }
  const q = S.queue.find(x => !pris.has(x));
  if (q) return q;
  const reste = A.filter(a => !pris.has(a.id));
  return reste.length ? reste[Math.floor(Math.random() * reste.length)].id : null;
}
function animalDuJour() {
  const t = today();
  if (S.hist[t] && byId[S.hist[t]]) return byId[S.hist[t]];
  const id = prochaineEspece() || A[Math.floor(Math.random() * A.length)].id;
  S.hist[t] = id; save();
  return byId[id];
}
function resteADecouvrir() { return A.length - nbVus(); }
function decouvrir(id, exped) {
  if (!byId[id] || S.seen[id]) return false;
  S.seen[id] = { d: today(), n: "", x: exped ? 1 : 0 };
  S.wish = S.wish.filter(x => x !== id);
  if (exped) { const t = today(); S.exped[t] = (S.exped[t] || 0) + 1; }
  save();
  addXp(exped ? 4 : 10, exped ? "expédition" : "espèce du jour");
  return true;
}
function expedition(id) {
  const cible = id || prochaineEspece();
  if (!cible) { closeModal(); return toast("Tu as découvert les " + A.length + " espèces du bestiaire."); }
  closeModal();
  if (!decouvrir(cible, true)) return;
  render();
  ouvrirAnimal(cible);
}

/* ---------- XP & badges ---------- */
function addXp(n, why) {
  S.xp += n; save(); majTop();
  if (why) toast("+" + n + " ✦ " + why);
  checkBadges();
}
const BADGES = [
  ["b1", "🐾", "Première rencontre", "Découvrir un premier animal", s => nbVus() >= 1],
  ["b10", "📓", "Carnet ouvert", "Découvrir 10 animaux", s => nbVus() >= 10],
  ["b25", "🗂️", "Collectionneur", "Découvrir 25 animaux", s => nbVus() >= 25],
  ["b50", "📚", "Bestiaire fourni", "Découvrir 50 animaux", s => nbVus() >= 50],
  ["ball", "🏛️", "Bestiaire complet", "Découvrir toutes les espèces", s => nbVus() >= A.length],
  ["btour", "🌍", "Tour du vivant", "Au moins un animal de chaque groupe", s => GROUPES.every(g => A.some(a => a.gr === g && S.seen[a.id]))],
  ["bmam", "🦁", "Spécialiste mammifères", "12 mammifères découverts", s => nbGr("Mammifère") >= 12],
  ["bois", "🪶", "Spécialiste oiseaux", "8 oiseaux découverts", s => nbGr("Oiseau") >= 8],
  ["brep", "🐍", "Spécialiste reptiles", "6 reptiles découverts", s => nbGr("Reptile") >= 6],
  ["bpoi", "🐟", "Spécialiste poissons", "6 poissons découverts", s => nbGr("Poisson") >= 6],
  ["binv", "🦑", "Spécialiste invertébrés", "10 invertébrés découverts", s => nbGr("Invertébré") >= 10],
  ["bleg", "💎", "Trouvaille rare", "Découvrir une espèce légendaire", s => Object.keys(S.seen).some(i => byId[i] && byId[i].rar === 5)],
  ["bleg5", "👑", "Chasseur de raretés", "5 espèces légendaires", s => Object.keys(S.seen).filter(i => byId[i] && byId[i].rar === 5).length >= 5],
  ["bs3", "🔥", "Régulier", "3 jours d'affilée", s => S.best >= 3],
  ["bs7", "🔥", "Assidu", "7 jours d'affilée", s => S.best >= 7],
  ["bs30", "☄️", "Increvable", "30 jours d'affilée", s => S.best >= 30],
  ["bq1", "🎯", "Sans faute", "Un quiz du jour parfait", s => S.parfaits >= 1],
  ["bq5", "🏹", "Machine à quiz", "5 quiz parfaits", s => S.parfaits >= 5],
  ["bq100", "💯", "Centurion", "100 bonnes réponses", s => S.qOk >= 100],
  ["bd5", "📖", "Studieux", "5 dossiers lus", s => S.lus.length >= 5],
  ["bdall", "🎓", "Érudit", "Tous les dossiers lus", s => S.lus.length >= D.length],
  ["bnote", "✍️", "Carnet de terrain", "Écrire une note sur une fiche", s => Object.values(S.seen).some(v => v.n && v.n.trim())],
  ["bexp1", "🧭", "Première expédition", "Découvrir une espèce hors de la carte du jour", s => nbExped() >= 1],
  ["bexp10", "🗺️", "Explorateur de terrain", "10 espèces trouvées en expédition", s => nbExped() >= 10],
  ["bexp50", "⛺", "Grande traversée", "50 espèces trouvées en expédition", s => nbExped() >= 50],
  ["bexpj5", "🎒", "Journée chargée", "5 expéditions dans la même journée", s => Object.values(S.exped).some(n => n >= 5)],
  ["blex1", "📇", "Premier mot", "Réviser un mot du lexique", s => S.lexDone >= 1],
  ["blex25", "🔤", "Vocabulaire de terrain", "25 mots introduits dans le lexique", s => lexIntroduits() >= 25],
  ["blexa25", "🧠", "Ça rentre", "25 mots acquis (revus à plus de 21 jours)", s => lexAcquis() >= 25],
  ["blexa100", "🎓", "Langue du naturaliste", "100 mots acquis", s => lexAcquis() >= 100],
  ["blex200", "♾️", "Régulier au lexique", "200 révisions cumulées", s => S.lexDone >= 200]
];
function nbVus() { return Object.keys(S.seen).length; }
function nbExped() { return Object.values(S.seen).filter(v => v && v.x).length; }
function nbGr(g) { return Object.keys(S.seen).filter(i => byId[i] && byId[i].gr === g).length; }
function checkBadges() {
  let nouveau = null;
  for (const b of BADGES) if (!S.badges.includes(b[0])) { try { if (b[4](S)) { S.badges.push(b[0]); nouveau = b; } } catch (e) {} }
  if (nouveau) { save(); setTimeout(() => toast(nouveau[1] + "  Badge : " + nouveau[2]), 900); }
}

/* ===================== LEXIQUE — répétition espacée =====================
   Un mot par espèce. Il n'entre dans le paquet que lorsque l'espèce a été
   découverte : jamais de vocabulaire venu d'une fiche non lue.
   Moteur SM-2 identique à celui de 990 et CUMBRE — mêmes notes, mêmes intervalles. */
const JOUR = 86400000;
function motDe(id) { const a = byId[id]; return a && a.v && a.v[0] ? { mot: a.v[0][0], def: a.v[0][1], a } : null; }
function lexEtat(id) { return S.lex[id] || { ease: 2.5, interval: 0, reps: 0, due: 0, lapses: 0, introduced: false }; }
function lexDispo() { return Object.keys(S.seen).filter(id => motDe(id)); }
function lexNouveauxRestants() {
  const faits = S.lexNew[today()] || 0;
  const jamais = lexDispo().filter(id => !lexEtat(id).introduced).length;
  return Math.min(Math.max(0, S.lexRate - faits), jamais);
}
function lexAReviser() {
  const now = Date.now();
  return lexDispo().filter(id => { const c = lexEtat(id); return c.introduced && c.due <= now; });
}
function lexAcquis() { return lexDispo().filter(id => lexEtat(id).interval >= 21).length; }
function lexIntroduits() { return lexDispo().filter(id => lexEtat(id).introduced).length; }
function lexStatut(id) {
  if (!S.seen[id]) return ["st-lock", "verrouillé"];
  const c = lexEtat(id);
  if (!c.introduced) return ["st-neuf", "nouveau"];
  if (c.interval >= 21) return ["st-acquis", "acquis"];
  return ["st-cours", "en cours"];
}
const LEX_MAX = 365;   // un mot revu au moins une fois par an ne se perd pas
/* Prochain intervalle, en jours. Deux garde-fous par rapport au SM-2 brut :
   - « Difficile » doit gagner au moins un jour, sinon ×1,2 sur 1 jour arrondit
     à 1 et la carte reste bloquée à vie ;
   - plafond à un an, sinon quelques « Facile » envoient la carte à dix ans. */
function lexProchainIv(c, note) {
  if (c.interval < 1) return note === 3 ? 4 : 1;
  const mult = note === 1 ? 1.2 : note === 2 ? c.ease : c.ease * 1.3;
  return Math.min(LEX_MAX, Math.max(c.interval + 1, Math.round(c.interval * mult)));
}
function lexNoter(id, note) {
  const c = lexEtat(id), now = Date.now();
  if (!c.introduced) { c.introduced = true; const t = today(); S.lexNew[t] = (S.lexNew[t] || 0) + 1; }
  if (note === 0) {
    c.reps = 0; c.lapses += 1;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.interval = 0;
    c.due = now + 60000;                     // revient dans la même session
  } else {
    c.interval = lexProchainIv(c, note);
    if (note === 1) c.ease = Math.max(1.3, c.ease - 0.15);
    if (note === 3) c.ease = Math.min(3.2, c.ease + 0.15);
    c.reps += 1;
    c.due = now + Math.max(1, c.interval) * JOUR;
  }
  S.lex[id] = c; S.lexDone++;
  save(); addXp(note === 0 ? 1 : 3);         // silencieux : pas de toast à chaque carte
}
function lexApercu(id, note) {               // intervalle annoncé sur les boutons
  if (note === 0) return "< 1 j";
  const iv = Math.max(1, lexProchainIv(lexEtat(id), note));
  if (iv >= 365) return "1 an";
  if (iv >= 30) return Math.round(iv / 30) + " mois";
  return iv + " j";
}

/* ---------- chrome ---------- */
function majTop() {
  $("#tbRank").textContent = rang(S.xp)[1];
  $("#tbStreak").innerHTML = "<span>🔥</span><b>" + S.streak + "</b>";
  $("#tbXp").innerHTML = "<span>✦</span><b>" + S.xp + "</b>";
}
let toastT;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.add("hidden"), 2600);
}
function modal(html) {
  $("#modalBox").innerHTML = '<div class="grab"></div>' + html;
  $("#modal").classList.remove("hidden");
  $("#modalBox").scrollTop = 0;
}
function closeModal() { $("#modal").classList.add("hidden"); }
$("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });

/* ---------- fragments ---------- */
function carte(a, opts = {}) {
  return `<div class="card rar-${a.rar}">
    <div class="card-art b-${a.bio}"><div class="rings"></div><div class="halo"></div><div class="glyph">${a.emo}</div></div>
    <div class="card-body">
      <h3 class="card-nom">${a.nom}</h3>
      <div class="card-sci">${a.sci}</div>
      <div class="card-tags">
        <span class="tag k">${a.gr}</span><span class="tag">${a.fam}</span>
        <span class="tag">${UICN[a.uicn]}</span>
        <span class="tag" style="display:flex;gap:6px;align-items:center">${RARN[a.rar]}
          <span class="rar-dots">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= a.rar ? "on" : ""}"></i>`).join("")}</span></span>
      </div>
    </div></div>`;
}
function fiche(a) {
  // Sans vitesse connue, la longévité prend toute la ligne : pas de demi-case vide.
  const vitesse = a.vit ? `<div><div class="k">Vitesse</div><div class="v">${a.vit} km/h</div></div>` : "";
  const longevite = `<div class="${a.vit ? "" : "full"}"><div class="k">Longévité</div><div class="v">${a.vie >= 900 ? "indéfinie" : "~" + a.vie + " ans"}</div></div>`;
  return `<p style="font-size:15.5px;line-height:1.6;margin:16px 0 4px">${a.res}</p>
  <h2 class="sec">Carte d'identité</h2>
  <div class="rows">
    <div><div class="k">Groupe</div><div class="v">${a.gr}</div></div>
    <div><div class="k">Ordre</div><div class="v">${a.ord}</div></div>
    <div><div class="k">Famille</div><div class="v">${a.fam}</div></div>
    <div><div class="k">Régime</div><div class="v">${a.reg}</div></div>
    <div><div class="k">Taille</div><div class="v">${a.taille}</div></div>
    <div><div class="k">Masse</div><div class="v">${fmtPoids(a.poidsKg)}</div></div>
    ${vitesse}
    ${longevite}
    <div class="full"><div class="k">Habitat</div><div class="v">${a.hab}</div></div>
    <div class="full"><div class="k">Répartition</div><div class="v">${a.rep}</div></div>
    <div class="full"><div class="k">Statut UICN</div><div class="v">${a.uicn} — ${UICN[a.uicn]}</div></div>
  </div>
  <h2 class="sec">Ce qu'il faut savoir</h2>
  ${a.f.map(f => `<div class="fact"><span class="lvl lvl-${f[1]}">${f[1]}</span><p>${f[0]}</p></div>`).join("")}
  <h2 class="sec">Vocabulaire</h2>
  ${a.v.map((v, i) => { const [cls, lbl] = lexStatut(a.id);
    return `<div class="vocab"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <b>${v[0]}</b>${i === 0 && S.seen[a.id] ? `<span class="lr-s ${cls}">${lbl}</span>` : ""}</div><p>${v[1]}</p></div>`; }).join("")}
  ${S.seen[a.id] && a.v.length ? `<div class="hint" style="margin:-2px 0 2px">Ce mot est dans ton lexique : il te sera reproposé à intervalles croissants.</div>` : ""}
  ${a.d && a.d.length ? `<h2 class="sec">Dossiers liés</h2>${a.d.filter(id => D.some(d => d.id === id)).map(id => { const d = D.find(x => x.id === id); return `<button class="doss" onclick="ouvrirDossier('${id}')"><span class="di">${d.emo}</span><div class="dn">${d.titre}</div><div class="dd">${d.sub}</div></button>`; }).join("")}` : ""}`;
}

/* ===================== ONGLET : AUJOURD'HUI ===================== */
function renderJour() {
  const a = animalDuJour(), t = today();
  const vu = !!S.seen[a.id];
  const dateTxt = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const q = S.quiz[t];

  if (!vu) {
    app.innerHTML = `<div class="hint" style="text-transform:capitalize;margin-bottom:14px">${dateTxt}</div>
    <div class="card rar-${a.rar}" style="cursor:pointer" onclick="revele()">
      <div class="card-art b-partout" style="height:260px">
        <div class="rings"></div><div class="halo"></div>
        <div class="glyph" style="font-size:80px;filter:brightness(0) saturate(0) opacity(.35)">${a.emo}</div>
      </div>
      <div class="card-body" style="text-align:center">
        <h3 class="card-nom">Espèce du jour</h3>
        <div class="card-sci">non identifiée</div>
        <div class="btn gold" style="margin-top:16px">Révéler la fiche</div>
      </div></div>
    <p class="hint" style="margin-top:16px;text-align:center">Une nouvelle espèce chaque jour. Reviens demain pour la suivante — et garde ta série.</p>`;
    return;
  }

  const note = (S.seen[a.id] && S.seen[a.id].n) || "";
  const reste = resteADecouvrir();
  const trouvees = Object.keys(S.seen).filter(i => S.seen[i].d === t && i !== a.id).map(i => byId[i]).filter(Boolean);
  app.innerHTML = `<div class="hint" style="text-transform:capitalize;margin-bottom:14px">${dateTxt}</div>
    ${carte(a)}
    ${fiche(a)}
    <h2 class="sec">Expédition</h2>
    <div class="panel">
      ${reste ? `<div class="hint">La carte du jour, c'est le rituel. Mais rien ne t'oblige à t'arrêter là : pars en expédition autant de fois que tu veux. Une trouvaille rapporte moins qu'une carte du jour, et elle entre dans le bestiaire et dans les quiz exactement pareil.</div>
      <button class="btn gold" style="margin-top:12px;line-height:1.25" onclick="expedition()">Partir en expédition
        <span style="display:block;font-weight:500;font-size:12px;opacity:.72;margin-top:2px">${reste} espèce${reste > 1 ? "s" : ""} encore inconnue${reste > 1 ? "s" : ""}</span></button>
      ${S.theme ? `<div class="hint" style="margin-top:10px">Priorité en cours : ${PLUR[S.theme].toLowerCase()}. ${S.wish.length ? `${S.wish.length} carte${S.wish.length > 1 ? "s" : ""} étoilée${S.wish.length > 1 ? "s" : ""} passeront d'abord.` : ""}</div>`
        : S.wish.length ? `<div class="hint" style="margin-top:10px">${S.wish.length} carte${S.wish.length > 1 ? "s" : ""} étoilée${S.wish.length > 1 ? "s" : ""} en tête de file.</div>` : ""}`
      : `<div class="hint">Tu as découvert les ${A.length} espèces du bestiaire. Il n'y a plus rien à trouver — il reste tout à réviser.</div>`}
      ${trouvees.length ? `<div class="hint" style="margin:14px 0 8px">Trouvé aujourd'hui — ${trouvees.length}</div>
        <div class="grid">${trouvees.map(x => `<button class="mini rar-${x.rar}" onclick="ouvrirAnimal('${x.id}')"><div class="m-art b-${x.bio}">${x.emo}</div><div class="m-bar"></div><div class="m-nom">${x.nom}</div></button>`).join("")}</div>` : ""}
    </div>
    ${(() => { const n = lexAReviser().length + lexNouveauxRestants();
      return n ? `<h2 class="sec">Lexique</h2>
      <div class="panel"><div class="hint">${n} mot${n > 1 ? "s" : ""} t'attend${n > 1 ? "ent" : ""} au lexique.</div>
      <button class="btn sm" style="margin-top:10px" onclick="setTab('lexique')">Aller réviser</button></div>` : ""; })()}
    <h2 class="sec">Quiz du jour</h2>
    ${q ? `<div class="panel" style="text-align:center">
        <div style="font-family:var(--serif);font-size:30px;color:var(--or2)">${q.ok}/${q.tot}</div>
        <div class="hint" style="margin-top:4px">Quiz du jour terminé. Rendez-vous demain.</div>
        <button class="btn ghost sm" style="margin-top:12px" onclick="setTab('quiz')">Aller au mode entraînement</button></div>`
      : `<button class="btn gold" onclick="lancerQuizJour()">Commencer — 6 questions</button>`}
    <h2 class="sec">Ton carnet</h2>
    <textarea class="note" id="noteBox" placeholder="Ce que tu savais déjà, ce que tu veux vérifier, ce qui te paraît louche…">${esc(note)}</textarea>
    <button class="btn ghost sm" style="margin-top:8px" onclick="saveNote('${a.id}')">Enregistrer la note</button>`;
}
function revele() {
  decouvrir(animalDuJour().id, false);
  renderJour(); window.scrollTo(0, 0);
}
function saveNote(id) {
  const v = $("#noteBox").value;
  if (!S.seen[id]) S.seen[id] = { d: today(), n: "" };
  S.seen[id].n = v; save(); checkBadges(); toast("Note enregistrée");
}

/* ===================== ONGLET : BESTIAIRE ===================== */
let filtre = { gr: null, q: "" };
function renderBestiaire() {
  const vus = nbVus();
  let liste = A.slice();
  if (filtre.gr) liste = liste.filter(a => a.gr === filtre.gr);
  if (filtre.q) {
    const q = filtre.q.toLowerCase();
    liste = liste.filter(a => S.seen[a.id] && (a.nom.toLowerCase().includes(q) || a.sci.toLowerCase().includes(q) || a.fam.toLowerCase().includes(q)));
  }
  app.innerHTML = `
  <div class="stat-grid">
    <div class="stat"><b>${vus}</b><span>découverts</span></div>
    <div class="stat"><b>${A.length - vus}</b><span>à trouver</span></div>
    <div class="stat"><b>${Math.round(vus / A.length * 100)}%</b><span>du bestiaire</span></div>
  </div>
  <div class="bar" style="margin:12px 0 16px"><i style="width:${vus / A.length * 100}%"></i></div>
  <input class="search" id="srch" placeholder="Chercher dans les fiches découvertes…" value="${esc(filtre.q)}">
  <div class="chips" style="margin-top:10px">
    <button class="${!filtre.gr ? "on" : ""}" onclick="setFiltre(null)">Tout</button>
    ${GROUPES.map(g => `<button class="${filtre.gr === g ? "on" : ""}" onclick="setFiltre('${g}')">${PLUR[g]} (${nbGr(g)}/${A.filter(a => a.gr === g).length})</button>`).join("")}
  </div>
  <div class="grid" style="margin-top:6px">
    ${liste.map(a => S.seen[a.id]
      ? `<button class="mini rar-${a.rar}" onclick="ouvrirAnimal('${a.id}')"><div class="m-art b-${a.bio}">${a.emo}</div><div class="m-bar"></div><div class="m-nom">${a.nom}</div></button>`
      : `<button class="mini locked rar-${a.rar} ${S.wish.includes(a.id) ? "wish" : ""}" onclick="ouvrirInconnu('${a.id}')"><div class="m-art b-${a.bio}"><span class="sil">${a.emo}</span></div><div class="m-bar"></div><div class="m-nom">${S.wish.includes(a.id) ? "★ en attente" : "espèce inconnue"}</div></button>`).join("")}
  </div>
  <h2 class="sec">Ce que tu veux explorer</h2>
  <div class="panel">
    <div class="hint">Choisis un groupe : les prochaines espèces — carte du jour comme expéditions — y seront piochées en priorité. Tu peux aussi ouvrir une carte inconnue pour la découvrir tout de suite, ou l'étoiler pour qu'elle passe en tête.</div>
    <div class="chips" style="margin:12px -15px 0;padding-left:15px;padding-right:15px">
      <button class="${!S.theme ? "on" : ""}" onclick="setTheme(null)">Au hasard</button>
      ${GROUPES.map(g => `<button class="${S.theme === g ? "on" : ""}" onclick="setTheme('${g}')">${PLUR[g]}</button>`).join("")}
    </div>
    ${S.wish.length ? `<div class="hint" style="margin-top:12px">★ ${S.wish.length} espèce${S.wish.length > 1 ? "s" : ""} en attente de passage.</div>` : ""}
  </div>`;
  const s = $("#srch");
  s.addEventListener("input", e => { filtre.q = e.target.value; const p = e.target.selectionStart; renderBestiaire(); const n = $("#srch"); n.focus(); n.setSelectionRange(p, p); });
}
function setFiltre(g) { filtre.gr = g; renderBestiaire(); }
function setTheme(g) { S.theme = g; save(); renderBestiaire(); toast(g ? "Priorité : " + g + "s" : "Priorité remise au hasard"); }
function ouvrirAnimal(id) {
  const a = byId[id], note = (S.seen[id] && S.seen[id].n) || "";
  modal(carte(a) + fiche(a) + `<h2 class="sec">Ton carnet</h2>
    <textarea class="note" id="noteBox" placeholder="Tes notes sur cette espèce…">${esc(note)}</textarea>
    <button class="btn ghost sm" style="margin-top:8px" onclick="saveNote('${id}')">Enregistrer</button>
    <button class="btn ghost" style="margin-top:16px" onclick="closeModal()">Fermer</button>`);
}
function ouvrirInconnu(id) {
  const a = byId[id], dedans = S.wish.includes(id);
  modal(`<div class="card rar-${a.rar}">
    <div class="card-art b-partout" style="height:150px"><div class="rings"></div><div class="glyph" style="font-size:64px;filter:brightness(0) saturate(0) opacity(.35)">${a.emo}</div></div>
    <div class="card-body"><h3 class="card-nom">Espèce non découverte</h3>
    <div class="card-sci">indices disponibles</div></div></div>
    <div class="rows" style="margin-top:14px">
      <div><div class="k">Groupe</div><div class="v">${a.gr}</div></div>
      <div><div class="k">Régime</div><div class="v">${a.reg}</div></div>
      <div class="full"><div class="k">Milieu</div><div class="v">${a.hab}</div></div>
      <div class="full"><div class="k">Rareté</div><div class="v">${RARN[a.rar]}</div></div>
    </div>
    <button class="btn gold" style="margin-top:14px" onclick="expedition('${id}')">Découvrir celle-ci maintenant</button>
    <button class="btn ghost" style="margin-top:9px" onclick="toggleWish('${id}')">${dedans ? "Retirer de la liste d'attente" : "★ Garder pour plus tard, en tête de file"}</button>
    <button class="btn ghost" style="margin-top:9px" onclick="closeModal()">Fermer</button>`);
}
function toggleWish(id) {
  if (S.wish.includes(id)) S.wish = S.wish.filter(x => x !== id);
  else { S.wish.push(id); toast("Elle passera bientôt dans le carnet"); }
  save(); closeModal(); renderBestiaire();
}

/* ===================== ONGLET : DOSSIERS ===================== */
function renderDossiers() {
  app.innerHTML = `<p class="hint">Des enquêtes transversales : familles, mécanismes, records, pièges de raisonnement. Chacune se termine par trois questions.</p>
  <h2 class="sec">${S.lus.length}/${D.length} dossiers lus</h2>
  ${D.map(d => `<button class="doss ${S.lus.includes(d.id) ? "done" : ""}" onclick="ouvrirDossier('${d.id}')">
    <span class="di">${d.emo}</span><div class="dn">${d.titre}</div><div class="dd">${d.sub}</div></button>`).join("")}`;
}
function ouvrirDossier(id) {
  const d = D.find(x => x.id === id);
  const lies = A.filter(a => a.d && a.d.includes(id) && S.seen[a.id]);
  modal(`<div style="font-size:38px;text-align:center">${d.emo}</div>
  <h2 style="font-family:var(--serif);font-size:26px;text-align:center;margin:6px 0 2px">${d.titre}</h2>
  <div class="hint" style="text-align:center;margin-bottom:16px">${d.sub}</div>
  <p style="font-size:15.5px;line-height:1.6">${d.intro}</p>
  ${d.sec.map(s => `<h2 class="sec">${s[0]}</h2><p style="font-size:14.8px;line-height:1.65;margin:0">${s[1]}</p>`).join("")}
  ${lies.length ? `<h2 class="sec">Dans ton bestiaire</h2><div class="grid">${lies.map(a => `<button class="mini rar-${a.rar}" onclick="ouvrirAnimal('${a.id}')"><div class="m-art b-${a.bio}">${a.emo}</div><div class="m-bar"></div><div class="m-nom">${a.nom}</div></button>`).join("")}</div>` : ""}
  <h2 class="sec">Vérification</h2>
  <button class="btn gold" onclick="quizDossier('${id}')">3 questions sur ce dossier</button>
  <button class="btn ghost" style="margin-top:9px" onclick="closeModal()">Fermer</button>`);
}

/* ===================== MOTEUR DE QUIZ ===================== */
function qShuffle(q, r) {           // [texte, choix[], bonne, expl] -> options mélangées
  const bon = q[1][q[2]];
  const ch = shuffle(q[1], r);
  return { t: q[0], c: ch, b: ch.indexOf(bon), e: q[3] };
}
/* Règle : une question ne porte QUE sur des espèces déjà découvertes.
   Les espèces inconnues ne peuvent apparaître que comme noms leurres. */
function autoQ(pool, r, used, loose) {
  const cmp = pool.length >= 4 ? ["poids", "vitesse", "vie"] : [];
  const kinds = cmp.concat(["groupe", "sci", "regime", "uicn", "qui"]);
  for (let essai = 0; essai < 24; essai++) {
    const k = kinds[Math.floor(r() * kinds.length)];
    const cle = q => loose ? q.t + "|" + q.c.join("|") : k;   // strict : un seul type par quiz
    let q = null;
    if (k === "poids") {
      const c = pick(pool.filter(a => a.poidsKg > 0), 4, r);
      if (c.length === 4 && new Set(c.map(a => a.poidsKg)).size === 4) {
        const bon = c.reduce((m, a) => a.poidsKg > m.poidsKg ? a : m);
        q = { t: "Lequel de ces animaux est le plus lourd ?", c: c.map(a => a.nom), b: c.indexOf(bon), e: `${bon.nom} : ${fmtPoids(bon.poidsKg)}. Les autres : ` + c.filter(a => a !== bon).map(a => a.nom + " " + fmtPoids(a.poidsKg)).join(", ") + "." };
      }
    } else if (k === "vitesse") {
      const c = pick(pool.filter(a => a.vit), 4, r);
      if (c.length === 4 && new Set(c.map(a => a.vit)).size === 4) {
        const bon = c.reduce((m, a) => a.vit > m.vit ? a : m);
        q = { t: "Lequel atteint la plus grande vitesse ?", c: c.map(a => a.nom), b: c.indexOf(bon), e: `${bon.nom} : ${bon.vit} km/h. ` + c.filter(a => a !== bon).map(a => a.nom + " " + a.vit).join(", ") + " km/h." };
      }
    } else if (k === "vie") {
      const c = pick(pool.filter(a => a.vie < 900), 4, r);
      if (c.length === 4 && new Set(c.map(a => a.vie)).size === 4) {
        const bon = c.reduce((m, a) => a.vie > m.vie ? a : m);
        q = { t: "Lequel vit le plus longtemps ?", c: c.map(a => a.nom), b: c.indexOf(bon), e: `${bon.nom} : environ ${bon.vie} ans.` };
      }
    } else if (k === "groupe") {
      const a = pool[Math.floor(r() * pool.length)];
      const autres = shuffle(GROUPES.filter(g => g !== a.gr), r).slice(0, 3);
      const ch = shuffle([a.gr].concat(autres), r);
      q = { t: `${a.nom} — à quel groupe appartient cette espèce ?`, c: ch, b: ch.indexOf(a.gr), e: `${a.nom} (${a.sci}) : ${a.gr.toLowerCase()}, famille des ${a.fam.toLowerCase()}.` };
    } else if (k === "sci") {
      const a = pool[Math.floor(r() * pool.length)];
      const d = pick(A.filter(x => x.id !== a.id), 3, r);
      if (d.length === 3) { const ch = shuffle([a.sci].concat(d.map(x => x.sci)), r); q = { t: `${a.nom} — quel est son nom scientifique ?`, c: ch, b: ch.indexOf(a.sci), e: `${a.sci}. Le premier mot est le genre, le second l'épithète d'espèce.` }; }
    } else if (k === "regime") {
      const a = pool[Math.floor(r() * pool.length)];
      const regs = [...new Set(A.map(x => x.reg))].filter(x => x !== a.reg);
      const ch = shuffle([a.reg].concat(pick(regs, 3, r)), r);
      q = { t: `${a.nom} — quel est son régime alimentaire ?`, c: ch, b: ch.indexOf(a.reg), e: `${a.nom} : ${a.reg.toLowerCase()}.` };
    } else if (k === "uicn") {
      const a = pool[Math.floor(r() * pool.length)];
      const codes = Object.keys(UICN).filter(c => c !== a.uicn);
      const ch = shuffle([a.uicn].concat(pick(codes, 3, r)), r).map(c => c + " — " + UICN[c]);
      const bonTxt = a.uicn + " — " + UICN[a.uicn];
      q = { t: `${a.nom} — quel est son statut sur la liste rouge de l'UICN ?`, c: ch, b: ch.indexOf(bonTxt), e: `${a.nom} : ${a.uicn}, ${UICN[a.uicn].toLowerCase()}.` };
    } else if (k === "qui") {
      const cands = pool.filter(a => a.f.some(f => f[1] !== "expert"));
      if (cands.length) {
        const a = cands[Math.floor(r() * cands.length)];
        const fs = a.f.filter(f => f[1] !== "expert");
        const f = fs[Math.floor(r() * fs.length)][0];
        const d = pick(A.filter(x => x.id !== a.id && x.gr === a.gr), 3, r);
        if (d.length === 3) { const ch = shuffle([a.nom].concat(d.map(x => x.nom)), r); q = { t: "Qui suis-je ? « " + f + " »", c: ch, b: ch.indexOf(a.nom), e: `C'est ${a.nom} (${a.sci}).` }; }
      }
    }
    if (q && !(used && used.has(cle(q)))) { if (used) used.add(cle(q)); return q; }
  }
  return null;
}
function quizJourList() {
  const t = today(), r = rng(hash("q" + t));
  const a = animalDuJour();
  const vus = Object.keys(S.seen).map(i => byId[i]).filter(Boolean);
  const qs = [];
  a.q.forEach(q => qs.push(qShuffle(q, r)));
  const autres = shuffle(vus.filter(x => x.id !== a.id), r).slice(0, 2);
  autres.forEach(x => qs.push(qShuffle(x.q[Math.floor(r() * x.q.length)], r)));
  const used = new Set(qs.map(q => q.t));
  let garde = 0;
  while (qs.length < 6 && garde++ < 40) { const q = autoQ(vus, r, used); if (!q) break; qs.push(q); }
  return shuffle(qs, r);
}
function lancerQuizJour() { runQuiz(quizJourList(), { titre: "Quiz du jour", xp: 8, jour: true }); }
function quizDossier(id) {
  const d = D.find(x => x.id === id), r = rng(hash("d" + id + today()));
  runQuiz(d.q.map(q => qShuffle(q, r)), { titre: d.titre, xp: 7, dossier: id });
}
function quizLibre(mode) {
  const vus = Object.keys(S.seen).map(i => byId[i]).filter(Boolean);
  if (vus.length < 4) return toast("Découvre au moins 4 espèces d'abord");
  const r = rng(Date.now() >>> 0);
  let qs = [], garde = 0;
  if (mode === "revision") {
    const p = shuffle(vus, r);
    for (const a of p) { if (qs.length >= 10) break; qs.push(qShuffle(a.q[Math.floor(r() * a.q.length)], r)); }
    const used = new Set();
    while (qs.length < 10 && garde++ < 60) { const q = autoQ(vus, r, used, true); if (!q) break; qs.push(q); }
  } else if (mode === "chiffres") {
    const used = new Set();
    while (qs.length < 10 && garde++ < 120) {
      const q = autoQ(vus, r, used, true);
      if (q && /plus lourd|plus grande vitesse|plus longtemps/.test(q.t)) qs.push(q);
    }
    if (qs.length < 5) return toast("Il faut plus d'espèces découvertes pour ce mode");
  } else {
    const used = new Set();
    while (qs.length < 10 && garde++ < 80) { const q = autoQ(vus, r, used, true); if (!q) break; qs.push(q); }
  }
  runQuiz(shuffle(qs, r), { titre: mode === "revision" ? "Révision" : mode === "chiffres" ? "Duel des chiffres" : "Entraînement", xp: 3 });
}

let Q = null;
function runQuiz(list, opts) {
  if (!list || !list.length) return toast("Pas assez de matière pour l'instant");
  Q = { list, i: 0, ok: 0, res: [], opts };
  drawQ();
}
function drawQ() {
  const q = Q.list[Q.i];
  modal(`<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
      <div style="font-family:var(--serif);letter-spacing:.1em;text-transform:uppercase;font-size:12px;color:var(--dim)">${Q.opts.titre}</div>
      <div class="hint">${Q.i + 1} / ${Q.list.length}</div></div>
    <div class="qprog">${Q.list.map((_, i) => `<i class="${Q.res[i] === true ? "ok" : Q.res[i] === false ? "ko" : i === Q.i ? "now" : ""}"></i>`).join("")}</div>
    <p class="qtxt">${q.t}</p>
    <div id="opts">${q.c.map((c, i) => `<button class="opt" onclick="rep(${i})">${c}</button>`).join("")}</div>
    <div id="apres"></div>`);
}
function rep(i) {
  const q = Q.list[Q.i], bon = i === q.b;
  Q.res[Q.i] = bon; if (bon) Q.ok++;
  S.qTot++; if (bon) S.qOk++;
  document.querySelectorAll("#opts .opt").forEach((el, k) => {
    el.onclick = null;
    if (k === q.b) el.classList.add("good");
    else if (k === i) el.classList.add("bad");
    else el.classList.add("faded");
  });
  $("#apres").innerHTML = `<div class="expl"><b>${bon ? "Exact." : "Non."}</b> ${q.e}</div>
    <button class="btn gold" style="margin-top:12px" onclick="suivante()">${Q.i + 1 < Q.list.length ? "Question suivante" : "Voir le résultat"}</button>`;
  save();
}
function suivante() {
  Q.i++;
  if (Q.i < Q.list.length) return drawQ();
  const n = Q.list.length, ok = Q.ok, parfait = ok === n;
  let gain = ok * Q.opts.xp + (parfait ? 25 : 0);
  if (Q.opts.jour) { S.quiz[today()] = { ok, tot: n }; if (parfait) S.parfaits++; }
  if (Q.opts.dossier && !S.lus.includes(Q.opts.dossier)) { S.lus.push(Q.opts.dossier); gain += 20; }
  save(); addXp(gain, "quiz");
  const mot = parfait ? "Sans faute." : ok >= n * 0.7 ? "Solide." : ok >= n / 2 ? "Passable — relis les fiches." : "À revoir sérieusement.";
  modal(`<div style="text-align:center;padding:14px 0 4px">
      <div style="font-size:46px">${parfait ? "🏆" : ok >= n * 0.7 ? "✦" : "◍"}</div>
      <div style="font-family:var(--serif);font-size:44px;color:var(--or2);margin-top:6px">${ok}/${n}</div>
      <div class="hint" style="margin-top:6px">${mot} +${gain} ✦</div></div>
    ${Q.list.map((q, i) => Q.res[i] ? "" : `<div class="fact"><span class="lvl lvl-expert">raté</span><p><b>${q.t}</b><br><span style="color:var(--vert)">${q.c[q.b]}</span><br><span style="color:var(--dim)">${q.e}</span></p></div>`).join("")}
    <button class="btn gold" style="margin-top:14px" onclick="closeModal();render()">Fermer</button>`);
}

/* ===================== ONGLET : LEXIQUE ===================== */
let L = null;
function renderLexique() {
  const dispo = lexDispo(), aRev = lexAReviser().length, neufs = lexNouveauxRestants();
  const total = A.filter(a => a.v && a.v.length).length;
  const intro = lexIntroduits(), acquis = lexAcquis();
  const rien = !aRev && !neufs;
  app.innerHTML = `
  <div class="stat-grid">
    <div class="stat"><b>${neufs}</b><span>nouveaux</span></div>
    <div class="stat"><b>${aRev}</b><span>à revoir</span></div>
    <div class="stat"><b>${acquis}</b><span>acquis</span></div>
  </div>
  <div class="panel" style="margin-top:10px">
    ${dispo.length === 0
      ? `<div class="hint">Chaque fiche d'espèce t'apprend un mot. Découvres-en une et il arrivera ici.</div>`
      : rien
        ? `<div class="hint">Rien à réviser pour l'instant — c'est le principe : les mots reviennent juste avant que tu ne les oublies. ${neufs === 0 && S.lexRate <= (S.lexNew[today()] || 0) ? "Tu as vu tes nouveaux mots du jour." : ""} Reviens demain, ou découvre de nouvelles espèces.</div>
           <button class="btn ghost sm" style="margin-top:12px" onclick="lancerLexique(true)">Réviser quand même</button>`
        : `<div class="hint">${aRev ? `${aRev} mot${aRev > 1 ? "s" : ""} à revoir` : "Aucune révision en retard"}${neufs ? `, ${neufs} nouveau${neufs > 1 ? "x" : ""} à découvrir` : ""}.</div>
           <button class="btn gold" style="margin-top:12px" onclick="lancerLexique()">Réviser — ${aRev + neufs} carte${aRev + neufs > 1 ? "s" : ""}</button>`}
  </div>
  <h2 class="sec">Rythme</h2>
  <div class="panel">
    <div class="hint">Nombre de nouveaux mots introduits chaque jour. Les révisions, elles, ne sont jamais plafonnées.</div>
    <div class="chips" style="margin:12px -15px 0;padding-left:15px;padding-right:15px">
      ${[3, 6, 10, 20].map(n => `<button class="${S.lexRate === n ? "on" : ""}" onclick="setLexRate(${n})">${n} par jour</button>`).join("")}
    </div>
  </div>
  <h2 class="sec">Le lexique — ${intro}/${total}</h2>
  <div class="bar" style="margin-bottom:14px"><i style="width:${total ? intro / total * 100 : 0}%"></i></div>
  ${A.filter(a => a.v && a.v.length).map(a => { const [cls, lbl] = lexStatut(a.id);
    return S.seen[a.id]
      ? `<button class="lex-row" onclick="ouvrirAnimal('${a.id}')"><span style="font-size:18px">${a.emo}</span><span class="lr-m">${a.v[0][0]}</span><span class="lr-s ${cls}">${lbl}</span></button>`
      : `<div class="lex-row" style="opacity:.45"><span style="font-size:18px">🔒</span><span class="lr-m" style="font-weight:500;color:var(--dim2)">mot non découvert</span><span class="lr-s ${cls}">${lbl}</span></div>`;
  }).join("")}`;
}
function setLexRate(n) { S.lexRate = n; save(); renderLexique(); }
function lancerLexique(force) {
  const now = Date.now();
  let file = lexAReviser();
  const neufs = lexDispo().filter(id => !lexEtat(id).introduced);
  file = file.concat(shuffle(neufs).slice(0, lexNouveauxRestants()));
  if (!file.length && force) {                       // révision volontaire hors échéance
    file = shuffle(lexDispo().filter(id => lexEtat(id).introduced)).slice(0, 12);
  }
  if (!file.length) return toast("Rien à réviser pour l'instant");
  L = { file: shuffle(file), faites: 0, total: file.length, revele: false };
  drawLex();
}
function drawLex() {
  if (!L.file.length) return finLexique();
  const id = L.file[0], m = motDe(id), c = lexEtat(id);
  const neuf = !c.introduced;
  modal(`<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">
      <div style="font-family:var(--serif);letter-spacing:.1em;text-transform:uppercase;font-size:12px;color:var(--dim)">Lexique</div>
      <div class="hint">${L.faites} / ${L.total}${L.file.length > L.total - L.faites ? " (+ reprises)" : ""}</div></div>
    <div class="flash" onclick="${L.revele ? "" : "revelerLex()"}">
      <div class="fl-src">${neuf ? "nouveau mot" : "révision"}</div>
      <div class="fl-mot">${m.mot}</div>
      ${L.revele
        ? `<hr><div class="fl-def">${m.def}</div>
           <div class="fl-anim"><span>${m.a.emo}</span>rencontré sur la fiche ${m.a.nom}</div>`
        : `<div class="fl-tap">toucher pour voir la définition</div>`}
    </div>
    ${L.revele
      ? `<div class="rate-row">
          ${[["Encore", 0], ["Difficile", 1], ["Bien", 2], ["Facile", 3]].map(([lbl, n]) =>
            `<button class="rate r${n}" onclick="noterLex(${n})">${lbl}<small>${lexApercu(id, n)}</small></button>`).join("")}
         </div>
         <div class="hint" style="margin-top:10px;text-align:center">Sois honnête : « Encore » si tu n'as pas retrouvé le sens tout seul.</div>`
      : `<button class="btn gold" style="margin-top:12px" onclick="revelerLex()">Voir la définition</button>`}
    <button class="btn ghost sm" style="margin-top:9px" onclick="closeModal();render()">Arrêter la session</button>`);
}
function revelerLex() { L.revele = true; drawLex(); }
function noterLex(n) {
  const id = L.file.shift();
  lexNoter(id, n);
  if (n === 0) L.file.push(id); else L.faites++;    // « Encore » repasse en fin de session
  L.revele = false;
  drawLex();
}
function finLexique() {
  const n = L.faites;
  addXp(n >= 5 ? 10 : 0, n >= 5 ? "session de lexique" : null);
  modal(`<div style="text-align:center;padding:16px 0 4px">
      <div style="font-size:44px">📇</div>
      <div style="font-family:var(--serif);font-size:34px;color:var(--or2);margin-top:8px">${n} mot${n > 1 ? "s" : ""}</div>
      <div class="hint" style="margin-top:6px">Session terminée. ${lexAcquis()} mot${lexAcquis() > 1 ? "s" : ""} acquis au total.</div>
      <div class="hint" style="margin-top:10px">Les mots ratés reviendront vite, les autres dans plusieurs jours. C'est l'oubli programmé qui fait tenir la mémoire.</div>
    </div>
    <button class="btn gold" style="margin-top:14px" onclick="closeModal();render()">Fermer</button>`);
  L = null;
}

/* ===================== ONGLET : QUIZ ===================== */
function renderQuiz() {
  const t = today(), q = S.quiz[t], vus = nbVus();
  const taux = S.qTot ? Math.round(S.qOk / S.qTot * 100) : 0;
  app.innerHTML = `<h2 class="sec" style="margin-top:4px">Quiz du jour</h2>
  ${q ? `<div class="panel" style="text-align:center"><div style="font-family:var(--serif);font-size:32px;color:var(--or2)">${q.ok}/${q.tot}</div><div class="hint">Déjà fait aujourd'hui.</div></div>`
      : `<button class="btn gold" onclick="lancerQuizJour()">6 questions — animal du jour + révisions</button>`}
  <h2 class="sec">Entraînement libre</h2>
  <div class="panel"><b>Révision</b><div class="hint" style="margin:4px 0 10px">10 questions tirées des fiches que tu as découvertes.</div>
    <button class="btn sm" onclick="quizLibre('revision')">Lancer</button></div>
  <div class="panel"><b>Duel des chiffres</b><div class="hint" style="margin:4px 0 10px">Uniquement des comparaisons : masse, vitesse, longévité. Impitoyable.</div>
    <button class="btn sm" onclick="quizLibre('chiffres')">Lancer</button></div>
  <div class="panel"><b>Mêlée générale</b><div class="hint" style="margin:4px 0 10px">Taxonomie, régimes, statuts UICN, « qui suis-je ». Tout y passe.</div>
    <button class="btn sm" onclick="quizLibre('melee')">Lancer</button></div>
  <h2 class="sec">Tes chiffres</h2>
  <div class="stat-grid">
    <div class="stat"><b>${S.qOk}</b><span>bonnes réponses</span></div>
    <div class="stat"><b>${taux}%</b><span>de réussite</span></div>
    <div class="stat"><b>${S.parfaits}</b><span>sans-faute</span></div>
  </div>
  ${vus < 4 ? `<p class="hint" style="margin-top:14px">Les modes libres s'ouvrent à partir de 4 espèces découvertes (${vus} pour l'instant).</p>` : ""}`;
}

/* ===================== ONGLET : PROFIL ===================== */
function renderProfil() {
  const r = rang(S.xp), suiv = rangSuiv(S.xp);
  const pct = suiv ? Math.round((S.xp - r[0]) / (suiv[0] - r[0]) * 100) : 100;
  app.innerHTML = `
  <div class="panel" style="text-align:center">
    <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim2)">Rang</div>
    <div style="font-family:var(--serif);font-size:30px;color:var(--or2);margin:4px 0">${r[1]}</div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="hint" style="margin-top:8px">${suiv ? `${S.xp} ✦ — encore ${suiv[0] - S.xp} pour devenir ${suiv[1]}` : `${S.xp} ✦ — rang maximal atteint`}</div>
  </div>
  <div class="stat-grid" style="margin-top:10px">
    <div class="stat"><b>${S.streak}</b><span>jours de suite</span></div>
    <div class="stat"><b>${S.best}</b><span>meilleure série</span></div>
    <div class="stat"><b>${nbVus()}</b><span>espèces</span></div>
  </div>
  <div class="stat-grid" style="margin-top:9px">
    <div class="stat"><b>${nbVus() - nbExped()}</b><span>cartes du jour</span></div>
    <div class="stat"><b>${nbExped()}</b><span>en expédition</span></div>
    <div class="stat"><b>${S.lus.length}</b><span>dossiers lus</span></div>
  </div>
  <div class="stat-grid" style="margin-top:9px">
    <div class="stat"><b>${lexIntroduits()}</b><span>mots vus</span></div>
    <div class="stat"><b>${lexAcquis()}</b><span>mots acquis</span></div>
    <div class="stat"><b>${S.lexDone}</b><span>révisions</span></div>
  </div>
  <h2 class="sec">Collection par groupe</h2>
  ${GROUPES.map(g => { const tot = A.filter(a => a.gr === g).length, n = nbGr(g);
    return `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13.5px"><span>${PLUR[g]}</span><span class="hint">${n}/${tot}</span></div><div class="bar"><i style="width:${n / tot * 100}%"></i></div></div>`; }).join("")}
  <h2 class="sec">Badges — ${S.badges.length}/${BADGES.length}</h2>
  ${BADGES.map(b => `<div class="badge ${S.badges.includes(b[0]) ? "" : "off"}"><div class="bi">${S.badges.includes(b[0]) ? b[1] : "🔒"}</div><div><div class="bn">${b[2]}</div><div class="bd">${b[3]}</div></div></div>`).join("")}
  <h2 class="sec">Sauvegarde</h2>
  <div class="panel"><div class="hint">Tout est stocké sur cet appareil uniquement. Exporte de temps en temps si tu changes de téléphone.</div>
    <div class="btn-row"><button class="btn sm" onclick="exporter()">Exporter</button><button class="btn sm" onclick="importer()">Importer</button></div>
    <button class="btn sm ghost" style="margin-top:9px;color:var(--rouge)" onclick="reset()">Tout effacer</button></div>
  <p class="hint" style="margin-top:18px;text-align:center">BESTIAIRE — ${A.length} espèces, ${D.length} dossiers, ${A.reduce((s, x) => s + x.f.length, 0)} faits.<br>Les fiches signalent le niveau de chaque information : <b>base</b>, <b>pointu</b>, <b>expert</b>.</p>`;
}
function exporter() {
  const blob = new Blob([JSON.stringify(S)], { type: "application/json" });
  const u = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = u; a.download = "bestiaire-" + today() + ".json"; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}
function importer() {
  const i = document.createElement("input"); i.type = "file"; i.accept = ".json";
  i.onchange = () => { const f = i.files[0]; if (!f) return; const rd = new FileReader();
    rd.onload = () => { try { S = Object.assign(structuredClone(DEF), JSON.parse(rd.result)); save(); majTop(); render(); toast("Sauvegarde restaurée"); } catch (e) { toast("Fichier illisible"); } };
    rd.readAsText(f); };
  i.click();
}
function reset() { if (confirm("Effacer toute la progression ? C'est définitif.")) { localStorage.removeItem(KEY); S = structuredClone(DEF); save(); majTop(); render(); } }

/* ===================== navigation ===================== */
let tab = "jour";
function render() {
  ({ jour: renderJour, bestiaire: renderBestiaire, dossiers: renderDossiers, lexique: renderLexique, quiz: renderQuiz, profil: renderProfil })[tab]();
  app.classList.remove("fade-in"); void app.offsetWidth; app.classList.add("fade-in");
}
function setTab(t) {
  tab = t;
  document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
  window.scrollTo(0, 0); render();
}
document.querySelectorAll("#nav button").forEach(b => b.onclick = () => setTab(b.dataset.tab));

majTop(); checkBadges(); render();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
