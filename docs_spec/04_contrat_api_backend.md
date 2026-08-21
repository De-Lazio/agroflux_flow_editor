# 4. Contrat API backend — vu du côté app mobile

Ce document décrit ce que l'app Flutter doit envoyer et ce qu'elle doit
attendre en retour, pour les 6 routes backend correspondant aux 6 branches du
menu principal actuel. Version détaillée destinée à l'équipe backend :
`API_BACKEND_ROUTES.md` à la racine du dépôt `flow_editor` — ce document-ci
en est le sous-ensemble pertinent pour le client, reformulé de son point de
vue. En cas de divergence, `flow.json` (via `data_source` de chaque nœud
`result`) fait foi sur les endpoints/params/méthode.

## 4.1. Conventions générales de requête

- **Méthode : `POST`** pour les 6 routes actuelles (confirmé par `data_source`
  dans `flow.json` — voir §1.3, "absent ⇒ POST" reste la règle générale pour
  tout nœud `result` futur).
- Tous les paramètres partent en **JSON body**, jamais en query string ni
  interpolés dans l'URL.
- **Authentification obligatoire** : `Authorization: Bearer <token>` sur
  chaque requête. Mécanisme d'obtention du token — à préciser avec l'équipe
  backend au moment de l'implémentation (hors périmètre de ce document).
- `Content-Type: application/json`.
- **Aucun paramètre de langue dans la requête** — le backend ne connaît
  jamais la langue de l'utilisateur, c'est l'app qui gère entièrement cette
  dimension côté ressources (voir [`03_ressources_et_chemins.md`](./03_ressources_et_chemins.md) §3.3).
- Toutes les valeurs de paramètre sont des **chaînes**.

## 4.2. Format de réponse standard : `audio_sequence`

**Les 6 routes renvoient toutes ce même format.**

```json
{
  "type": "audio_sequence",
  "version": "1.0",
  "sequence": [
    { "audios": ["chemin/vers/fichier1.mp3", "chemin/vers/fichier2.mp3"], "image": "images/dossier/fichier.jpeg" }
  ],
  "data": {},
  "meta": { "pause_ms": 600 }
}
```

- `type` : doit être exactement `"audio_sequence"` — toute autre valeur (ou
  absence de ce champ) signifie que la réponse ne suit pas ce format et ne
  doit pas être traitée comme telle (afficher une erreur générique plutôt que
  de tenter une lecture audio).
- `sequence` : tableau de blocs lus **dans l'ordre** — algorithme de lecture
  exact en [`02_navigation_et_lecture_audio.md`](./02_navigation_et_lecture_audio.md) §2.4.B.
  Nombre de blocs dynamique (0 à N), variable selon la route et les données.
- `audios[i]` : chemins **littéraux, sans préfixe de langue** — l'app préfixe
  systématiquement avant résolution (§3.3).
- `image` : chemin littéral **complet** (`images/...` inclus) ou `null`.
- `data` : champ optionnel, présent uniquement pour `infos_marches` avec
  `info_type = "calendrier_animation"` (voir §4.7) — absent ou `{}` pour
  toutes les autres réponses.
- `meta.pause_ms` : pause en ms entre deux blocs de `sequence`. Absent ⇒
  utiliser `flow.config.audio.pause_between_ms` (défaut `600`).
- Les champs `{param}`/`{param:defaut}` visibles dans `flow.json`
  (`json_response_contrat`/`response_examples`) sont un usage interne Studio
  uniquement — **une vraie réponse backend ne contient jamais de `{...}`
  littéral**, chaque valeur y est déjà résolue.

## 4.3. Gestion des erreurs

| Statut | Signification |
|---|---|
| `400` | Paramètres manquants/invalides. |
| `401` / `403` | Authentification manquante ou invalide. |
| `404` | Aucune donnée pour ces paramètres (ex. marché inexistant). |
| `500` | Erreur serveur. |

Corps d'erreur :
```json
{ "error": { "code": "NOT_FOUND", "message": "Aucun marché animé à cette date." } }
```

**Une liste vide n'est pas une erreur.** "Aucun marché animé ce jour-là"
(branches 3 et 4) est un résultat légitime → statut `200` avec une
`audio_sequence` annonçant l'absence de résultat, jamais un `404`. L'app doit
donc toujours essayer de parser une réponse `200` comme `audio_sequence`
avant d'envisager un état d'erreur.

## 4.4. Les 6 routes

| # | Branche | Endpoint | Params body |
|---|---|---|---|
| 1 | Acheter un produit | `api/app/acheter_produit` | `produit`, `departement` |
| 2 | Vendre un produit | `api/app/vendre_produit` | `produit`, `departement` |
| 3 | Marché animé (date relative) | `api/app/anime_x` | `date`, `departement` |
| 4 | Marché animé (calendrier) | `api/app/anime_calendrier` | `anime_date`, `departement` |
| 5 | Infos sur un marché | `api/app/infos_marches` | `marche`, `info_type` |
| 6 | Explorer un produit | `api/app/explorer_prix` | `marche`, `produit`, `periode` |

### 4.4.1. Acheter un produit — `POST api/app/acheter_produit`
```json
{ "produit": "mais", "departement": "atlantique" }
```
Renvoie les meilleurs prix du produit dans le département, triés du moins
cher au plus cher, plus un conseil final. `produit` = une valeur de la
variable `produits` (28 valeurs) ; `departement` = une valeur de `departements`
(12 valeurs).

### 4.4.2. Vendre un produit — `POST api/app/vendre_produit`
```json
{ "produit": "mais", "departement": "atlantique" }
```
Symétrique de 4.4.1 : même requête, mais tri du plus cher au moins cher,
conseil orienté vente.

### 4.4.3. Marché animé (date relative) — `POST api/app/anime_x`
```json
{ "date": "demain", "departement": "atlantique" }
```
- `date` : une des 10 valeurs relatives de `x_anime_x` (`aujourdhui`,
  `demain`, `apres_demain`, `dans_trois_jours`, `dans_quatre_jours`, `hier`,
  `avant_hier`, `trois_jours_passe`, `quatre_jours_passe`, `cinq_jours_passe`).
- `departement` : une des 13 valeurs de `departements_et_tout`
  (`tout_les_departements` + les 12 départements réels). `"tout_les_departements"`
  doit être envoyé tel quel — c'est au backend de l'agréger, pas à l'app de le
  décomposer en 12 appels.

Renvoie la liste des marchés programmés ce jour-là dans le département (ou
tous départements), 0 résultat possible et légitime (§4.3).

### 4.4.4. Marché animé (calendrier) — `POST api/app/anime_calendrier`
```json
{ "anime_date": "2026-03-10", "departement": "atlantique" }
```
Identique à 4.4.3 dans l'objectif et la forme de réponse — seule différence :
`anime_date` est une date calendaire exacte (`YYYY-MM-DD`, choisie sur le
nœud `calendrier` en amont), pas une date relative.

### 4.4.5. Infos sur un marché — `POST api/app/infos_marches`
```json
{ "marche": "takon", "info_type": "calendrier_animation" }
```
- `marche` : résolu par un nœud `pre_filter` en amont (valeur de
  `marches_par_departement[departement]`).
- `info_type` : une des 5 valeurs de `type_info_marche` — `resume_rapide`,
  `presentation_du_marche`, `produits_disponibles`, `calendrier_animation`,
  `opportunite_marche`.

Toutes les variantes renvoient `audio_sequence` — un seul format à gérer côté
app pour cette route. `calendrier_animation` est un **cas particulier**, voir
§4.7.

### 4.4.6. Explorer un produit — `POST api/app/explorer_prix`
```json
{ "marche": "takon", "produit": "mais", "periode": "six_derniers_mois" }
```
- `marche` : une des 7 valeurs de `marches_suivis` (liste volontairement
  restreinte, différente de la liste complète des marchés).
- `produit` : une des 28 valeurs de `produits`.
- `periode` : une des 6 valeurs de `periode` (`aujourdhui`, `cette_semaine`,
  `ce_mois`, `trois_derniers_mois`, `six_derniers_mois`, `cette_annee`).

Renvoie l'historique de prix filtré (uniquement les dates où le prix a changé),
avec indicateur de tendance (hausse/baisse/stable, seuil 5%) entre dates
consécutives retenues, et un conseil final.

## 4.5. Exemple de réponse complète (branche 1)

```json
{
  "type": "audio_sequence",
  "version": "1.0",
  "sequence": [
    { "audios": ["intro/vous_cherchez_acheter.mp3", "produits/mais.mp3", "intro/dans_departement.mp3", "localites/atlantique.mp3", "intro/meilleurs_prix_sont.mp3"], "image": "images/intro/acheter.jpeg" },
    { "audios": ["ordre/premier_marche.mp3", "marches/bohicon.mp3", "date/releve_le.mp3", "date/2026_03_10.mp3"], "image": "images/marches/bohicon.jpeg" },
    { "audios": ["produits/mais_local.mp3", "phrases/est_a.mp3", "prix/1000_fcfa.mp3", "unites/kg.mp3", "phrases/vendu_a.mp3", "prix/5000_fcfa.mp3", "unites/bassine_5kg.mp3"], "image": "images/produits/mais_local_avec_unites.jpeg" },
    { "audios": ["conseils/prix_bas_bonne_opportunite.mp3", "conseils/ajouter_transport.mp3", "conseils/comparer_qualite.mp3"], "image": "images/icons/attention_transport.jpeg" }
  ],
  "meta": { "pause_ms": 600 }
}
```

## 4.6. Variétés de produit

Les exemples ci-dessus utilisent des variétés fines (`mais_local`,
`mais_blanc`, `mais_jaune`) — les fichiers correspondants existent déjà côté
ressources. Le backend construit ses chemins avec ces mêmes noms de variété ;
l'app n'a rien à faire de spécial, elle joue les chemins littéraux reçus
comme toujours (§3.3).

## 4.7. Cas particulier — `calendrier_animation`

Pour `infos_marches` avec `info_type = "calendrier_animation"`, le calcul du
calendrier se fait **côté app, pas côté backend**. Le backend renvoie la
**règle brute** :

```json
{
  "type": "audio_sequence",
  "version": "1.0",
  "sequence": [
    { "audios": ["intro/calendrier_marche.mp3", "marches/takon.mp3", "frequence/hebdomadaire.mp3"], "image": null }
  ],
  "data": {
    "type_regle": "hebdomadaire",
    "valeur": { "jours": [2, 5] },
    "description": "Marché tous les mardi et vendredi",
    "bname_audio": "frequence/hebdomadaire.mp3"
  },
  "meta": { "pause_ms": 600 }
}
```

`sequence` reste jouable telle quelle (annonce courte). `data` est ce que
l'app utilise pour générer elle-même le calendrier (ex. surligner les jours
animés dans un sélecteur de date), **sans round-trip supplémentaire vers le
backend**. Algorithme exact à réimplémenter à l'identique (Dart) du service
backend `MarketAnimationService` — toute divergence produirait un calendrier
affiché différent de ce que le backend considère réellement comme un jour
animé :

| `type_regle` | Forme de `valeur` | Règle de correspondance à une date |
|---|---|---|
| `hebdomadaire` | `{ "jours": [2, 5] }` | Animé si le jour de semaine ISO de la date (1=lundi … 7=dimanche) est dans `jours`. |
| `intervalle` | `{ "interval": 4, "date_reference": "2026-03-01" }` | Animé si `(date - date_reference)` en jours est un multiple de `interval` (`%` appliqué à la différence absolue). |
| `mensuel` | `{ "jours": [5], "semaine": 2 }` | Animé si le jour de semaine ISO correspond à `jours` **ET** `ceil(jour_du_mois / 7) === semaine`. Ex. `jours:[5], semaine:2` = le 2ᵉ vendredi du mois. |

## 4.8. Base URL et environnements

L'URL de base de l'API (dev/staging/prod) est une configuration de build de
l'app, hors du périmètre de `flow.json` — celui-ci ne référence que des
chemins d'endpoint relatifs (`data_source.endpoint`).
