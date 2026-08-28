# VerbaMind AI Pro 🌐⚡

> Application de traduction contextuelle, restructuration syntaxique & AR Camera basée sur **Gemini 2.5 Flash / Gemini 3.6 Flash**.

## 🚀 Déploiement GitHub Pages

URL de production configurée :
👉 **[https://jravis2.github.io/VerbaMind-Ia-Pro/](https://jravis2.github.io/VerbaMind-Ia-Pro/)**

### 1. Activer GitHub Pages sur votre dépôt GitHub
1. Allez sur votre dépôt GitHub : `https://github.com/jravis2/VerbaMind-Ia-Pro`
2. Cliquez sur **Settings** ➔ **Pages**
3. Dans la section **Build and deployment** ➔ **Source**, choisissez **GitHub Actions**.

### 2. Pousser le code
Poussez le code sur la branche `main` :
```bash
git add .
git commit -m "Déploiement VerbaMind AI Pro"
git branch -M main
git push origin main
```
Le workflow automatisé `.github/workflows/deploy.yml` construira et déploiera automatiquement l'application sur `https://jravis2.github.io/VerbaMind-Ia-Pro/` !

---

## 🛠️ Développement Local

```bash
# Installation des dépendances
npm install

# Démarrage en mode développement
npm run dev

# Construction pour la production
npm run build

# Construction spécifique pour GitHub Pages
npm run build:pages
```
