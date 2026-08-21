# 2. Moteur de navigation et de lecture audio

Cette page décrit l'algorithme que l'app Flutter doit reproduire pour faire
progresser l'utilisateur dans le flow et lire l'audio dans le bon ordre.
Implémentation de référence (TypeScript, à réimplémenter à l'identique en
Dart) : `src/utils/simulationEngine.ts`, `src/utils/simulationResources.ts`,
`src/hooks/useSequentialAudioPlayer.ts`.

## 2.1. Contexte de navigation

L'app maintient, pour la session de navigation en cours, un **contexte** :

```ts
{
  values: Record<string, string>,  // paramètre API -> valeur choisie, ex. { produit: "mais", departement: "atlantique" }
  history: { nodeId: string, paramName?: string, value?: string }[]
}
```

- `values` s'enrichit à chaque nœud `grid`/`pre_filter`/`calendrier` franchi
  (via son champ `set`, voir §1.3) — jamais à un nœud `root` (qui ne collecte
  rien) ni `result` (terminal).
- `history` permet un retour en arrière : revenir à l'étape `i` reconstruit
  `values` en **rejouant l'historique tronqué** à `i`, plutôt qu'en dépilant un
  historique de snapshots — plus simple, et évite les incohérences si l'état
  a été modifié entre-temps.
- Le contexte est réinitialisé à chaque nouvelle session de navigation (retour
  au menu principal = nouveau contexte vide).

## 2.2. Résolution des options par type de nœud

À l'affichage d'un nœud, l'app doit déterminer quoi présenter à l'utilisateur :

| Type de nœud | Options affichées |
|---|---|
| `root` | `node.options.map(o => o.id)` tel quel — aucune variable impliquée. |
| `grid` | `flow.variables[node.options_source]`, filtré par l'état actif si `node.controle_active === true` (voir §1.5), avec l'option "Tout" ajoutée en tête si `node.can_choix_all === true`. |
| `pre_filter` | `flow.hashmaps[node.filtre_source][context.values[node.cle]]`, avec les mêmes règles de filtrage actif/`can_choix_all` que `grid`. **Si `context.values[node.cle]` est `undefined`** (le paramètre n'a jamais été collecté), c'est une erreur de conception du flow à remonter — ce nœud ne devrait pas être atteignable dans cet état. **Si la clé résout vers une liste vide** (trou de données), afficher un message "aucune option disponible" plutôt qu'un écran vide silencieux. |
| `calendrier` | Un sélecteur de date, borné par la fenêtre calculée en §2.3. |
| `result` | Aucune option — déclenche l'appel API (§2.5) puis la lecture de la réponse (§2.4). |

### Filtrage par état actif (rappel précis)

Pour une valeur de variable `v` de la variable `nom` :
`active(v) ⟺ v n'est PAS listée dans active_overrides.variables[nom]`.

Pour une valeur `v` sous la clé `k` du hashmap `nom` :
`active(v) ⟺ k n'est PAS dans active_overrides.hashmaps[nom].inactive_keys`
`           ET v n'est PAS dans active_overrides.hashmaps[nom].inactive_values[k]`.

## 2.3. Fenêtre de dates d'un nœud `calendrier`

```
periode = max(1, node.periode)
today = date du jour sur l'appareil

si node.cadran == "passé":
    fenêtre = [today - (periode - 1) jours, today]
sinon si node.cadran == "future":
    fenêtre = [today, today + (periode - 1) jours]
sinon ("centrer"):
    before = floor((periode - 1) / 2)
    after  = periode - 1 - before
    fenêtre = [today - before jours, today + after jours]
```

La valeur choisie par l'utilisateur (`YYYY-MM-DD`) doit être dans cette
fenêtre (bornes incluses) ; elle est stockée dans `context.values[node.set]`.

## 2.4. Lecture audio

Il y a **deux mécanismes de lecture distincts, à ne pas confondre** — voir
aussi [`06_pieges_et_glossaire.md`](./06_pieges_et_glossaire.md) sur ce piège.

### A. Séquence d'introduction d'un nœud (`node.audio`)

Jouée à l'entrée de **n'importe quel** nœud (`root`, `grid`, `pre_filter`,
`calendrier`, `result`) — c'est la question/prompt narré à l'utilisateur.
Démarrage automatique si `config.audio.auto_play_prompt === true`.

```
pour chaque item de node.audio.sequence, DANS L'ORDRE :
    chemin = préfixer_langue(item)                      // voir §3.3
    si le fichier existe sur l'appareil : le jouer entièrement avant l'item suivant
    sinon si node.audio.fallback existe (préfixé langue) : jouer le fallback à la place
    sinon : passer au suivant silencieusement (ne jamais bloquer la navigation)
# Aucune pause entre les items de cette séquence.
```

### B. Séquence de réponse backend (`audio_sequence`, nœud `result` uniquement)

Une fois la réponse de l'API reçue (voir §2.5) et son enveloppe
`{"type":"audio_sequence", "sequence":[...]}` reconnue (voir
[`04_contrat_api_backend.md`](./04_contrat_api_backend.md) §4) :

```
pause_ms = reponse.meta?.pause_ms ?? flow.config.audio.pause_between_ms ?? 500

pour chaque bloc de sequence, DANS L'ORDRE :
    si bloc.image n'est pas null : afficher l'image (chemin complet, jamais préfixé — voir §3.3)
    sinon : masquer/effacer l'image précédente
    jouer bloc.audios[] bout à bout, dans l'ordre, chaque chemin préfixé_langue avant lecture
    ATTENDRE pause_ms avant de passer au bloc suivant
```

Les deux mécanismes ne se recouvrent pas dans le temps : sur un nœud
`result`, `node.audio` (l'intro, ex. "Voici les résultats…") se joue en
premier, puis l'appel API a lieu, puis la séquence de réponse (B) se joue.

### Lecteur audio séquentiel — comportement d'implémentation

- Un seul flux de lecture actif à la fois : démarrer une nouvelle lecture
  (nouvelle séquence, nouveau bloc) interrompt toujours la précédente.
- Un item de séquence introuvable sur l'appareil ne doit **jamais** faire
  planter ou geler la lecture — passer au suivant (ou au fallback pour le
  mécanisme A).

## 2.5. Construction et envoi de la requête API (nœud `result`)

```
method  = node.data_source.method ?? "POST"
url     = base_url + "/" + node.data_source.endpoint
headers = { "Content-Type": "application/json", "Authorization": "Bearer <token>" }
body    = { param: context.values[param] pour chaque param de node.data_source.params }
```

- Si un paramètre de `data_source.params` est absent de `context.values`
  (chemin de navigation incomplet — ne devrait pas arriver avec un flow
  valide, mais l'app doit s'en prémunir), échouer proprement (message d'erreur
  générique) plutôt qu'envoyer une requête incomplète.
- Détail complet du contrat de requête/réponse par route :
  [`04_contrat_api_backend.md`](./04_contrat_api_backend.md).

## 2.6. Ce que l'app NE calcule PAS elle-même

Toute la logique métier (tri des marchés par prix, filtrage des dates avec
prix inchangé, calcul de tendance, génération du conseil final) est calculée
côté **backend** et livrée déjà sous forme de séquence audio/image prête à
jouer. La seule exception documentée est le calendrier d'animation d'un
marché (`info_type = "calendrier_animation"`), où le backend renvoie une
**règle brute** que l'app doit interpréter elle-même pour surligner les jours
animés dans un sélecteur de date — voir
[`04_contrat_api_backend.md`](./04_contrat_api_backend.md) §6.5 pour
l'algorithme exact (à réimplémenter à l'identique du service backend, sous
peine de divergence entre ce que l'app affiche et ce que le backend considère
réellement comme un jour animé).
