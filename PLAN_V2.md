> **Note (voir PLAN_STUDIO.md, Phase 1.3)** : ce plan est historique (déjà exécuté). Les
> mentions de `dynamic_audio` ci-dessous sont obsolètes — ce champ a depuis été retiré
> entièrement du schéma, il ne fait plus partie de l'architecture cible.

# Plan — Ne garder que le format V2 (Dynamic)

Objectif : supprimer tout le code du format "Legacy" (menu/filter/results/widget) pour ne garder
que le format "Dynamic" (root/grid/result/calendrier/pre_filter). Un seul format = un éditeur plus
simple, moins de branches `if (isDynamic)`, moins de bugs possibles.

Règle pour tout ce plan : **si un bloc de code sert uniquement au format legacy, on le supprime**.
On ne garde aucune compatibilité, aucun flag, aucun "au cas où".

---

## Étape 0 — Décisions à prendre avant de coder

Deux choses à trancher une fois pour toutes avant de toucher au code, pour ne pas coder deux fois :

1. **Champ `pre_filter` : `cle` ou `cles` ?**
   `context.md` montre un nœud avec `"cles": ["produits"]` (tableau) ET `"cle": "departements"`
   (texte). Le code actuel ne gère que `cle`. → **Décision : on garde uniquement `cle` (texte)**,
   qui est ce qui est réellement implémenté et fonctionnel. On supprime `cles` du contrat si le
   backend n'en a pas besoin. (À confirmer avec le backend si besoin, sinon on part là-dessus.)

2. **`config`, `entry`, `dynamic_audio` : on ajoute une UI ou on les laisse en l'état ?**
   Aujourd'hui ces champs sont chargés/sauvegardés mais pas éditables dans l'interface.
   → **Décision : on ajoute le strict minimum** (voir Étape 9), pas de nouveau gros composant.

---

## Étape 1 — Nouveau fichier `flow.json` par défaut

Le `flow.json` actuel à la racine est au format **legacy** : c'est lui qui est chargé au tout
premier lancement de l'app (`import initialFlow from '../flow.json'` dans `App.tsx`). Il faut le
remplacer par un flow au format dynamic, sinon l'app plantera au premier chargement.

- [ ] Renommer l'actuel `flow.json` en `flow.legacy.json.bak` (à la racine, hors de `src`, juste
      pour garder une trace — pas utilisé par le code).
- [ ] Créer un nouveau `flow.json` au format dynamic. Le plus simple : reprendre l'exemple complet
      donné dans `context.md` (nœuds `root`, `achete_produit`, `vendre_produit`, etc.) et le mettre
      tel quel comme nouveau `flow.json`.

---

## Étape 2 — `src/utils/nodeFactory.ts`

- [ ] Supprimer les fonctions legacy : `createDefaultMenuNode`, `createDefaultFilterNode`,
      `createDefaultResultsNode`, `createDefaultWidgetNode`.
- [ ] Garder uniquement : `createDefaultRootNode`, `createDefaultGridNode`,
      `createDefaultResultNode`, `createDefaultCalendrierNode`, `createDefaultPreFilterNode`.
- [ ] Si Étape 0.1 tranchée : nettoyer `createDefaultPreFilterNode` pour ne garder que `cle`.

---

## Étape 3 — `src/utils/flowManager.ts`

- [ ] Dans `jsonToFlow` : supprimer le `if (isDynamic) {...} else {...}` → garder uniquement la
      branche dynamic (options de `root`, sinon `node.next`). Supprimer la variable `isDynamic`.
- [ ] Dans `flowToJson` : supprimer le paramètre `format` et le `if (format === 'dynamic')` →
      la fonction renvoie toujours la structure dynamic (`version`, `entry`, `config`, `variables`,
      `hashmaps`, `audio_mappings`, `dynamic_audio`, `nodes`).
- [ ] `getLayoutedElements` ne change pas (déjà générique).

---

## Étape 4 — `src/utils/validator.ts`

- [ ] Supprimer la variable `isDynamic` et toutes les branches `else` (legacy) qui vont avec.
- [ ] Le fichier valide toujours le format dynamic : `audio_mappings` obligatoire, `audio.key`
      unique, séquence audio non vide, JSON valide dans `json_response_contrat` /
      `response_examples`, liens `next` / `options[].next` valides, nœuds orphelins.
- [ ] Supprimer la logique legacy `node.audio?.context` et le warning basé sur
      `node.type === 'menu' || 'filter'` (remplacer par un check générique sur `root` uniquement,
      seul type dynamic qui a des `options`).

*(Les améliorations du validator identifiées dans l'audit — culs-de-sac, vérif `pre_filter` —
sont notées en bonus à la fin, pas obligatoires pour cette simplification.)*

---

## Étape 5 — `src/components/CustomNode.tsx`

- [ ] Dans `getTypeColor` et `getHandleColor` : supprimer les `case` legacy (`menu`, `filter`,
      `results`, `widget`), garder uniquement `root`, `grid`, `result`, `calendrier`, `pre_filter`.
- [ ] Supprimer le `default:` qui gérait le cas "aucun format reconnu" si plus nécessaire (sinon le
      garder comme filet de sécurité minimal).
- [ ] Nettoyer les conditions du type `['grid', 'root', 'result', 'calendrier', 'pre_filter'].includes(data.type)`
      → devient inutile, tous les nœuds sont dans ce cas maintenant. Simplifier le JSX en
      conséquence (plus besoin de code pour l'affichage `label`/`level`/`options.length` legacy).

---

## Étape 6 — `src/components/NodeEditor.tsx`

C'est le fichier avec le plus de nettoyage :

- [ ] Supprimer la prop `flowFormat` et la variable `isDynamic` (devient toujours vrai).
- [ ] Supprimer tout le bloc `{!isDynamic && (...)}` en bas du fichier (Level, Audio legacy,
      Options menu/filter avec `number`/`label`).
- [ ] Retirer les `{isDynamic && (...)}` devenus inutiles (le contenu reste, juste sans condition).
- [ ] Dans le `<select>` "Type de Nœud" : retirer les `<option>` legacy (`menu`, `filter`,
      `results`, `widget`).
- [ ] Retirer le champ "Label" conditionné à `!isDynamic`.

*(Le bug "changer de type ne régénère pas la structure du nœud" est noté en bonus à la fin —
pas obligatoire ici, mais plus visible une fois le legacy retiré donc à corriger si possible.)*

---

## Étape 7 — `src/components/Toolbar.tsx`

- [ ] Retirer la prop `flowFormat` et les conditions `{flowFormat === 'dynamic' && (...)}` autour
      des boutons Variables / HashMaps / Audios → ces boutons sont toujours affichés.
- [ ] Simplifier le petit badge "DYNAMIC / LEGACY" à côté du logo (le supprimer, ou juste laisser
      "AgroFlux Flow Editor" sans badge).

---

## Étape 8 — `src/components/FlowCanvas.tsx`

- [ ] Dans le `nodeColor` de la `MiniMap` : supprimer les `case` legacy (`menu`, `filter`,
      `results`, `widget`).

---

## Étape 9 — `src/App.tsx`

C'est le fichier central, à traiter en dernier une fois les autres nettoyés :

- [ ] Supprimer le state `flowFormat` (et son usage partout : `extraData`, props passées aux
      enfants, etc.).
- [ ] Supprimer `isFormatSelectorOpen`, `FormatSelector` (import + usage), et `createNewProject`
      dans sa forme actuelle (code mort déjà repéré par `tsc`).
- [ ] `handleNewProject` devient simple : vide `localStorage`, réinitialise `nodes`, `edges`,
      `variables`, `hashmaps`, `history` → **plus besoin de choisir un format**, il n'y en a
      qu'un. (Ça corrige au passage le bug du bouton "Nouveau" qui ne faisait rien.)
- [ ] `addNewNode` : retirer la branche `isDynamic ? ... : ...`, ne garder que le prompt avec les
      types dynamic (`root, grid, pre_filter, result, calendrier`).
- [ ] `updateEdgesFromNodes` : retirer la branche `if (flowFormat === 'legacy') {...} else {...}`,
      garder uniquement la logique dynamic (options de `root`, sinon `data.next`).
- [ ] `handleValidate` / `handleSave` : retirer le `extraData` conditionnel au format, toujours
      construire l'objet dynamic complet (`variables`, `hashmaps`, `audioMappings`, `config`,
      `dynamic_audio`, `entry`).
- [ ] `handleLoad` : retirer la détection `isDynamic = json.variables || json.entry || ...` →
      on charge toujours comme un flow dynamic.
- [ ] Import initial : `import initialFlow from '../flow.json'` pointera vers le nouveau
      `flow.json` dynamic (Étape 1).

---

## Étape 10 — Supprimer les fichiers devenus inutiles

- [ ] Supprimer `src/components/FormatSelector.tsx` (plus référencé nulle part après l'étape 9).

---

## Étape 11 — Vérifications finales

- [ ] `npm run lint` → ne doit plus avoir d'erreur liée au code legacy supprimé.
- [ ] `npx tsc -b --noEmit` → doit passer sans erreur (fini le code mort `FormatSelector` etc.).
- [ ] Test manuel dans le navigateur (`npm run dev`) :
  - [ ] L'app se charge avec le flow par défaut (nouveau `flow.json` dynamic).
  - [ ] Bouton "Nouveau" vide bien le canvas (sans popup de choix de format).
  - [ ] Ajouter un nœud de chaque type (`root, grid, pre_filter, result, calendrier`) fonctionne.
  - [ ] Éditer un nœud dans le panneau de droite fonctionne pour chaque type.
  - [ ] Gestion Variables / HashMaps / Audios s'ouvre et fonctionne.
  - [ ] "Valider" affiche bien le rapport (erreurs/avertissements/inventaire).
  - [ ] "Enregistrer" télécharge un JSON dynamic valide, "Importer" recharge ce même fichier
        correctement.

---

## Bonus (optionnel, à faire seulement si le temps le permet — pas bloquant)

Ces points viennent de l'audit précédent. Ils ne font pas partie de la suppression du format
legacy, mais deviennent plus visibles/faciles à corriger une fois le nettoyage ci-dessus fait :

- [ ] Corriger le `setState` synchrone dans le `useEffect` de `NodeEditor.tsx` (ligne ~90).
- [ ] Quand on change le `type` d'un nœud dans `NodeEditor`, régénérer sa structure via
      `nodeFactory` au lieu de juste changer `data.type`.
- [ ] Ajouter un petit sélecteur "Nœud d'entrée (entry)" et un mini-formulaire pour `config`
      (auto_play_prompt, auto_play_option, pause_between_ms) — un seul petit panneau suffit,
      pas besoin d'un manager séparé comme Variables/HashMaps.
- [ ] Remplacer les `any` les plus critiques par des types simples (`FlowNodeData`, etc.) si ça
      n'alourdit pas le code.
- [ ] Ajouter dans le validator : détection des nœuds `grid`/`calendrier`/`pre_filter` sans
      `next` (cul-de-sac), et vérification que `pre_filter.filtre_source` référence un hashmap
      existant.

---

## Point d'attention

Après ce nettoyage, les anciennes sessions sauvegardées dans le `localStorage` du navigateur
(qui contiennent potentiellement des nœuds au format legacy) ne seront plus compatibles avec
l'éditeur. Il faudra vider le `localStorage` (`agroflux_flow_session`) après la mise à jour, ou
simplement cliquer sur "Nouveau" une fois le nettoyage terminé.
