# Plan de mise en œuvre — AgroFlux Studio

Ce plan traduit `new_orientation.md` / `studio.md` en étapes concrètes, en tenant compte
de l'existant (`src/`) et des deux arbitrages tranchés avant d'écrire ce plan :

- **Accès disque réel** : File System Access API (`showDirectoryPicker`), handle persisté
  en IndexedDB. Chrome/Edge/Opera **exigés**, aucun mode dégradé — voir 3.2.
- **Langues** : liste déclarée explicitement dans les paramètres du flow (nouveau champ
  `languages: string[]` sur `FlowData`), pas de découverte automatique pure. Liste officielle
  de départ (confirmée) : `fr` (référence/débogage), `fon`, `yoruba`, `dendi`, `adja` — en
  minuscules, non figée dans le code, extensible librement dans l'UI.

Réponses reçues sur `QUESTIONS_STUDIO.md` (aucun consommateur backend/Flutter en production,
dépôt de ressources actuellement vide) → **le Studio définit le contrat officiel**, aucune
contrainte de rétrocompatibilité à respecter. Décisions supplémentaires qui en découlent :

- **Les images ne sont jamais multilingues** — seul l'audio dépend de la langue. Correction
  importante par rapport à la version précédente de ce plan qui multipliait aussi les images
  par langue (Phase 1.1 réécrite ci-dessous).
- **Convention de chemin officielle** : `audio/{lang}/{folder}/{fichier}` (dossier racine
  **singulier** `audio/`) pour l'audio, `images/{folder}/{fichier}` (pas de segment langue)
  pour l'image. Le code actuel génère `audios/...` (pluriel) — c'est un bug à corriger, pas
  une simple évolution (voir 1.1).
- **`dynamic_audio` est obsolète** — à supprimer du schéma (Phase 1.3).
- **`params` d'un nœud `result`** : pas de placeholder dans `endpoint`, Flutter construit un
  corps JSON `{param: valeur}` à partir de cette liste. Le Studio ne doit pas interpréter la
  construction de l'URL (Phase 2.2 réécrite ci-dessous — voir aussi la limite découverte en
  vérifiant le vrai `flow.json`).
- **snake_case obligatoire** pour tous les champs JSON générés (manifest/repository), cohérent
  avec le reste de `flow.json`.
- **Manifest = chemins relatifs uniquement, jamais d'URL** — le Studio ne connaît jamais le
  serveur de publication (`base_url` est reconstruit côté Flutter/backend, pas ici).
- **Publication v1 = dossier local uniquement** (`publish/{flow.json, manifest.json,
  repository.json, assets/}`), aucune automatisation (Git/CI/CD/S3) — confirme le plan déjà écrit.

Précision reçue le 2026-07-06 : l'app Flutter et toutes ses routes backend restent à développer.
Le Studio doit donc aussi ressortir un **contrat backend** (liste des routes à implémenter,
dérivée automatiquement du flow), en plus du contrat de ressources déjà prévu — pour que
développer et maintenir l'app (ajout/modification d'une branche du flow) ne demande jamais de
relire tout `flow.json` à la main. Décision qui en découle :
- **Ajout d'un champ `DataSource.method`** (`'GET' | 'POST' | 'PUT' | 'DELETE'`, optionnel,
  défaut `'POST'` si absent) — le schéma actuel ne portait aucune information de verbe HTTP.
  Voir 0.4 et 2.4 ci-dessous.

Corrections retenues de l'analyse (appliquées dans les phases ci-dessous, pas de retour dessus) :
- "orphelin" et "inutilisé" = un seul concept (fichier présent, non référencé).
- Validation des contrats backend = cohérence **interne** au flow uniquement (pas d'import
  de schéma backend — hors scope).
- Cycles = avertissement, jamais bloquant, et seulement pour les boucles qui n'atteignent
  jamais de nœud `result`.
- `FlowData.version` (version de schéma) reste ; le repository d'assets, lui, n'a pas de
  numéro de version — seulement un hash.
- "Build automatique" = aucun calcul/copier-coller manuel, pas "zéro clic" (une autorisation
  navigateur reste nécessaire).

---

## Vue d'ensemble des phases

| Phase | Contenu | Dépend de |
|---|---|---|
| 0 | Fondations transverses (accès disque, langues, hash) | — |
| 1 | Resource Manager — évolution (multilingue, réconciliation) | 0 |
| 2 | Validation — évolution (cycles, contrats, exports HTML/MD, contrat backend) | — |
| 3 | Asset Repository (manifest, repository, scan réel) | 0, 1 |
| 4 | Build System (action unique "Build Project") | 1, 2, 3 |
| 5 | Publication (dossier prêt à consommer) | 4 |

Les phases 1 et 2 sont indépendantes entre elles et peuvent être faites en parallèle si besoin.
La phase 3 ne peut pas commencer avant la 0 (elle a besoin de l'accès disque) ni avant la 1
(elle compare au format de ressource multilingue).

---

## Phase 0 — Fondations transverses

### 0.1 `src/utils/fsAccess.ts` (nouveau)

```ts
requestProjectDirectory(): Promise<FileSystemDirectoryHandle>   // showDirectoryPicker()
persistDirectoryHandle(handle): Promise<void>                   // IndexedDB (les handles sont clonables)
restoreDirectoryHandle(): Promise<FileSystemDirectoryHandle | null>
verifyPermission(handle, mode: 'read' | 'readwrite'): Promise<boolean>  // queryPermission/requestPermission
walkDirectory(handle): Promise<Map<string, FileSystemFileHandle>>      // chemin relatif -> handle, récursif
hashFile(fileHandle): Promise<string>                            // crypto.subtle.digest('SHA-256', buffer) -> hex
readFileSize(fileHandle): Promise<number>
writeTextFile(dirHandle, relativePath: string, content: string): Promise<void>  // crée les sous-dossiers via getDirectoryHandle({create:true})
```

Aucune dépendance externe : tout est faisable avec les API natives du navigateur.
C'est la seule brique dont tout le reste dépend — à faire en premier et à tester isolément
(un composant de debug temporaire suffit : sélectionner un dossier, lister son contenu,
afficher un hash).

### 0.2 Langues déclarées

- `FlowData.languages: string[]` (nouveau champ, défaut `['fr', 'fon', 'yoruba', 'dendi', 'adja']`
  — confirmé, `fr` sert de langue de référence/débogage).
- Nouvel onglet "Langues" dans `FlowSettingsManager.tsx` : liste éditable (ajout/suppression
  de chaînes), pas de validation de format particulière (n'importe quel nom de dossier valide).
- `flowManager.ts` (`flowToJson`/`jsonToFlow`) : inclut/lit ce champ comme les autres.

### 0.3 Champ `method` sur `DataSource`

- `DataSource.method?: 'GET' | 'POST' | 'PUT' | 'DELETE'` (nouveau champ optionnel, défaut
  `'POST'` si absent — cohérent avec la convention déjà validée : un seul verbe, tout passe en
  JSON body, aucun placeholder dans l'URL).
- `NodeEditor.tsx` : sélecteur à côté du champ `endpoint` d'un nœud `result`.
- `flowManager.ts` (`jsonToFlow`/`flowToJson`) : lit/écrit ce champ comme les autres ; absent =
  traité comme `'POST'` partout ailleurs dans le code (migration silencieuse, rien à ressaisir
  dans le `flow.json` existant).
- `nodeFactory.ts` : les nouveaux nœuds `result` n'ont pas besoin de fixer la valeur (le défaut
  `'POST'` suffit).

### 0.4 Tests

- `fsAccess.ts` n'est pas testable en Vitest classique (API navigateur, pas de polyfill jsdom
  fiable pour `showDirectoryPicker`) → vérification manuelle via CDP comme pour le reste du
  projet, pas de test unitaire forcé dessus.
- Test Vitest simple pour le défaut de `languages` dans `jsonToFlow`/`flowToJson`.
- Pas de test dédié pour le défaut de `method` ici : `flowManager.ts` ne fait que recopier
  `data_source` tel quel (spread générique, comme tous les champs propres à un type de nœud),
  il n'y a donc pas de logique de défaut à tester à cet endroit. Le point d'application du
  défaut (`data_source.method ?? 'POST'`) est couvert là où il compte réellement : l'affichage
  dans `NodeEditor.tsx` et le regroupement par endpoint dans `backendContract.test.ts` (2.4).

---

## Phase 1 — Resource Manager (évolution)

### 1.1 Segment langue — audio uniquement, jamais l'image

Confirmé : une photo ne dépend pas de la langue, seul l'audio en dépend. Les deux fonctions
divergent donc dans leur traitement de la langue (l'image ne prend plus `languages` en compte) :

```ts
buildVariableResources(variables, mappings, languages: string[], audioFormat, imageFormat): ResourceGroup
buildHashmapResources(hashmaps, mappings, languages: string[], audioFormat, imageFormat): ResourceGroup
```

Format de chemin officiel confirmé :

```
audio/{lang}/{folder}/{value}.{ext}              (une entrée PAR langue déclarée)
audio/{lang}/{folder}/{key}/{value}.{ext}         (hashmaps, idem)

images/{folder}/{value}.{ext}                     (une seule entrée, jamais dupliquée par langue)
images/{folder}/{key}/{value}.{ext}               (hashmaps, idem)
```

Exemple réel : `audio/fon/produits/mais.mp3`, `audio/yoruba/produits/mais.mp3`, ... (5 entrées
avec les langues par défaut) mais une seule `images/produits/mais.webp`. Seul l'inventaire audio
est multiplié par le nombre de langues actives.

**Correction d'un bug préexistant, pas seulement une évolution** : le code actuel génère
`audios/...` (pluriel) pour l'audio — la convention officielle confirmée est `audio/` (singulier).
`images/` (pluriel) était déjà correct, aucun changement sur ce point. À corriger partout :
`resourceInventory.ts`, `resourceInventory.test.ts`, `validator.test.ts`, `flow.json`,
`ResourceMappingManager.tsx`.

Impact à propager :
- `validator.ts` (appelle ces deux fonctions pour construire le rapport) — passer `flow.languages`.
- `resourceInventory.test.ts`, `validator.test.ts` — mettre à jour les fixtures et assertions
  attendues (chemins `audios/...` sans langue deviennent `audio/{lang}/...`, chemins image
  simplement re-préfixés en `images/...` sans changement de structure).
- `flow.json` par défaut — régénérer les mappings/chemins attendus.
- `ResourceMappingManager.tsx` — l'affichage reste au niveau dossier parent (inchangé, le spec
  est explicite là-dessus : "il n'y aura que le chemin principal", la langue n'apparaît que dans
  l'inventaire détaillé, pas dans le mapping).

### 1.3 Nettoyage du schéma : suppression de `dynamic_audio`

Confirmé obsolète, ne fait plus partie de l'architecture cible. À retirer complètement :
- `FlowData.dynamic_audio` (`src/types/flow.ts`).
- Lecture/écriture dans `flowManager.ts` (`jsonToFlow`/`flowToJson`).
- Toute référence dans `App.tsx`.
- Le champ dans `flow.json` (fichier de données par défaut).
- Mentions dans `context.md`/`analyse.md`/`PLAN_V2.md` si présentes (documentation historique,
  à corriger pour ne pas induire en erreur un futur lecteur).

Suppression pure (pas de migration à prévoir, aucun consommateur n'en dépend).

### 1.2 Vocabulaire unique : manquant / orphelin

- `ResourceGroup` (dans `types/flow.ts`) reste la forme "ressources attendues".
- Nouveau type `ReconciliationResult { missing: string[]; orphaned: string[] }` dans `types/flow.ts`.
- Nouveau fichier `src/utils/resourceReconciliation.ts` :

```ts
reconcileResources(expected: string[], presentOnDisk: string[]): ReconciliationResult
// missing = expected - presentOnDisk
// orphaned = presentOnDisk - expected
```

Cette fonction est pure (pas d'accès disque), donc testable en Vitest classique. Elle remplace
la logique ad-hoc de `ResourceCheckPanel.tsx` (comparaison basename uniquement) — la phase 3
lui fournira les chemins complets réels (plus de faux positifs par collision de nom de fichier
entre deux dossiers, un des points mineurs déjà notés dans `analyse.md`).

---

## Phase 2 — Validation (évolution)

Tout dans `src/utils/validator.ts`, aucune nouvelle dépendance.

### 2.1 Détection de cycles (avertissement uniquement)

Algorithme :
1. Construire l'ensemble `CAN_TERMINATE` = tous les nœuds d'où un nœud `result` est
   atteignable (BFS/DFS en arrière depuis chaque nœud `result`, sur le graphe inversé des
   liens `next`/`options[].next`).
2. Détecter les cycles du graphe (DFS classique avec coloration blanc/gris/noir).
3. Pour chaque cycle trouvé : si **aucun** nœud du cycle n'appartient à `CAN_TERMINATE`,
   avertissement "boucle sans issue" avec la liste des nœuds concernés. Sinon, rien —
   c'est une boucle volontaire (ex. un grid qui reprogpose le menu précédent) et il existe
   une porte de sortie.

### 2.2 Cohérence interne des contrats (pas d'import de schéma backend)

Confirmé : `endpoint` est un chemin plat sans placeholder (`"api/app/acheter_produit"`), les
`params` sont une liste de noms que Flutter empaquette tels quels dans un corps JSON
(`{"produit": "...", "departement": "..."}`). Le Studio ne doit **jamais** essayer d'interpréter
la construction de l'URL — confirmé explicitement.

Point important découvert en vérifiant le vrai `flow.json` : il n'existe **aucune
correspondance mécanique** entre le nom d'un `set` de grid (ex. `"produits"`, pluriel) et le
nom du param final utilisé par le `result` en aval (ex. `"produit"`, singulier) — le
renommage sémantique est fait à la main par le concepteur du flow, sans champ de liaison
déclaré nulle part dans le schéma actuel. Une validation "ce param est bien défini quelque part
en amont dans le flow" ne peut donc **pas** être faite par correspondance de nom sans produire
de faux positifs sur des flows par ailleurs valides (le flow par défaut du projet en contient
plusieurs). Implémenter cette traçabilité proprement demanderait d'ajouter un nouveau champ de
liaison explicite au schéma — hors scope de cette phase, à ne considérer que si un besoin réel
se manifeste.

Vérifications retenues pour cette phase (sûres, sans faux positif) sur `data_source.params` de
chaque nœud `result` :
- Erreur bloquante : un nom de paramètre vide, ou dupliqué dans la même liste.
- Avertissement : `data_source` présent mais `params` vide (probable oubli).

Explicitement **hors scope** : comparer à un schéma backend réel (aucune source de vérité
importable n'existe aujourd'hui) et vérifier qu'un `param` est réellement "défini dans le flow"
(pas de champ de liaison dans le schéma actuel, voir ci-dessus).

### 2.3 Export du rapport en HTML et Markdown

`ValidationPanel.tsx` a déjà l'export JSON. Ajouter dans `src/utils/` (nouveau fichier
`reportExport.ts`) :

```ts
exportReportAsMarkdown(result: ValidationResult): string
exportReportAsHtml(result: ValidationResult): string
```

Réutilisent la même structure de données, pas de nouvelle logique de validation. Trois boutons
dans `ValidationPanel.tsx` au lieu d'un (JSON / Markdown / HTML).

### 2.4 Contrat Backend (nouveau fichier généré)

Demande reçue le 2026-07-06 : en plus du contrat de ressources pour Flutter, le Studio doit
ressortir la liste de toutes les routes backend à développer, dérivée automatiquement du flow —
pour qu'ajouter ou modifier une branche (nouveau nœud `result`, changement de `params`) mette à
jour le contrat sans relecture manuelle de `flow.json` par le développeur backend.

`src/utils/backendContract.ts` (nouveau) :

```ts
interface BackendEndpoint {
  endpoint: string;                // chemin plat, ex. "api/app/acheter_produit"
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';  // DataSource.method, 'POST' si absent (voir 0.3)
  params: string[];                // union des params de tous les nœuds result partageant (endpoint, method)
  response_example?: string;       // premier `response_examples` non vide trouvé, sinon
  json_response_contrat?: string;  // premier `json_response_contrat` non trivial ("{}") trouvé
  used_by_nodes: string[];         // ids des nœuds result concernés, pour traçabilité/debug
}
interface BackendContract {
  generated_at: string;
  endpoints: BackendEndpoint[];
}

buildBackendContract(flow: FlowData): BackendContract
```

Règles :
- Regroupement par couple `(endpoint, method)` — deux nœuds `result` peuvent légitimement
  partager la même route (deux points d'entrée qui la réutilisent) ; les `params` sont alors
  l'union des deux listes.
- Pas d'inférence de type sur les `params` (`string`/`number`/...) : le schéma actuel ne porte
  aucune information de type, seulement des noms — rester fidèle à l'existant plutôt que
  d'inventer une inférence non demandée.
- Nouvel avertissement dans `validator.ts` (2.2) : un même `endpoint` utilisé avec des `method`
  différents selon les nœuds — signale une incohérence probable, jamais bloquant (le Studio ne
  connaît pas l'intention réelle du concepteur du flow).

Export, même pattern que 2.3 (`reportExport.ts`) :

```ts
exportBackendContractAsJson(contract: BackendContract): string
exportBackendContractAsMarkdown(contract: BackendContract): string
// tableau : Endpoint | Méthode | Params | Exemple de réponse
```

`backendContract.test.ts` : fonction pure, testable en Vitest classique (regroupement par
endpoint+method, union des params, cas "même endpoint deux méthodes").

---

## Phase 3 — Asset Repository

### 3.1 `src/utils/assetRepository.ts` (nouveau)

Champs en **snake_case** (confirmé, cohérent avec `flow.json`/backend Laravel/Flutter) :

```ts
interface ManifestEntry {
  path: string;                        // relatif, jamais d'URL/chemin absolu — ex. "audio/fon/produits/mais.mp3"
  hash: string;                        // SHA-256 hex du contenu réel du fichier
  file_size: number;                   // octets
  resource_type: 'audio' | 'image';    // dérivé du premier segment du chemin (audio/ vs images/)
  last_modified: string;               // ISO 8601, depuis File.lastModified (métadonnée du fichier, pas la date de scan)
}
interface Manifest {
  generated_at: string;                // ISO 8601, date du scan
  entries: ManifestEntry[];
}
interface Repository {
  repository_hash: string;
  generated_at: string;
  entry_count: number;
}

buildManifest(dirHandle: FileSystemDirectoryHandle): Promise<Manifest>
// walkDirectory + hashFile + File.size + File.lastModified pour chaque fichier réellement présent

computeRepositoryHash(manifest: Manifest): string
// tri des entries par `path`, concaténation "path|hash|file_size" par entrée, SHA-256 du tout
// -> déterministe : mêmes fichiers = même hash, peu importe l'ordre de scan
```

Le manifest ne contient et ne contiendra jamais de `base_url` ni d'URL absolue — confirmé, la
reconstruction `base_url + path` est une responsabilité de Flutter/backend, le Studio ne connaît
jamais le serveur de publication.

### 3.2 `src/components/AssetRepositoryPanel.tsx` (nouveau)

- Bouton "Connecter le dossier de ressources" → `requestProjectDirectory()` + persistance.
- Bouton "Scanner" → `buildManifest()`, affiche le tableau (chemin / taille / hash tronqué).
- Utilise `reconcileResources(expected, manifest.entries.map(e => e.path))` (phase 1.2) pour
  afficher manquants/orphelins avec les **chemins complets multilingues** (remplace la
  comparaison par nom de fichier seul de `ResourceCheckPanel.tsx`).
- `ResourceCheckPanel.tsx` (mécanisme `tree.txt`) est **supprimé**, ainsi que l'export
  `RESOURCE_EXTENSIONS` (`resourceInventory.ts`, seul consommateur) et son intégration dans
  `ValidationPanel.tsx`. Décision prise en écart volontaire du texte du spec ("le mécanisme
  tree reste conservé") : `tree` ne donne accès ni au contenu des fichiers (donc jamais de
  SHA-256, le manifest resterait une coquille vide) ni à l'écriture sur disque (donc jamais de
  Build automatique) — les deux piliers du Studio en dépendent, un mode dégradé n'aurait donc
  aucune valeur réelle, juste une fausse impression de compatibilité.
- Si `window.showDirectoryPicker` est absent (Firefox/Safari), `AssetRepositoryPanel.tsx`
  affiche un message bloquant clair ("ce navigateur n'est pas supporté, utilisez Chrome/Edge")
  plutôt que de proposer un mécanisme dégradé.

### 3.3 Tests

- `assetRepository.test.ts` : `computeRepositoryHash` est pur et testable (donner un manifest
  fixe, vérifier déterminisme et sensibilité à un changement de hash/chemin).
- `buildManifest` nécessite de vrais `FileSystemDirectoryHandle` → vérification manuelle CDP
  uniquement, comme `fsAccess.ts`.

---

## Phase 4 — Build System

### 4.1 `src/utils/buildProject.ts` (nouveau)

```ts
interface BuildResult {
  validation: ValidationResult;
  manifest: Manifest;
  repository: Repository;
  reconciliation: ReconciliationResult;
  backendContract: BackendContract;
}

runBuild(flow: FlowData, resourcesDirHandle: FileSystemDirectoryHandle, outputDirHandle: FileSystemDirectoryHandle): Promise<BuildResult>
```

Orchestration (aucune nouvelle logique métier, assemble l'existant) :
1. `validateFlow(flow)` → erreurs/avertissements + inventaire.
2. `buildManifest(resourcesDirHandle)` → scan réel.
3. `reconcileResources(inventaire attendu, manifest.entries)` → manquants/orphelins.
4. `computeRepositoryHash(manifest)`.
5. `buildBackendContract(flow)` (2.4) → liste des routes à implémenter, dérivée du flow.
6. Écrit dans `outputDirHandle` via `writeTextFile` : `flow.json`, `resource_inventory.json`
   (le report existant), `manifest.json`, `repository.json`, `validation_report.json`,
   `validation_report.md`, `backend_contract.json`, `backend_contract.md`.
7. Si erreurs bloquantes détectées à l'étape 1 : le build s'arrête avant l'écriture des
   fichiers et remonte la liste d'erreurs (jamais de sortie partielle/incohérente sur disque).

### 4.2 UI

Un bouton "Build Project" (dans `Toolbar.tsx` ou un nouveau panneau `StudioPanel.tsx` regroupant
Asset Repository + Build + Publication, pour ne pas re-surcharger la toolbar comme avant la
correction du menu "Données"). Affiche le résultat structuré (comme `ValidationPanel.tsx`) :
sections erreurs / avertissements / manifest / réconciliation, avec les mêmes codes couleur
déjà en place.

---

## Phase 5 — Publication

Pas un nouveau moteur : réutilise `runBuild` avec un dossier de sortie différent, plus une
étape de copie des seuls fichiers **réellement référencés** (pas tout `assets/`) :

```ts
preparePublication(flow: FlowData, resourcesDirHandle, publishDirHandle): Promise<void>
// 1. runBuild(...) vers publishDirHandle (flow.json, manifest.json, repository.json)
// 2. copie dans publishDirHandle/assets/ uniquement les fichiers présents dans manifest.entries
//    (via FileSystemFileHandle -> getFile() -> write dans le nouveau handle)
```

Différence avec le Build normal : le Build sert à vérifier/itérer en local, la Publication
produit un répertoire "propre" prêt à être consommé par backend/Flutter (pas de fichiers
orphelins copiés dedans).

---

## Hors scope volontaire pour cette v1

- Support vidéo/animation dans l'Asset Repository (le spec les mentionne comme "futures" —
  pas de valeur à généraliser un type de ressource qui n'existe pas encore concrètement).
- Génération de patches/diffs incrémentaux — le spec dit explicitement que Flutter compare les
  hash lui-même, le Studio n'a rien à calculer de ce côté.
- Import d'un schéma backend réel pour valider les contrats — cf. point 2.2, pas de source
  disponible aujourd'hui.
- Support Firefox/Safari : aucun mode dégradé. Le mécanisme `tree.txt` est supprimé (cf. 3.2)
  plutôt que conservé en secours — il ne peut techniquement fournir ni hash ni écriture réelle,
  un faux "ça marche un peu" serait pire qu'un message clair "navigateur non supporté".

---

## Ordre d'implémentation recommandé

1. Phase 0 (fondations) — rien d'autre ne peut avancer sans ça.
2. Phase 1 et Phase 2 en parallèle (indépendantes, chacune a ses propres tests Vitest).
3. Phase 3 (a besoin de 0 et 1).
4. Phase 4 (a besoin de 1, 2, 3).
5. Phase 5 (a besoin de 4, quasiment gratuite une fois le Build fait).

Chaque phase se termine par : tests Vitest (pour la logique pure), `tsc -b --noEmit`, `lint`,
et une vérification manuelle réelle dans Chrome (CDP) pour tout ce qui touche à l'accès disque,
avant de passer à la phase suivante.
