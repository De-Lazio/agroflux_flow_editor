# Plan — États "actif" (variables/hashmaps) + attributs grid/pre_filter

Ce document fixe l'approche retenue et découpe la mise en œuvre en phases
indépendantes et vérifiables, avant tout codage. Objectif : ajouter un flag
"actif" par valeur de variable et par clé/valeur de hashmap, plus deux
nouveaux attributs sur les nœuds `grid`/`pre_filter`, **sans modifier** la
forme actuelle de `variables`/`hashmaps` ni le comportement des modules qui
en dépendent déjà.

## 1. Décision d'architecture (actée)

**Option retenue : overlay additif.** `variables` et `hashmaps` restent
exactement des `string[]` / `Record<string, string[]>` — inchangés dans
leur forme. Un nouveau champ, à part, ne liste que les **exceptions
inactives** (tout le reste est actif par défaut, donc rien à synchroniser
à l'ajout d'une nouvelle valeur).

Conséquence directe : `VariableManager`, `HashMapManager` (pour leur logique
de données), `validator.ts`, `resourceInventory.ts`, `backendContract.ts`,
`flowManager.ts`, `nodeFactory.ts` et le module `remoteImport.ts` livré
récemment ne changent **pas de forme** — seuls quelques points precis sont
étendus (détaillés phase par phase ci-dessous).

## 2. Nouveau champ `active_overrides`

Ajouté à la racine de `FlowData`, optionnel (absent = tout actif) :

```ts
// types/flow.ts
export interface HashmapActiveOverride {
  inactive_keys?: string[];                    // clés du hashmap désactivées en bloc
  inactive_values?: Record<string, string[]>;  // par clé, valeurs de sa liste désactivées
}

export interface ActiveOverrides {
  variables: Record<string, string[]>;         // varName -> valeurs inactives
  hashmaps: Record<string, HashmapActiveOverride>;
}

export interface FlowData {
  // ...champs existants inchangés...
  active_overrides?: ActiveOverrides;
}
```

Exemple concret dans `flow.json` :

```json
"active_overrides": {
  "variables": {
    "produits": ["sorgho"]
  },
  "hashmaps": {
    "marche_par_departement": {
      "inactive_keys": ["plateau"],
      "inactive_values": { "oueme": ["adjohoun"] }
    }
  }
}
```

Lecture : `produits` a toutes ses valeurs actives sauf `sorgho`. Dans le
hashmap `marche_par_departement`, la clé `plateau` est désactivée en bloc
(et donc toutes ses valeurs avec elle), et dans la clé `oueme` la valeur
`adjohoun` est désactivée individuellement.

Absent du JSON (flow existant, pré-migration) → traité comme
`{ variables: {}, hashmaps: {} }`, exactement sur le modèle déjà en place
pour `variables`/`hashmaps` eux-mêmes (`extraData.variables || {}` dans
`flowManager.ts`). **Aucune fonction de migration n'est nécessaire.**

## 3. Nouveaux attributs de nœud : `can_choix_all` / `controle_active`

Ajoutés en optionnel sur `GridNodeData` **et** `PreFilterNodeData` :

```ts
export interface GridNodeData extends BaseNodeData {
  type: 'grid';
  options_source: string;
  set: string;
  next: string;
  can_choix_all?: boolean;    // absent = false : pas d'option "Tout"
  controle_active?: boolean;  // absent = false : affiche toutes les valeurs, actives ou non
}

export interface PreFilterNodeData extends BaseNodeData {
  type: 'pre_filter';
  cle: string;
  filtre_source: string;
  next: string;
  can_choix_all?: boolean;
  controle_active?: boolean;
}
```

Sémantique (mise en œuvre par le mobile/backend, Studio ne fait qu'autoriser
la saisie) :
- `controle_active = true` ⇒ à l'affichage de ce nœud, ne proposer que les
  valeurs actives (selon `active_overrides`) pour la variable/le hashmap
  utilisé par ce nœud.
- `controle_active = false` ou absent ⇒ comportement actuel, aucune
  valeur filtrée (tout s'affiche, comme aujourd'hui).
- `can_choix_all = true` ⇒ une option "Tout" doit être proposée en plus de
  la liste de valeurs.

`nodeFactory.ts` posera explicitement `can_choix_all: false,
controle_active: false` sur les nouveaux nœuds (cohérent avec le style
déjà en place dans ce fichier, qui remplit toujours ses champs optionnels
avec une valeur par défaut concrète plutôt que de les laisser `undefined`).
Les nœuds déjà existants sans ces deux champs continuent de fonctionner
sans changement : partout où on les lit, on utilise `?? false`.

## 4. Qui consomme quoi

- **Studio (ce dépôt)** : outil d'auteur uniquement. Il montre *toujours*
  l'univers complet des valeurs (actives et inactives) dans
  `VariableManager`/`HashMapManager`, avec juste un indicateur visuel
  actif/inactif et un bouton pour basculer l'état. Il n'y a **aucun
  filtrage à l'affichage du Studio** — la phase pilote veut justement que
  tout soit développé/visible côté Studio.
- **Build / Publication / Asset Repository** : inchangés. Une valeur
  inactive nécessite quand même ses fichiers audio/image (elle pourra être
  activée plus tard sans qu'il manque de ressource) — `resourceInventory.ts`
  continue d'énumérer toutes les valeurs sans distinction.
- **Mobile + Backend** (hors de ce dépôt) : lisent `active_overrides` et les
  deux nouveaux attributs de nœud pour décider, à l'exécution, quelles
  options afficher à l'utilisateur final. Ce plan ne couvre que la partie
  Studio (authoring) ; le côté consommateur est un travail séparé, à
  coordonner avec l'équipe mobile/backend le moment venu.

## 5. Phases de mise en œuvre

### Phase 1 — Types + logique pure (`src/utils/activeState.ts`)
- Types `ActiveOverrides`/`HashmapActiveOverride` dans `types/flow.ts`.
- Nouveau fichier `src/utils/activeState.ts`, logique pure et testée :
  - `isVariableValueActive(overrides, varName, value)`
  - `isHashmapKeyActive(overrides, mapName, key)`
  - `isHashmapValueActive(overrides, mapName, key, value)`
  - `toggleVariableValueActive(overrides, varName, value)` → nouvel objet
  - `toggleHashmapKeyActive(overrides, mapName, key)` → nouvel objet
  - `toggleHashmapValueActive(overrides, mapName, key, value)` → nouvel objet
  - Fonctions de nettoyage, appelées lors des suppressions/renommages :
    `removeVariableOverrides(overrides, varName)`,
    `pruneVariableOverrideValue(overrides, varName, value)`,
    `removeHashmapOverrides(overrides, mapName)`,
    `removeHashmapKeyOverrides(overrides, mapName, key)`,
    `pruneHashmapOverrideValue(overrides, mapName, key, value)`.
- Tests Vitest exhaustifs sur ces fonctions (défaut actif si rien n'est
  listé, toggle idempotent, nettoyage ne touche pas les autres entrées).

*Rien d'autre ne bouge à cette étape : c'est un nouveau module isolé.*

### Phase 2 — `VariableManager.tsx` / `HashMapManager.tsx`
- Nouvelles props `activeOverrides` + `onActiveOverridesChange`.
- Chaque chip de valeur (variable, ou valeur dans une clé de hashmap)
  reçoit un petit bouton/toggle "actif" (ex. pastille pleine/vide), rendu
  visuellement atténué quand inactif.
- Chaque ligne de clé de hashmap reçoit le même toggle au niveau de la clé.
- `removeVariable`/`removeValue` (VariableManager) et
  `removeHashMap`/`removeKey`/`removeValue` (HashMapManager) appellent en
  plus la fonction de nettoyage correspondante de `activeState.ts`, pour
  ne jamais laisser une exception pointer vers une valeur/clé supprimée.
- Aucune modification de la logique existante d'ajout/suppression de
  valeurs — uniquement des ajouts.

### Phase 3 — `NodeEditor.tsx` (grid, pre_filter) + `nodeFactory.ts`
- Deux cases à cocher ajoutées dans la section d'édition des nœuds `grid`
  et `pre_filter` : "Autoriser le choix « Tout »" (`can_choix_all`) et
  "N'afficher que les options actives" (`controle_active`).
- `nodeFactory.ts` : `createDefaultGridNode`/`createDefaultPreFilterNode`
  posent `can_choix_all: false, controle_active: false`.

### Phase 4 — `validator.ts` : garde-fou de cohérence
- Nouveau bloc de warnings (même style que la section "Validation du
  mapping de ressources" existante) : pour chaque entrée de
  `active_overrides`, vérifier qu'elle référence bien une variable/valeur
  ou un hashmap/clé/valeur qui existe encore. Sinon, avertissement
  `"active_overrides référence une valeur inexistante ..."`. Filet de
  sécurité si la discipline de nettoyage de la Phase 2 est un jour
  contournée (import JSON externe modifié à la main, par exemple).

### Phase 5 — Persistance (`App.tsx`, `flowManager.ts`)
- `flowManager.ts` : `FlowExtraData.active_overrides?: ActiveOverrides`,
  et `flowToJson` écrit `active_overrides: extraData.active_overrides ||
  { variables: {}, hashmaps: {} }` — même motif que `variables`/`hashmaps`.
- `App.tsx` : nouvel état `activeOverrides`, branché : restauration de
  session (`session.activeOverrides || défaut`), chargement du flow
  initial (`initialFlow.active_overrides || défaut`), `handleNewProject`
  (reset), `handleLoad` (reset depuis le JSON importé), auto-sauvegarde
  (ajout aux dépendances), `buildExtraData()` (inclusion), props passées à
  `VariableManager`/`HashMapManager`.

### Phase 6 — Documentation
- `context.md` / `GUIDE_CONCEPTION_FLOW.md` : décrire `active_overrides`
  et les deux nouveaux attributs de nœud (schéma + sémantique runtime).
- `public/documentation.html` : nouvelle sous-section dans "Variables &
  HashMaps" et dans le guide d'édition des nœuds grid/pre_filter.
- **`API_IMPORT_FORMAT.md` et `remoteImport.ts` ne changent pas** : l'état
  actif est une donnée d'auteur purement locale au Studio, jamais issue de
  l'API distante — l'extension éventuelle est hors périmètre de ce plan.

### Phase 7 — Tests
- `activeState.test.ts` (Phase 1).
- `validator.test.ts` : cas de référence morte dans `active_overrides`.
- Vérification manuelle en navigateur (CDP), comme pour toutes les
  fonctionnalités d'UI précédentes de ce projet (pas de tests Vitest sur
  les composants React — convention déjà en place) : toggles actif/inactif
  dans les deux managers, nettoyage à la suppression, cases à cocher dans
  `NodeEditor`, persistance session/JSON round-trip.

## 6. Explicitement non impacté

- `resourceInventory.ts` (génère les ressources attendues pour *toutes*
  les valeurs, actives ou non).
- `backendContract.ts` (documente uniquement les routes HTTP des nœuds
  `result` — aucun rapport avec les variables/hashmaps ou ces nouveaux
  attributs).
- `remoteImport.ts` / `ApiImportPanel.tsx` / `API_IMPORT_FORMAT.md`.
- `StudioPanel.tsx` et les trois onglets (Ressources, Build, Publication).
- Le format `string[]` de `variables` et `Record<string,string[]>` de
  `hashmaps` eux-mêmes.

## 7. Risques résiduels

- **Oubli de nettoyage** : si un futur développeur ajoute un nouveau point
  de suppression de valeur/clé sans appeler la fonction de nettoyage
  correspondante, une exception orpheline s'accumule dans
  `active_overrides`. Impact nul fonctionnellement (elle ne référence
  plus rien), mais le warning de la Phase 4 la détecte et alerte.
- **Divergence de compréhension avec l'équipe mobile/backend** sur la
  sémantique exacte de `controle_active`/`can_choix_all` : à valider avec
  eux avant l'implémentation runtime côté app, ce plan ne fixant que le
  côté Studio.
