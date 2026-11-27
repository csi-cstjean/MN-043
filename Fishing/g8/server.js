const express = require("express");
const path = require("node:path");
const { initializeDatabase } = require("../../lib/database");

const app = express();
const db = initializeDatabase();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use("/assets", express.static(path.join(__dirname, "public")));

const recordAttempt = db.transaction((username, password, sourceIp) => {
  const interceptedAt = new Date().toISOString();
  const attempt = db.prepare(
    "INSERT INTO login_attempts (username, password, attempted_at, source_ip, campaign_code) VALUES (?, ?, ?, ?, ?)"
  ).run(username, password, interceptedAt, sourceIp, "MN-043");
  db.prepare(
    "INSERT INTO transfers (campaign_code, username, password, intercepted_at, organization) VALUES (?, ?, ?, ?, ?)"
  ).run("MN-043", username, password, interceptedAt, "G-8");
  db.prepare(
    "INSERT INTO credential_listings (login_attempt_id, status, reserve_price) VALUES (?, ?, ?)"
  ).run(attempt.lastInsertRowid, "new_attempt", 0);
});

function page(title, content) {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | Direction du renseignement G-8</title>
  <link rel="stylesheet" href="/assets/g8.css">
  <link rel="preconnect" href="http://localhost:3001">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/">G-8 <span>Direction du renseignement</span></a>
    <nav aria-label="Navigation principale">
      <a href="/">Accueil</a>
      <a href="/connexion">Connexion</a>
      <a href="/nous-joindre">Nous joindre</a>
    </nav>
  </header>
  <main>${content}</main>
  <footer><span>Portail de services des agents</span><span>Diffusion contrôlée - G-8</span></footer>
  <script src="http://localhost:3001/assets/telemetry.js" defer></script>
  <script src="http://localhost:3002/assets/relay-monitor.js" defer></script>
</body>
</html>`;
}

app.get("/", (_req, res) => {
  res.send(page("Accueil", `
    <section class="hero">
      <div>
        <p class="eyebrow">Réseau institutionnel</p>
        <h1>Coordination du renseignement international</h1>
        <p>Accédez aux services opérationnels du G-8 et aux communications destinées aux agents autorisés.</p>
        <a class="button" href="/connexion">Accès agent</a>
      </div>
      <img class="hero-image" src="/assets/g8.png" alt="Complexe institutionnel du G-8">
    </section>
    <section class="grid">
      <article><h2>État des services</h2><p><strong class="status">Opérationnel</strong> — Les services de coordination sont disponibles.</p></article>
      <article><h2>Avis aux agents</h2><p>Utilisez uniquement des appareils approuvés pour consulter les communications classifiées.</p></article>
      <article><h2>Coopération</h2><p>Les cellules régionales assurent une continuité de service avec les partenaires autorisés.</p></article>
    </section>
  `));
});

app.get("/connexion", (_req, res) => {
  res.send(page("Connexion agent", `
    <section class="narrow">
      <p class="eyebrow">Accès contrôlé</p>
      <h1>Connexion agent</h1>
      <p>Authentifiez-vous avec vos identifiants institutionnels.</p>
      <form class="card" method="post" action="/connexion">
        <label>Identifiant agent <input name="username" autocomplete="username" required></label>
        <label>Mot de passe <input name="password" type="password" autocomplete="current-password" required></label>
        <button type="submit">Ouvrir une session</button>
      </form>
      <p class="fine-print">Pour les besoins de ce laboratoire, n’utilisez jamais de véritables identifiants.</p>
    </section>
  `));
});

app.post("/connexion", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (!username || !password) {
    return res.status(400).send(page("Connexion agent", "<section class=\"narrow\"><h1>Champs requis</h1><p>Les deux champs doivent être remplis.</p></section>"));
  }
  recordAttempt(username, password, req.ip);
  return res.send(page("Maintenance", `
    <section class="narrow card">
      <p class="eyebrow">Avis de service</p>
      <h1>Vérification en cours</h1>
      <p>Le service d’authentification est temporairement indisponible. Réessayez plus tard.</p>
    </section>
  `));
});

app.get("/nous-joindre", (_req, res) => {
  res.send(page("Nous joindre", `
    <!-- NOTE DE LIVRAISON (à supprimer avant diffusion):
    Le dépôt contient les pages et visuels du faux portail — https://github.com/csi-cstjean/MN-043 
    -->
    <section class="narrow">
      <p class="eyebrow">Coordination</p>
      <h1>Nous joindre</h1>
      <div class="grid">
        <article><h2>Centre des opérations</h2><p>Canal institutionnel réservé aux partenaires accrédités.</p></article>
        <article><h2>Urgence terrain</h2><p>Utilisez les protocoles de contact remis lors de votre affectation.</p></article>
      </div>
    </section>
  `));
});

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send("User-agent: *\nDisallow: /staging/\nDisallow: /backup/\n");
});

app.listen(port, () => console.log(`G-8 portal listening on ${port}`));
