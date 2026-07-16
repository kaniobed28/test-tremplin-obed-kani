# Contactez l’agence — Test dev web Tremplin

Intégration de la maquette de formulaire de contact de l’agence, en **Next.js 16**,
avec enregistrement des demandes en base **MySQL** — celle fournie par le
`docker-compose.yml` du dépôt.

**▶ Démo en ligne : [test-tremplin-obed-kani.vercel.app](https://test-tremplin-obed-kani.vercel.app)**

> Contexte : test technique Tremplin (limite 2 jours). La maquette de référence est
> disponible dans [`maquette.png`](./maquette.png).
>
> La démo tourne sur Vercel avec une base MySQL hébergée (Railway), branchée via la
> variable `DATABASE_URL`. **Le code est identique** : en local, sans variable
> d’environnement, l’application vise le MySQL du `docker-compose.yml` fourni.

---

## À propos

| | |
|---|---|
| **Nom / Prénom** | Kani Obed |
| **Formation** | Bac+5 — Master 2 informatique |
| **Durée de stage souhaitée** | 6 mois |
| **Portfolio** | [obed-kani.netlify.app](https://obed-kani.netlify.app/) |
| **GitHub** | [github.com/kaniobed28](https://github.com/kaniobed28) |
| **LinkedIn** | [linkedin.com/in/kani-obed](https://www.linkedin.com/in/kani-obed) |

### Quelques projets

Plus d’une dizaine de projets déployés ; les plus représentatifs :

| Projet | Stack | Liens |
|---|---|---|
| **Campus Sell** — marketplace étudiante | v1 Flutter + Firebase ; v2 Next.js, Laravel (PHP), Supabase pour l’authentification | [client](https://campus-sell-client.vercel.app/) · [vendeur](https://campus-sell-seller.vercel.app/) · [admin](https://campus-sell-admin.vercel.app/) |
| **Trendy Sky** — boutique de vêtements en ligne | Next.js, Firebase | [trendy-sky-web-frontend.vercel.app](https://trendy-sky-web-frontend.vercel.app/) |
| **COP Lille** — plateforme pour une organisation COP | Next.js | [lille-city-church.vercel.app](https://lille-city-church.vercel.app/) |
| **FlashCard** — cartes mémo pour l’apprentissage des langues | React, Firebase | [mfcard.vercel.app](https://mfcard.vercel.app/) |

Campus Sell est le plus proche de cet exercice : une marketplace en trois interfaces
(client, vendeur, administration), que j’ai reprise de zéro en Next.js après une première
version Flutter — donc le même travail qu’ici de formulaires, de validation et de
modélisation de données, mais à plus grande échelle.

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
| **MySQL** (Docker) | 8.4 | La base **fournie avec le dépôt** (`docker-compose.yml`). Le sujet laisse le choix de la base ; utiliser celle qui est mise à disposition évite au correcteur d’installer quoi que ce soit d’autre. |
| **mysql2** | 3.23 | Driver MySQL de référence pour Node : requêtes préparées (donc à l’abri des injections SQL), API `promise` et gestion d’un pool de connexions. |
| **Montserrat** (next/font) | — | Sans-serif géométrique le plus proche de la typo de la maquette, chargée en self-host par `next/font` (pas de requête vers Google). |

### Choix structurants

- **Pas de backend séparé.** Une Route Handler `POST /api/contact` suffit : moins de
  pièces mobiles, un seul `npm run dev`, et surtout le schéma Zod est *importé* par
  le client et par le serveur. Un backend Express ou FastAPI aurait imposé d’écrire
  les règles de validation deux fois.
- **Validation en double barrière.** Le navigateur valide pour le confort de
  l’utilisateur, mais l’API revalide systématiquement : les données du client ne sont
  jamais dignes de confiance, `curl` peut appeler la route directement.
- **La base fournie, pas une autre.** Le dépôt livre un `docker-compose.yml` avec MySQL :
  c’est la base que j’utilise. Je l’ai complété de deux lignes seulement — `MYSQL_DATABASE`
  (le fichier d’origine ne créait aucune base applicative) et un `healthcheck` (MySQL met
  une vingtaine de secondes à accepter les connexions au premier démarrage).
- **Deux tables plutôt qu’un champ texte.** Les disponibilités sont une vraie relation
  1-N (`availabilities.request_id`, avec `ON DELETE CASCADE`), écrite dans la même
  transaction que la demande. L’agence peut ainsi filtrer les demandes par créneau, ce
  qu’un JSON aplati dans une colonne interdirait.
- **Requêtes préparées et `utf8mb4`.** Toutes les valeurs passent par des requêtes
  préparées (`?`), jamais par de la concaténation de chaînes. Les tables sont en
  `utf8mb4`, vérifié : « Lefèvre » et « J’aimerais… » se relisent à l’identique.
- **Accessibilité.** Les libellés de la maquette ne vivent que dans les *placeholders* ;
  j’ai gardé de vrais `<label>` (en `sr-only`), des `<fieldset>/<legend>` pour les
  groupes de radios, `aria-invalid` + `role="alert"` sur les erreurs, et des contrôles
  natifs sous les habillages CSS pour conserver le clavier.

---

## Lancement du projet

**Prérequis :** Node.js ≥ 20 et Docker (pour la base MySQL fournie).

```bash
# 1. Démarrer MySQL — `--wait` rend la main quand la base accepte les connexions
docker compose up -d --wait

# 2. Installer les dépendances
npm install

# 3. Lancer en développement
npm run dev
```

L’application est disponible sur **http://localhost:3000**.

Les tables sont créées automatiquement au premier envoi (`CREATE TABLE IF NOT EXISTS`) :
aucune migration à lancer. Les données MySQL vivent dans `./mysql`, ignoré par Git.

Pour tout arrêter :

```bash
docker compose down          # arrête la base
docker compose down && rm -rf mysql   # …et repart d'une base vierge
```

### Configuration

Les identifiants par défaut sont ceux du `docker-compose.yml`, donc **aucun `.env` n’est
nécessaire**. Ils restent surchargeables par variables d’environnement :

| Variable | Défaut | Rôle |
|---|---|---|
| `DATABASE_URL` | _(vide)_ | `mysql://user:pass@host:port/base`. Prioritaire si définie — c’est ainsi que la démo en ligne se connecte à MySQL. |
| `DB_HOST` | `127.0.0.1` | Utilisées uniquement si `DATABASE_URL` est absente. |
| `DB_PORT` | `3306` | |
| `DB_USER` | `root` | |
| `DB_PASSWORD` | `verysecurepassword` | |
| `DB_NAME` | `majordhom` | |
| `DB_SSL` | `false` | `true` pour les hébergeurs qui imposent TLS. |
| `DB_POOL_SIZE` | `3` | Volontairement bas : en serverless, chaque instance ouvre son propre pool. |

### Autres commandes

```bash
npm run build      # build de production
npm start          # sert le build de production
npm run lint       # ESLint
npm run typecheck  # TypeScript, sans émettre de fichiers
```

### Vérifier les données enregistrées

```bash
docker compose exec db mysql -uroot -pverysecurepassword majordhom \
  -e "SELECT * FROM contact_requests\G SELECT * FROM availabilities;"
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
   └─ db.ts                  pool MySQL, tables, insertion transactionnelle
```

### Modèle de données

```
contact_requests                       availabilities
─────────────────                      ──────────────
id            INT AI PK                id          INT AI PK
civility      ENUM('mme','m')          request_id  → contact_requests.id (CASCADE)
last_name     VARCHAR(80)              day         VARCHAR(10)
first_name    VARCHAR(80)              hour        TINYINT
email         VARCHAR(150)             minute      TINYINT
phone         VARCHAR(20) NULL
request_type  ENUM('visite','rappel','photos')
message       TEXT
created_at    DATETIME
```

Les deux tables sont en InnoDB (nécessaire pour les clés étrangères et les transactions)
et en `utf8mb4`. Les `ENUM` font que la base refuse une valeur hors liste même si elle
passait la validation applicative.

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

**mysql2** était également nouveau pour moi, en particulier la gestion explicite d’une
transaction (`beginTransaction` / `commit` / `rollback`) et le pool de connexions — qu’il
faut penser à mettre en cache, sinon le rechargement à chaud de Next.js en ouvre un
nouveau à chaque modification de fichier jusqu’à saturer MySQL.

J’ai aussi découvert quelques évolutions de **Next.js 16** par rapport aux versions que je
connaissais : l’App Router et les Route Handlers, et `next/font` qui héberge la police
localement.

Côté Docker, j’ai appris l’intérêt du couple `healthcheck` / `docker compose up --wait` :
sans lui, MySQL 8.4 met une vingtaine de secondes avant d’accepter la moindre connexion,
et l’application démarre plus vite que sa base.

### Quelle est la place du développement web dans votre cursus de formation ?

Le développement web occupe une place centrale dans mon cursus : c’est le support de la
plupart de mes projets, aussi bien côté front (JavaScript/TypeScript, React, Next.js) que
côté back (API, bases de données).

C’est surtout hors des cours qu’il prend toute sa place : j’ai déployé plus d’une dizaine
de projets (voir [Quelques projets](#quelques-projets) plus haut). **Campus Sell** est le
plus formateur — une marketplace étudiante que j’ai d’abord écrite en Flutter/Firebase,
puis entièrement reprise en Next.js avec Laravel et Supabase. Refaire un produit existant
apprend surtout ce que le premier jet avait mal modélisé.

Cette pratique m’a aussi confronté à des stacks variées — Firebase, Supabase, Laravel, et
MySQL ici — ce qui m’a appris à me caler sur la stack d’un projet plutôt que sur mes
préférences. C’est exactement la démarche suivie sur ce test : le dépôt fournissait MySQL,
c’est donc MySQL que j’utilise.

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

L’exemple le plus parlant de cette limite est arrivé sur ce test. Le `docker-compose.yml`
du dépôt ne servait à rien tant que je partais sur SQLite, et le LLM a conclu — en citant
l’historique Git — qu’il s’agissait d’un reliquat, puis l’a supprimé. En allant lire le
commit moi-même, le raisonnement était faux : ce commit retirait Apache et PhpMyAdmin
mais **gardait délibérément MySQL**. La base n’était pas un oubli, c’était celle que le
sujet met à disposition. D’où le choix final de MySQL, et le fichier restauré.

C’est exactement pour ça que je ne délègue pas la décision : l’argument était bien
construit, la citation d’historique donnait l’air d’une vérification, et la conclusion
était fausse. Ce que je garde donc pour moi : les choix d’architecture, la modélisation
des données, et la relecture ligne à ligne. Un LLM produit vite du code plausible ; c’est
au développeur de vérifier qu’il est *correct*.
