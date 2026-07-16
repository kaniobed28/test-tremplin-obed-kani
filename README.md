# Contactez l’agence — Test dev web Tremplin

Intégration de la maquette de formulaire de contact de l’agence, en **Next.js 16**,
avec enregistrement des demandes en base **SQLite**.

> Contexte : test technique Tremplin (limite 2 jours). La maquette de référence est
> disponible dans [`maquette.png`](./maquette.png).

---

## À propos

| | |
|---|---|
| **Nom / Prénom** | Kani Obed |
| **Formation** | Bac+5 — Master 2 informatique |
| **Durée de stage souhaitée** | 6 mois |
| **GitHub** | [github.com/kaniobed28](https://github.com/kaniobed28) |
| **LinkedIn** | ⚠️ _à compléter : URL LinkedIn_ |
| **Portfolio** | ⚠️ _à compléter : URL du portfolio_ |
| **Autre projet** | Campus Sell — ⚠️ _à compléter : lien du dépôt ou de l’app_ |

---

## Aperçu

### Page principale

![Formulaire de contact](./docs/screenshot-desktop.png)

### Formulaire rempli, avec disponibilités ajoutées

![Formulaire rempli](./docs/screenshot-rempli.png)

### Validation des champs

Chaque champ affiche son erreur dès qu’il a été touché ; l’envoi est bloqué tant
que le formulaire est invalide.

![Erreurs de validation](./docs/screenshot-erreurs.png)

### Confirmation d’envoi

![Message envoyé](./docs/screenshot-succes.png)

### Version mobile

La maquette est pensée pour le desktop ; les deux colonnes s’empilent sous 1024 px.

<img src="./docs/screenshot-mobile.png" alt="Version mobile" width="320">

---

## Stack technique & choix

| Outil | Version | Pourquoi ce choix |
|---|---|---|
| **Next.js** (App Router) | 16.2 | Le front **et** l’API dans un seul projet : le formulaire et la route d’enregistrement partagent le même code de validation, sans serveur séparé à déployer. |
| **React** | 19.2 | Imposé par Next.js 16, et le modèle à composants correspond bien aux éléments répétés de la maquette (champs, puces de disponibilité). |
| **TypeScript** | 5 | Le typage détecte les erreurs de contrat entre le formulaire, l’API et la base au moment de la compilation plutôt qu’en production. |
| **Tailwind CSS** | 4 | La maquette demande beaucoup d’ajustements précis (rayons, espacements, voile sombre) : les classes utilitaires évitent d’inventer des noms de classes pour du style non réutilisable. |
| **React Hook Form** | 7 | Gère l’état du formulaire sans re-rendre toute la page à chaque frappe, et expose proprement les erreurs par champ. |
| **Zod** | 4 | Un schéma unique décrit les règles métier ; il valide côté client **et** côté serveur, donc les deux ne peuvent pas diverger. |
| **@hookform/resolvers** | 5 | Fait le pont entre Zod et React Hook Form, pour ne pas réécrire les règles de validation dans le formulaire. |
| **better-sqlite3** | 12 | API synchrone, sans configuration : la base est un simple fichier, le correcteur n’a aucun serveur à installer pour tester le projet. |
| **Montserrat** (next/font) | — | Sans-serif géométrique le plus proche de la typo de la maquette, chargée en self-host par `next/font` (pas de requête vers Google). |

### Choix structurants

- **Pas de backend séparé.** Une Route Handler `POST /api/contact` suffit : moins de
  pièces mobiles, un seul `npm run dev`, et surtout le schéma Zod est *importé* par
  le client et par le serveur. Un backend Express ou FastAPI aurait imposé d’écrire
  les règles de validation deux fois.
- **Validation en double barrière.** Le navigateur valide pour le confort de
  l’utilisateur, mais l’API revalide systématiquement : les données du client ne sont
  jamais dignes de confiance, `curl` peut appeler la route directement.
- **Deux tables plutôt qu’un champ texte.** Les disponibilités sont une vraie relation
  1-N (`availabilities.request_id`), écrite dans la même transaction que la demande.
  L’agence peut ainsi filtrer les demandes par créneau, ce qu’un JSON aplati dans une
  colonne interdirait.
- **Accessibilité.** Les libellés de la maquette ne vivent que dans les *placeholders* ;
  j’ai gardé de vrais `<label>` (en `sr-only`), des `<fieldset>/<legend>` pour les
  groupes de radios, `aria-invalid` + `role="alert"` sur les erreurs, et des contrôles
  natifs sous les habillages CSS pour conserver le clavier.

---

## Lancement du projet

**Prérequis :** Node.js ≥ 20.

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer en développement
npm run dev
```

L’application est disponible sur **http://localhost:3000**.

La base SQLite est créée automatiquement au premier envoi, dans `data/contacts.db`
(le dossier `data/` est ignoré par Git). Aucune migration à lancer.

### Autres commandes

```bash
npm run build      # build de production
npm start          # sert le build de production
npm run lint       # ESLint
npm run typecheck  # TypeScript, sans émettre de fichiers
```

### Vérifier les données enregistrées

```bash
node -e "const d=require('better-sqlite3')('data/contacts.db');\
console.table(d.prepare('SELECT * FROM contact_requests').all());\
console.table(d.prepare('SELECT * FROM availabilities').all())"
```

### Structure

```
src/
├─ app/
│  ├─ api/contact/route.ts   POST : valide puis enregistre une demande
│  ├─ layout.tsx             police, <html lang="fr">, métadonnées
│  └─ page.tsx               la carte, la photo de fond et le voile
├─ components/
│  ├─ ContactForm.tsx        orchestre le formulaire et l’envoi
│  ├─ AvailabilityPicker.tsx sélection + puces des disponibilités
│  └─ Field.tsx              input, textarea, radios et select réutilisables
└─ lib/
   ├─ schema.ts              schéma Zod partagé client/serveur
   └─ db.ts                  connexion SQLite, tables, insertion transactionnelle
```

### Modèle de données

```
contact_requests                    availabilities
─────────────────                   ──────────────
id            INTEGER PK            id          INTEGER PK
civility      'mme' | 'm'           request_id  → contact_requests.id (CASCADE)
last_name     TEXT                  day         TEXT
first_name    TEXT                  hour        INTEGER
email         TEXT                  minute      INTEGER
phone         TEXT NULL
request_type  'visite' | 'rappel' | 'photos'
message       TEXT
created_at    TEXT (datetime UTC)
```

### Règles de validation

| Champ | Règle |
|---|---|
| Civilité, Motif | Obligatoires |
| Nom, Prénom | Obligatoires, 80 caractères max |
| Adresse mail | Obligatoire, format vérifié |
| Téléphone | Optionnel — **sauf** si le motif est « Être rappelé.e » |
| Message | Entre 10 et 2000 caractères |
| Disponibilités | 10 max, sans doublon — **au moins une** si le motif est « Demande de visite » |

Les deux règles conditionnelles viennent du bon sens métier : on ne peut pas rappeler
quelqu’un sans numéro, ni organiser une visite sans savoir quand la personne est libre.

---

## Questions

### Avez-vous trouvé l’exercice facile ou difficile ? Qu’est-ce qui vous a posé problème ?

L’exercice est abordable, mais il est plus dense qu’il n’y paraît : la maquette est
simple visuellement, et c’est justement ce qui demande de la minutie. Deux points m’ont
pris du temps :

- **Le bloc « disponibilités »**, seule vraie partie dynamique : il faut gérer une liste
  (ajout, suppression, doublons), décider où la stocker, et surtout choisir de la
  modéliser comme une relation 1-N plutôt que comme une chaîne de texte.
- **Les détails d’alignement** : garder les trois radios « motif » sur une seule ligne,
  aligner le bouton *Envoyer* sur la rangée des sélecteurs, retrouver la teinte du voile
  au-dessus de la photo. Ce sont ces détails qui font qu’une intégration ressemble ou non
  à la maquette.

La maquette laisse aussi des zones d’ombre (quels jours ? quelle amplitude horaire ?) ;
j’ai tranché en me mettant à la place de l’agence et je l’ai documenté ci-dessus.

### Avez-vous appris de nouveaux outils pour répondre à l’exercice ? Si oui, lesquels ?

Oui, principalement **Zod 4** et son intégration à React Hook Form via
`@hookform/resolvers`. Je validais jusqu’ici mes formulaires « à la main » ; l’idée d’un
schéma unique, importé à la fois par le composant et par la route d’API, est ce que je
retiens le plus de cet exercice.

**better-sqlite3** était également nouveau pour moi. Son API synchrone et sa notion de
transaction (`db.transaction(...)`) m’ont permis de garantir qu’une demande et ses
créneaux sont écrits ensemble, ou pas du tout.

J’ai aussi découvert quelques évolutions de **Next.js 16** par rapport aux versions que je
connaissais : l’App Router et les Route Handlers, et `next/font` qui héberge la police
localement. J’ai d’ailleurs cru devoir déclarer `better-sqlite3` dans
`serverExternalPackages` avant de vérifier dans la documentation que Next.js l’exclut déjà
automatiquement du bundle — la ligne de configuration était donc inutile, et je l’ai retirée.

### Quelle est la place du développement web dans votre cursus de formation ?

Le développement web occupe une place centrale dans mon cursus : c’est le support de la
plupart de mes projets, aussi bien côté front (JavaScript/TypeScript, React) que côté
back (API, bases de données). Je le pratique également en dehors des cours, sur mes
projets personnels comme **Campus Sell**, ce qui me permet de confronter la théorie vue
en formation à de vrais utilisateurs et à de vraies contraintes.

### Avez-vous utilisé un LLM ? Si oui, comment intégrez-vous les LLM à chaque étape de votre workflow ?

Oui, et je l’utilise comme un pair avec qui réfléchir, pas comme un pilote automatique.
Concrètement, à chaque étape :

- **Cadrage** — je m’en sers pour confronter les options avant d’écrire du code. Ici :
  Route Handler Next.js contre backend séparé (Express/FastAPI). L’argument décisif —
  un backend séparé obligerait à dupliquer les règles de validation — est sorti de cette
  discussion, mais la décision reste la mienne.
- **Implémentation** — je lui fais générer les parties répétitives (squelette des
  composants, classes Tailwind), que je relis systématiquement. Il m’aide aussi à lire la
  documentation d’un outil que je découvre, comme Zod 4.
- **Vérification** — c’est l’étape où je ne lui fais pas confiance. Je teste moi-même :
  parcours complet dans le navigateur, appels directs à l’API pour vérifier les codes de
  retour (201/422/400), et lecture du contenu de la base pour confirmer que rien n’est
  enregistré quand la validation échoue.
- **Relecture** — je lui demande de critiquer mon propre code, ce qui fait remonter des
  oublis utiles (ici, un champ e-mail vide affichait « invalide » au lieu de « requise »).

Ce que je garde pour moi : les choix d’architecture, la modélisation des données, et la
relecture ligne à ligne. Un LLM produit vite du code plausible ; c’est au développeur de
vérifier qu’il est *correct*.
