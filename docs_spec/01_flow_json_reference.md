# 1. Structure de `flow.json`

`flow.json` est le contrat unique qui décrit l'intégralité de la navigation de
l'application mobile. Il est produit par le Flow Editor, consommé tel quel par
l'app Flutter (et par le backend pour générer ses réponses). **Aucun écran,
aucun libellé, aucune transition ne doit être codé en dur côté mobile** — tout
vient de ce fichier.

Schéma TypeScript de référence : `src/types/flow.ts`.

## 1.1. Champs racine

```json
{
  "version": "1.0",
  "entry": "root",
  "config": { "audio": { "auto_play_prompt": true, "auto_play_option": true, "pause_between_ms": 600 } },
  "variables": { "produits": ["mais", "soja", "..."] },
  "hashmaps": { "marche_par_departement": { "oueme": ["ouando", "adjohoun"] } },
  "audio_mappings": { "produits": "produits", "marche_par_departement": "marche_par_departement" },
  "resource_formats": { "audio": "mp3", "image": "jpeg" },
  "languages": ["fon", "yoruba", "dendi", "adja"],
  "active_overrides": { "variables": {}, "hashmaps": {} },
  "hashmaps_no_resources": ["marches_par_departement"],
  "nodes": { "root": { "...": "..." } }
}
```

| Champ | Type | Rôle |
|---|---|---|
| `version` | `string` | Version du **format** de flow (schéma), pas un numéro de release de contenu — voir [`05_versioning_et_livraison.md`](./05_versioning_et_livraison.md) pour le vrai mécanisme de versioning à utiliser. |
| `entry` | `string` | ID du nœud de départ (voir `nodes`). Toujours un nœud `root` en pratique, mais rien dans le schéma ne l'impose formellement. |
| `config.audio` | objet | Voir §1.2. |
| `variables` | `{ nom: string[] }` | Listes de valeurs nommées, réutilisables par plusieurs nœuds `grid` (ex. `produits`, `departements`). |
| `hashmaps` | `{ nom: { clé: string[] } }` | Tables clé → liste de valeurs, utilisées par les nœuds `pre_filter` pour filtrer une liste en fonction d'une valeur déjà choisie (ex. `marche_par_departement.oueme → ["ouando", "adjohoun", ...]`). |
| `audio_mappings` | `{ nom: dossier }` | Pour chaque variable/hashmap, le nom du dossier de ressources associé (souvent identique au nom, mais peut diverger — voir [`03_ressources_et_chemins.md`](./03_ressources_et_chemins.md)). |
| `resource_formats` | `{ audio, image }` | Extensions de fichier globales (ex. `mp3`, `jpeg`) appliquées à **toutes** les ressources générées à partir des variables/hashmaps. |
| `languages` | `string[]` | Langues actives pour la génération/résolution audio. **Seul l'audio est multilingue** — les images ne dépendent jamais de la langue. Valeurs par défaut habituelles : `fr` (langue de référence/débogage), `fon`, `yoruba`, `dendi`, `adja`. |
| `active_overrides` | objet | Overlay additif listant les valeurs de variable/clé-valeur de hashmap **désactivées** — tout ce qui n'y est pas listé est actif. Voir §1.5. |
| `hashmaps_no_resources` | `string[]` | Noms de hashmaps dont les clés/valeurs sont déjà couvertes par des ressources de variable existantes (mêmes libellés) — aucune ressource audio/image propre à générer pour eux. Voir [`03_ressources_et_chemins.md`](./03_ressources_et_chemins.md) §3.4. |
| `nodes` | `{ id: FlowNodeData }` | Le graphe de navigation lui-même. Voir §1.3. |

Champs absents ⇒ valeurs par défaut :
`languages` absent → `['fr','fon','yoruba','dendi','adja']` ; `resource_formats`
absent → `{audio:'mp3', image:'jpeg'}` ; `active_overrides` absent → tout actif ;
`hashmaps_no_resources` absent → `[]`.

## 1.2. `config.audio`

```json
{ "auto_play_prompt": true, "auto_play_option": true, "pause_between_ms": 600 }
```

- `auto_play_prompt` : si `true`, la séquence audio d'introduction d'un nœud
  (`node.audio`, voir §1.4) démarre automatiquement à l'affichage de l'écran,
  sans action de l'utilisateur.
- `auto_play_option` : si `true`, l'audio associé à une option de liste (ex. le
  nom d'un produit dans une grille) peut être joué automatiquement lors de sa
  mise en avant (focus/scan) plutôt que sur appui explicite — comportement
  d'accessibilité pour utilisateurs peu alphabétisés.
- `pause_between_ms` : pause par défaut (ms) entre deux **blocs** d'une réponse
  backend `audio_sequence` (voir [`02_navigation_et_lecture_audio.md`](./02_navigation_et_lecture_audio.md)
  §2.4 et [`04_contrat_api_backend.md`](./04_contrat_api_backend.md) §4). Une
  réponse peut surcharger cette valeur via son propre `meta.pause_ms`.

## 1.3. Les 5 types de nœuds

Chaque entrée de `nodes` a un champ `type` discriminant. Champs communs à tous
les types (`BaseNodeData`) :

| Champ | Type | Rôle |
|---|---|---|
| `comment` | `string?` | Note interne pour l'équipe Studio — **jamais affiché à l'utilisateur final**, à ignorer côté mobile. |
| `json_response_contrat` | `string?` | Documentation interne du contrat de réponse attendu — usage Studio uniquement, jamais consommé tel quel par l'app (la vraie réponse vient du backend, voir §4). |
| `audio` | `AudioSequence?` | Séquence audio jouée à l'entrée du nœud (intro/question). Voir §1.4 et §2.4. |

### `root` — menu principal

```json
{
  "type": "root",
  "options": [
    { "id": "achete_produit", "next": "achete_produit" },
    { "id": "vendre_produit", "next": "vendre_produit" }
  ],
  "audio": { "type": "sequence", "key": "root_intro", "sequence": ["intro/root_intro.mp3"], "fallback": "intro/default.mp3" }
}
```
- `options[]` : liste de choix fixes (`id` = identifiant stable de l'option,
  `next` = ID du nœud suivant). Contrairement aux nœuds `grid`/`pre_filter`, les
  options d'un `root` ne viennent **jamais** d'une variable — elles sont écrites
  en dur dans le flow (ce sont les grandes branches fonctionnelles de l'app,
  6 aujourd'hui : acheter, vendre, marché animé ×2, infos marché, explorer prix).
- Il n'existe **aucune convention d'image** pour une option de `root` — seul un
  audio (best-effort, non garanti disponible) peut exister, voir
  [`03_ressources_et_chemins.md`](./03_ressources_et_chemins.md) §3.5.

### `grid` — choix dans une variable

```json
{
  "type": "grid",
  "options_source": "produits",
  "set": "produit",
  "next": "achete_produit_departement",
  "can_choix_all": false,
  "controle_active": false,
  "audio": { "type": "sequence", "key": "achete_produit_intro", "sequence": ["intro/achete_produit_intro.mp3"], "fallback": "intro/default.mp3" }
}
```
- `options_source` : nom d'une entrée de `variables` — les options affichées
  sont ses valeurs.
- `set` : nom du **paramètre API** sous lequel la valeur choisie sera stockée
  dans le contexte de navigation, pour être transmise plus tard au nœud
  `result` (ex. choisir `"mais"` sur `options_source: "produits"` avec
  `set: "produit"` stocke `context.produit = "mais"`). **Ce n'est pas
  forcément identique à `options_source`** — c'est un nom de paramètre API,
  pas un nom de variable.
- `next` : ID du nœud suivant (unique, contrairement à `root`).
- `can_choix_all` (défaut `false`) : si `true`, une option "Tout" est ajoutée
  en tête de liste (valeur conventionnelle `tout`, voir
  [`06_pieges_et_glossaire.md`](./06_pieges_et_glossaire.md) — pas encore de
  convention backend officielle actée pour cette valeur).
- `controle_active` (défaut `false`) : si `true`, les valeurs marquées
  inactives dans `active_overrides` sont retirées de la liste affichée ; si
  `false`, **toutes** les valeurs de la variable sont affichées sans tenir
  compte de `active_overrides`.

### `pre_filter` — filtre interne via hashmap

```json
{
  "type": "pre_filter",
  "cle": "departements",
  "filtre_source": "marche_par_departement",
  "set": "marche",
  "next": "infos_marche_infos_type",
  "can_choix_all": false,
  "controle_active": false
}
```
- `cle` : nom du **paramètre déjà collecté en amont** (via un `set` d'un nœud
  précédent) dont la valeur sert de clé de recherche dans le hashmap. Ex. si un
  nœud `grid` antérieur a fait `set: "departements"` avec la valeur `"oueme"`,
  ce `pre_filter` filtre `hashmaps.marche_par_departement["oueme"]`.
- `filtre_source` : nom du hashmap dans `hashmaps`.
- `set`/`next`/`can_choix_all`/`controle_active` : même sens que pour `grid`.
- **Erreur bloquante à l'exécution** si `cle` ne correspond à aucune valeur déjà
  collectée dans le contexte — ce nœud ne peut jamais être atteint sans être
  précédé, dans le graphe, d'un nœud qui `set` ce paramètre.

### `calendrier` — sélecteur de date

```json
{
  "type": "calendrier",
  "periode": 7,
  "cadran": "centrer",
  "set": "anime_date",
  "next": "anime_calendrier_departement"
}
```
- `periode` : largeur de la fenêtre de dates sélectionnables, en jours.
- `cadran` : `"passé"` (fenêtre se terminant aujourd'hui), `"future"` (fenêtre
  commençant aujourd'hui) ou `"centrer"` (fenêtre centrée sur aujourd'hui).
  Algorithme exact de calcul de la fenêtre : voir
  [`02_navigation_et_lecture_audio.md`](./02_navigation_et_lecture_audio.md) §2.3.
- `set` : nom du paramètre API sous lequel la date choisie (`YYYY-MM-DD`) est
  stockée.
- `next` : ID du nœud suivant.

### `result` — écran de résultat (terminal)

```json
{
  "type": "result",
  "data_source": {
    "endpoint": "api/app/acheter_produit",
    "params": ["produit", "departement"],
    "method": "POST"
  },
  "response_examples": ["{ \"type\": \"audio_sequence\", \"...\": \"...\" }"],
  "audio": { "type": "sequence", "key": "acheter_result_intro", "sequence": ["intro/result_achete_produit_intro.mp3"], "fallback": "intro/default.mp3" }
}
```
- `data_source.endpoint` : chemin de la route backend (relatif à l'URL de base
  configurée dans l'app).
- `data_source.params` : liste des noms de paramètres à envoyer — chacun doit
  avoir été `set` par un nœud en amont sur ce chemin du graphe (sinon paramètre
  manquant à l'appel, voir §2.5).
- `data_source.method` : absent ⇒ **`POST`** (convention par défaut fixe, voir
  [`06_pieges_et_glossaire.md`](./06_pieges_et_glossaire.md) — toujours en
  usage aujourd'hui, tous les paramètres partent en JSON body, jamais en query
  string ni interpolés dans l'URL).
- `response_examples` : exemples de réponse à usage Studio (aperçu/tests) —
  **jamais la vraie réponse**, qui vient toujours d'un appel réel à
  `data_source.endpoint`. Un nœud `result` est **terminal** : il n'a ni `next`
  ni `options`, la navigation s'arrête là (retour au menu principal ensuite,
  logique de navigation propre à l'app, hors du flow).
- Le vrai contrat de réponse (enveloppe `audio_sequence`) est documenté dans
  [`04_contrat_api_backend.md`](./04_contrat_api_backend.md).

## 1.4. `AudioSequence` (champ `audio` de tout nœud)

```json
{ "type": "sequence", "key": "achete_produit_intro", "sequence": ["intro/achete_produit_intro.mp3"], "fallback": "intro/default.mp3" }
```

- `key` : identifiant unique de cette séquence dans tout le flow (le Studio
  refuse deux nœuds avec la même clé) — utile côté mobile pour du logging/cache,
  pas pour la résolution de chemin.
- `sequence` : liste de chemins **littéraux, sans dimension langue** (voir
  [`03_ressources_et_chemins.md`](./03_ressources_et_chemins.md) §3.3), joués
  bout à bout dans l'ordre, sans pause entre les éléments.
- `fallback` : chemin littéral joué à la place d'un élément de `sequence` s'il
  est introuvable sur le disque de l'appareil. La substitution se fait
  **élément par élément** (pas toute la séquence remplacée en bloc) — voir
  algorithme exact en §2.4.

## 1.5. `active_overrides` — état actif/inactif

```json
{
  "variables": { "produits": ["sorgho"] },
  "hashmaps": {
    "marche_par_departement": {
      "inactive_keys": ["plateau"],
      "inactive_values": { "oueme": ["adjohoun"] }
    }
  }
}
```

- Overlay **additif** : n'importe quelle valeur/clé absente de cette structure
  est considérée **active**. `active_overrides` ne liste que les exceptions
  (état inactif), jamais l'inverse.
- `variables[nom]` : liste des valeurs inactives de cette variable.
- `hashmaps[nom].inactive_keys` : clés du hashmap désactivées en bloc — **une
  clé inactive désactive de fait toutes ses valeurs**, même si `inactive_values`
  n'en liste aucune individuellement pour cette clé.
- `hashmaps[nom].inactive_values[clé]` : valeurs individuellement désactivées
  pour cette clé (indépendamment de l'état de la clé elle-même).
- **Cet état n'est appliqué que si le nœud `grid`/`pre_filter` concerné a
  `controle_active: true`** (voir §1.3). Un nœud avec `controle_active: false`
  (ou absent) ignore totalement `active_overrides` et affiche toute la liste.

## 1.6. Exemple réel complet

Le fichier `flow.json` à la racine du dépôt `flow_editor` est l'exemple de
référence vivant — 6 branches complètes (acheter, vendre, marché animé ×2,
infos marché, explorer prix), toutes les variables/hashmaps réels utilisés en
production de contenu. À consulter systématiquement en cas de doute sur une
combinaison de champs non couverte ci-dessus.
