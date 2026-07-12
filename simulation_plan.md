# Plan — Simulateur de Flow

Ce document fixe l'approche retenue pour le module "Simulateur" : rejouer un
flow AgroFlux au complet dans le navigateur, exactement comme le ferait
l'app mobile Flutter — navigation nœud par nœud, vrais appels API quand la
route existe (repli simulé sinon), lecture des vraies ressources audio/image
depuis le dossier du Studio. Décisions actées ci-dessous (validées avec
l'utilisateur), puis architecture, puis phases de mise en œuvre.

## 1. Objectif et périmètre

**Objectif :** un onglet/panneau où on choisit un flow.json déjà chargé dans
le Studio, on renseigne l'URL de base du backend + un Bearer Token
(optionnel) + le dossier de ressources (déjà connecté au Studio), puis on
navigue le flow comme un utilisateur final : root → grid/calendrier/
pre_filter (en cascade) → result, avec lecture audio et affichage image à
chaque étape, jusqu'à obtenir (ou simuler) la réponse finale.

**Bénéfice collatéral important :** en calculant à chaque nœud `result` les
paramètres réellement collectés le long du chemin parcouru et en les
comparant à `data_source.params`, le simulateur détecte automatiquement les
chaînes de collecte cassées (ex. le bug "departement jamais demandé" trouvé
et corrigé manuellement dans flow.json lors de la dernière session) — sans
cet outil, ce genre de bug n'est visible qu'à la relecture manuelle.

**Hors périmètre (volontairement) :**
- Pas de mode "test automatique" qui parcourt tous les chemins tout seul —
  c'est un testeur humain qui clique, comme le ferait l'app.
- Pas de synthèse vocale ni de lecture de dates calendaires (aucun fichier
  audio préenregistré n'existe pour une date arbitraire) — le calendrier
  s'affiche comme un simple sélecteur de date, sans son.
- Pas de persistance des sessions de simulation (pas d'historique multi-
  session à conserver) — uniquement l'essentiel : config (URL/token/langue)
  persistée, déroulé de navigation en mémoire le temps de la session.
- Ne modifie jamais flow.json ni les ressources sur disque (lecture seule).

## 2. Décisions actées

1. ~~Paramètre des nœuds `calendrier`/`pre_filter`~~ — **devenu sans objet** :
   `CalendrierNodeData` et `PreFilterNodeData` ont désormais un champ `set`
   natif dans le schéma (au même titre que `GridNodeData`), corrigé
   directement dans `types/flow.ts`/`flow.json` avant de démarrer ce plan.
   Le simulateur lit `node.set` partout, aucune table de correspondance
   externe n'est nécessaire.
2. **Nœuds `result` sans route backend développée** (cas quasi général
   aujourd'hui, chaque route étant marquée `⚠️ ROUTE BACKEND À DÉVELOPPER`
   dans flow.json) : le simulateur **tente le vrai appel HTTP**, et si
   celui-ci échoue (erreur réseau, timeout, 4xx/5xx), **bascule
   automatiquement** sur une réponse simulée construite depuis
   `json_response_contrat` ou `response_examples`, avec les `{placeholders}`
   remplacés par les valeurs réellement collectées pendant la navigation.
3. **Dossier de ressources** : réutilise le dossier déjà connecté au Studio
   (`RESOURCES_DIRECTORY_KEY`, même `FileSystemDirectoryHandle` que l'onglet
   Ressources/Build/Publication) — un seul dossier à connecter pour tout le
   Studio, cohérent avec l'existant.
4. **Emplacement UI** : panneau séparé, ouvert depuis un nouveau bouton de la
   Toolbar principale (pas un onglet de plus dans `StudioPanel`) — plein
   écran, pour avoir la place d'afficher confortablement la question en
   cours, les options, l'image et le journal des appels API.

## 3. Modèle de simulation

### 3.1 Contexte de navigation

Un objet simple, tenu en mémoire pendant la session de simulation :

```ts
interface SimulationContext {
  values: Record<string, string>; // paramName -> valeur choisie (ex. { departements: "oueme", marche: "bohicon" })
  history: { nodeId: string; paramName?: string; value?: string }[]; // trace complète, pour debug + retour arrière
}
```

`values` est ce qui sera envoyé comme body JSON au nœud `result` terminal.
`history` sert à l'affichage du chemin parcouru et à un bouton "revenir en
arrière" (retirer la dernière étape, recalculer `values`).

### 3.2 Résolution des options par type de nœud

Reprend exactement la sémantique déjà documentée (commentaires flow.json,
`ActiveControlledNodeData`, `resourceInventory.ts`) — le simulateur ne fait
qu'exécuter ce qui est déjà écrit, il n'invente aucune règle nouvelle :

| Type | Options affichées | Stockage au choix | Nœud suivant |
|---|---|---|---|
| `root` | `node.options[].id` (texte + audio best-effort `questions/{id}.mp3`) | rien (juste la navigation) | `option.next` |
| `grid` | `variables[node.options_source]`, filtré si `controle_active` (retire les valeurs de `active_overrides.variables[options_source]`), `+ "Tout"` synthétique si `can_choix_all` | `context.values[node.set] = valeur` | `node.next` |
| `calendrier` | sélecteur de date (fenêtre `periode` jours, orientation `cadran`: centrer/passé/future) | `context.values[node.set] = "YYYY-MM-DD"` | `node.next` |
| `pre_filter` | `hashmaps[node.filtre_source][context.values[node.cle]]` (liste filtrée par la clé déjà collectée) — **liste vide affichée comme avertissement visible** (signale un trou de données, ex. département sans marché dans le hashmap) | `context.values[node.set] = valeur` | `node.next` |
| `result` | — (terminal) | — | déclenche l'appel API (§5) |

Si `context.values[node.cle]` est absent au moment d'un `pre_filter` (la
valeur attendue n'a jamais été collectée en amont), le simulateur l'affiche
comme une erreur bloquante explicite plutôt que de planter — c'est
exactement le genre de bug de chaînage que l'outil doit faire remonter.

## 4. Résolution des ressources audio/image

Au moment de connecter le dossier (`useDirectoryHandle(RESOURCES_DIRECTORY_KEY, 'read')`,
identique à `AssetRepositoryTab`), le simulateur construit un index
`chemin relatif → FileSystemFileHandle` via `walkDirectory` (déjà dans
`fsAccess.ts`, aucune nouvelle fonction disque nécessaire).

Résolution d'un chemin attendu :

- **Variable** (root option, grid, `x_anime_x`, etc.) : chemin canonique via
  la même formule que `resourceInventory.ts` —
  `audio/{langue}/{mapping[nom]||nom}/{valeur}.{audioFormat}` et
  `images/{mapping[nom]||nom}/{valeur}.{imageFormat}`. Recherche directe
  dans l'index.
- **HashMap non exclu** (absent de `hashmaps_no_resources`) : même formule
  avec le segment clé en plus —
  `audio/{langue}/{mapping[nom]||nom}/{cle}/{valeur}.{audioFormat}`.
- **HashMap exclu** (listé dans `hashmaps_no_resources`, ex.
  `marches_par_departement`) : par construction, **aucun chemin canonique
  n'existe** (c'est le principe même de cette fonctionnalité — ces
  ressources sont censées déjà exister sous une variable). Le simulateur
  fait une **recherche par nom de fichier** dans l'index entier
  (`{valeur}.{format}`, tous dossiers confondus sous `audio/{langue}/**` et
  `images/**`) et prend le premier résultat trouvé. Si aucun n'est trouvé,
  affiche clairement "ressource introuvable pour {valeur}" plutôt que de
  deviner un chemin qui n'existe pas.

Chaque option affichée dans l'UI montre une icône ✓/✗ selon que sa ressource
audio a été résolue — utile pour repérer d'un coup d'œil les trous du dépôt
de ressources pendant un test.

## 5. Nœud `result` : appel API et repli simulé

### 5.1 Construction de la requête

- URL = `${baseUrl.replace(/\/$/, '')}/${data_source.endpoint.replace(/^\//, '')}`.
- Méthode = `data_source.method || DEFAULT_HTTP_METHOD`.
- Corps = `JSON.stringify(pick(context.values, data_source.params))` — **tous
  les paramètres partent en JSON body, quelle que soit la méthode**, c'est
  la convention déjà actée dans `types/flow.ts` (`DataSource`) et le
  simulateur la respecte à la lettre plutôt que d'inventer une convention
  différente pour GET.
- En-têtes : `Content-Type: application/json`, et
  `Authorization: Bearer {token}` si un token est renseigné.
- Si un paramètre listé dans `data_source.params` est absent de
  `context.values` (chaîne de collecte cassée), il est signalé avant même
  l'envoi ("paramètre manquant : X — jamais collecté sur ce chemin") ; la
  requête part quand même, avec ce paramètre omis, pour voir le
  comportement réel du backend le cas échéant.

### 5.2 Repli simulé

Si le `fetch` échoue (erreur réseau) ou renvoie un statut hors 2xx :

- Si `response_examples` contient plusieurs entrées, le testeur choisit
  celle à utiliser dans un menu déroulant (pas de correspondance
  automatique par contenu — trop fragile pour peu de valeur ajoutée) ;
  sinon `json_response_contrat` est utilisé par défaut.
- Substitution des `{param}` présents dans le JSON choisi par
  `context.values[param]` (regex simple `/\{(\w+)\}/g`) ; un paramètre sans
  valeur connue reste affiché tel quel (`{param}`) avec un avertissement.
- Un bandeau clair indique "⚠️ Réponse simulée (route backend indisponible)"
  pour qu'il n'y ait jamais d'ambiguïté entre une vraie réponse et une
  réponse de repli.

### 5.3 Affichage / lecture de la réponse

- Si le JSON obtenu (réel ou simulé) a la forme `{ type: "audio_sequence",
  sequence: [{ audios: string[], image: string|null }], meta?: { pause_ms }
  }` (convention déjà en place sur les 6 nœuds `result` actuels), le
  simulateur **joue réellement la séquence** : pour chaque bloc, résout et
  joue chaque fichier audio (§4) l'un après l'autre, affiche l'image
  associée, respecte la pause entre blocs (`meta.pause_ms` ou
  `config.audio.pause_between_ms` du flow à défaut).
- Sinon (forme inconnue), le JSON brut est simplement affiché formaté —
  pas de tentative de lecture, pour rester simple.

## 6. Interface

Nouveau composant `SimulatorPanel.tsx`, ouvert par un bouton dédié dans
`Toolbar.tsx` (à côté de "Studio"), plein écran (`fixed inset-0`, pas une
modale centrée comme `StudioPanel`) :

- **Bandeau de config** (repliable une fois rempli) : URL de base, Bearer
  Token, statut du dossier de ressources (bouton "Connecter" si absent,
  identique au pattern `AssetRepositoryTab`), sélecteur de langue (parmi
  `flowData.languages`).
- **Zone centrale** : nœud courant — question (texte + bouton lecture audio
  si résolu), liste d'options cliquables (grid/pre_filter) ou sélecteur de
  date (calendrier), avec indicateur ✓/✗ ressource par option.
- **Colonne latérale** : fil d'Ariane du chemin parcouru (cliquable pour
  revenir en arrière), contexte collecté (`context.values` en direct, utile
  pour debug), et une fois un `result` atteint : journal de la requête
  envoyée + réponse (réelle ou simulée) + lecteur de la séquence audio.
- Bouton "Recommencer" (reset context + retour à `flowData.entry`).

## 7. Nouveaux fichiers / fichiers modifiés

**Nouveaux :**
- `src/utils/simulationEngine.ts` — logique pure : résolution des options
  par type de nœud, construction de la requête, repli simulé, détection/
  lecture de l'enveloppe `audio_sequence`. Aucune dépendance React, donc
  testable comme le reste de `src/utils/*.ts`.
- `src/utils/simulationEngine.test.ts`
- `src/utils/simulatorConfig.ts` — persistance localStorage (baseUrl, token,
  langue choisie).
- `src/utils/simulatorConfig.test.ts`
- `src/components/SimulatorPanel.tsx` — panneau principal.
- Éventuellement `src/components/simulator/` si `SimulatorPanel.tsx` devient
  trop volumineux une fois codé (à trancher en implémentant, pas à
  planifier à l'avance — pas de découpage prématuré).

**Modifiés :**
- `src/components/Toolbar.tsx` — nouveau bouton + prop `onOpenSimulator`.
- `src/App.tsx` — état `isSimulatorOpen` + rendu de `<SimulatorPanel
  getCurrentFlow={...} onClose={...} />`, même pattern que `StudioPanel`.

**Non modifiés :** `flow.json`, `types/flow.ts` (le champ `set` sur
`calendrier`/`pre_filter` est déjà en place, corrigé en amont de ce plan —
voir §2.1), `validator.ts`, `resourceInventory.ts`, `backendContract.ts` (le
simulateur les réutilise en lecture, ne les étend pas).

## 8. Tests

- `simulationEngine.test.ts` : résolution d'options pour chaque type de
  nœud (grid avec/sans `controle_active`/`can_choix_all`, pre_filter avec
  clé présente/absente/vide, calendrier), construction de la requête
  (params présents/manquants, méthode par défaut), repli simulé (contrat
  simple, plusieurs `response_examples`, substitution de placeholders,
  placeholder sans valeur connue), détection de l'enveloppe
  `audio_sequence`.
- `simulatorConfig.test.ts` : lecture/écriture localStorage, valeurs par
  défaut.
- Pas de test automatisé pour `SimulatorPanel.tsx` (composant d'orchestration
  UI, faible logique propre) — vérification manuelle via navigateur (CDP ou
  manuel) sur le flow.json réel, en particulier le chemin
  `infos_marche_departement → explorer_produit_marche_filter →
  infos_marche_infos_type → infos_marche_result` (le seul chemin qui
  traverse un `pre_filter`, donc le plus révélateur).

## 9. Phases de mise en œuvre

1. **`simulationEngine.ts` + tests** — toute la logique pure (résolution
   d'options, contexte, requête, repli simulé, détection audio_sequence),
   sans aucune UI. Vérifiable en isolation.
2. **`simulatorConfig.ts` + tests** — persistance config (baseUrl, token, langue).
3. **Résolution de ressources** — intégration de `walkDirectory` +
   recherche canonique/best-effort (§4), toujours dans `simulationEngine.ts`
   ou un module voisin dédié aux ressources.
4. **`SimulatorPanel.tsx`** — assemblage UI : navigation pas à pas, affichage
   des options avec statut ressource, sélecteur de date, config repliable.
5. **Lecture audio réelle + affichage image** dans le panneau (lecteur HTML
   `<audio>` séquencé, image affichée en parallèle).
6. **Appel API réel + bandeau repli simulé + journal de requête/réponse.**
7. **Câblage `Toolbar`/`App.tsx`** + vérification bout en bout sur le
   flow.json actuel, chemin par chemin pour les 6 branches.
8. **Documentation** : section dédiée dans `public/documentation.html`
   (même endroit que les autres modules du Studio).

Chaque phase est livrable et vérifiable seule (tests unitaires pour 1-3,
vérification visuelle/manuelle pour 4-7) — pas de dépendance à un
"tout ou rien" final.
