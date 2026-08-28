# VerbaMind AI Pro 🌐⚡

> Application de traduction contextuelle, restructuration syntaxique & AR Camera basée sur **Gemini 2.5 Flash / Gemini 3.6 Flash**.

## 🚀 Structure & Déploiement GitHub Pages (`gh-pages`)

URL publique du site :
👉 **[https://jravis2.github.io/VerbaMind-Ia-Pro/](https://jravis2.github.io/VerbaMind-Ia-Pro/)**

### 📁 Organisation de la branche `gh-pages` (sans dossiers `html` ou `main`)
Tous les fichiers compilés sont déposés **directement à la racine de la branche `gh-pages`** :
```
gh-pages (racine)
├── index.html        <-- Point d'entrée principal de l'application
├── 404.html          <-- Redirection pour le routage SPA GitHub Pages
├── .nojekyll         <-- Désactivation de Jekyll pour charger les assets
└── assets/           <-- Tous les fichiers CSS, JS et icônes compilés
```

---

### 1. Activer GitHub Pages sur la branche `gh-pages`
1. Allez sur votre dépôt GitHub : `https://github.com/jravis2/VerbaMind-Ia-Pro`
2. Cliquez sur **Settings** ➔ **Pages**
3. Dans **Build and deployment** ➔ **Source** :
   - Choisissez **Deploy from a branch**
   - Sélectionnez la branche : **`gh-pages`**
   - Dossier : **`/ (root)`**
   - Cliquez sur **Save**.

---

### 2. Supprimer l'ancienne branche `html` (si présente)
Si une branche superflue `html` existe sur votre dépôt GitHub :
- **Depuis l'interface GitHub** : Allez sur `https://github.com/jravis2/VerbaMind-Ia-Pro/branches` et cliquez sur l'icône de corbeille 🗑️ en face de `html`.
- **En ligne de commande** :
  ```bash
  git push origin --delete html
  ```

---

### 3. Déploiement Automatique via GitHub Actions
Chaque mise à jour sur la branche source déclenche le workflow `.github/workflows/deploy.yml` qui compile et déploie instantanément le dossier `dist/` à la racine de la branche `gh-pages`.

---

## 🛠️ Développement Local

```bash
# Installation des dépendances
npm install

# Démarrage en mode développement local
npm run dev

# Construction pour la production
npm run build

# Construction statique autonome pour GitHub Pages
npm run build:pages
```
