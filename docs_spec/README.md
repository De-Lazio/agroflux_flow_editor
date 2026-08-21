# Spécification technique — Application Mobile AgroFlux (navigation audio en langues locales)

Ce dossier est la spécification transmise à l'équipe Flutter chargée de développer
l'application mobile grand public d'AgroFlux Bénin — celle qui permet à un
producteur/revendeur agricole de naviguer entièrement à la voix, en fon, yoruba,
dendi ou adja, pour consulter des informations de marché.

**Source de vérité.** Cette spec décrit le contrat tel qu'il existe aujourd'hui,
généré à partir de l'état réel du dépôt `flow_editor` (Flow Editor / Studio) au
2026-08-19. Le comportement exact reste défini par le code de référence cité dans
chaque document (`src/utils/...`) et par le contenu réel de `flow.json` — si ce
document et le code divergent un jour, c'est le code qui a raison, et cette spec
doit être mise à jour en conséquence.

## Comment lire cette spec

| Document | Contenu |
|---|---|
| [`01_flow_json_reference.md`](./01_flow_json_reference.md) | Structure complète du fichier `flow.json` : champs racine, les 5 types de nœuds, leurs champs, exemples réels. |
| [`02_navigation_et_lecture_audio.md`](./02_navigation_et_lecture_audio.md) | Comment interpréter le flow à l'exécution : résolution des options par type de nœud, état actif/inactif, construction de la requête API, algorithme de lecture audio (séquences de nœud et séquences de réponse backend). |
| [`03_ressources_et_chemins.md`](./03_ressources_et_chemins.md) | Organisation du dossier de ressources (audio/image), formules de chemin, langues, cas particuliers. |
| [`04_contrat_api_backend.md`](./04_contrat_api_backend.md) | Les 6 routes backend actuelles : requête, réponse, enveloppe `audio_sequence`, gestion d'erreur. |
| [`05_versioning_et_livraison.md`](./05_versioning_et_livraison.md) | Comment une nouvelle version du flow et des ressources est produite, versionnée (hash) et livrée à l'app mobile ; stratégie de mise à jour recommandée. |
| [`06_pieges_et_glossaire.md`](./06_pieges_et_glossaire.md) | Champs legacy à ignorer, zones non finalisées, glossaire des termes du domaine. |
| [`07_placement_fichiers_flutter.md`](./07_placement_fichiers_flutter.md) | Où placer, concrètement, chaque fichier/dossier d'une Publication dans le projet Flutter (stockage applicatif vs assets bundlés vs hors du projet). |

Ordre de lecture recommandé pour une première prise en main : 01 → 02 → 03 → 04,
puis 05, 06 et 07 en référence continue pendant le développement.

## Ce que l'app mobile doit et ne doit pas faire

- **Doit** : interpréter `flow.json` pour construire l'UI de navigation à la volée
  (aucun écran n'est codé en dur), résoudre et jouer les fichiers audio dans
  l'ordre attendu, appeler les 6 routes backend avec les bons paramètres, afficher
  la réponse `audio_sequence` bloc par bloc.
- **Ne doit pas** : dupliquer de logique métier (calcul de calendrier d'animation
  excepté — voir §6.5 de [`04_contrat_api_backend.md`](./04_contrat_api_backend.md),
  volontairement calculé côté client), générer de l'audio, décider elle-même
  quelles valeurs de variable/hashmap sont actives (elle applique l'état déjà
  décidé dans `active_overrides`, elle ne le décide pas).

## Où trouver l'implémentation de référence

Un outil de simulation (le "Simulateur", accessible dans le Studio du Flow
Editor) implémente déjà toute cette logique en TypeScript et permet de tester une
route/un parcours avant même que l'app mobile existe. En cas de doute sur un
comportement, ce code (`src/utils/simulationEngine.ts`,
`src/utils/simulationResources.ts`, `src/hooks/useSequentialAudioPlayer.ts`) fait
foi — cette spec en est la traduction en langage Dart/mobile, pas une source
indépendante.
