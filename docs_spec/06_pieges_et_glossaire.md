# 6. Pièges connus et glossaire

## 6.1. Champs et comportements à ignorer/traiter avec prudence

Ces points ont été identifiés en croisant `flow.json` réel et le code de
référence du Studio — à connaître pour ne pas construire l'app mobile contre
un comportement qui n'est en réalité pas actif.

### `audio_prompt` (champ de nœud) — legacy, hors schéma, à ignorer

Certains nœuds de `flow.json` portent un champ `audio_prompt` (ex.
`"audio_prompt": "questions/achete_produit.mp3"`). **Ce champ n'existe pas
dans le schéma officiel** (`src/types/flow.ts`) et n'est ni validé, ni inclus
dans l'inventaire de ressources généré par le Studio (`resource_inventory.json`).
C'est un reliquat d'un format antérieur, conservé tel quel dans le JSON par
simplicité (spread) mais non exploité par le moteur de résolution de
ressources canonique. **N'utilisez que `node.audio` (voir
[`01_flow_json_reference.md`](./01_flow_json_reference.md) §1.4) pour l'audio
d'introduction d'un nœud.**

### `audio_sequence` (champ de nœud `result`) — legacy, sans rapport avec l'enveloppe de réponse

Certains nœuds `result` de `flow.json` portent un champ `"audio_sequence": []`
(toujours vide en pratique). **Ce n'est pas lié à l'enveloppe de réponse**
`{"type": "audio_sequence", "sequence": [...]}` renvoyée par le backend (voir
[`04_contrat_api_backend.md`](./04_contrat_api_backend.md) §4.2) — même nom,
concept totalement différent. Ce champ de nœud est un reliquat, à ignorer.

### `{param}` / `{param:defaut}` dans `node.audio.sequence` — syntaxe documentée mais non résolue par l'outillage actuel

Le schéma type prévoit qu'un élément de `node.audio.sequence` puisse être un
placeholder (`{produit}` pour jouer l'audio du produit choisi,
`{prix:1000}` avec une valeur de repli). **Aucun flow réel n'utilise
aujourd'hui cette syntaxe dans `node.audio.sequence`**, et aucune
implémentation de référence (Simulateur inclus) ne sait actuellement la
résoudre à ce niveau — elle n'existe, résolue, que dans les
`json_response_contrat`/`response_examples` (aperçu Studio uniquement, jamais
la vraie réponse backend). **Traiter cette syntaxe défensivement côté
mobile** : si un item de `node.audio.sequence` contient une accolade `{`,
l'ignorer/logger plutôt que tenter de le résoudre comme un chemin littéral —
en pratique, sur le flow de production actuel, ce cas ne se présente pas.

### Option "Tout" (`can_choix_all`) — valeur conventionnelle non actée côté backend

Quand `can_choix_all: true` sur un nœud `grid`/`pre_filter`, l'option ajoutée
en tête de liste porte la valeur `"tout"`. **Cette convention n'est
actuellement utilisée par aucun nœud du flow de production** et n'a pas
encore de contrepartie actée côté backend (comment un endpoint doit
interpréter `"tout"` reçu comme valeur d'un paramètre). Le champ
`departements_et_tout` (utilisé par les branches 3 et 4, voir
[`04_contrat_api_backend.md`](./04_contrat_api_backend.md) §4.4.3) résout
cette même idée autrement : `"tout_les_departements"` est une valeur de
variable normale, pas un `can_choix_all`. À clarifier avec le porteur de
projet avant qu'un nœud utilisant réellement `can_choix_all` n'entre en
production.

### Option d'un nœud `root` — pas d'image, audio best-effort seulement

Voir [`03_ressources_et_chemins.md`](./03_ressources_et_chemins.md) §3.5 —
ne pas construire d'UI qui suppose la présence garantie d'une image pour une
option de menu principal.

## 6.2. Glossaire

| Terme | Définition |
|---|---|
| **Flow** | Le graphe de navigation complet décrit par `flow.json`. |
| **Nœud** | Une entrée de `flow.nodes` — un écran/étape de navigation, typé (`root`, `grid`, `pre_filter`, `calendrier`, `result`). |
| **Variable** | Une liste de valeurs nommée et réutilisable (`flow.variables`), source des options d'un nœud `grid`. |
| **HashMap** | Une table clé → liste de valeurs (`flow.hashmaps`), source des options d'un nœud `pre_filter`, filtrée par une valeur déjà collectée. |
| **Contexte de navigation** | L'état accumulé (`values`, `history`) pendant qu'un utilisateur progresse dans le flow — voir [`02_navigation_et_lecture_audio.md`](./02_navigation_et_lecture_audio.md) §2.1. |
| **`set`** | Le nom de paramètre API sous lequel un nœud `grid`/`pre_filter`/`calendrier` stocke la valeur choisie par l'utilisateur dans le contexte. |
| **Mapping (audio/image)** | Association entre un nom de variable/hashmap et le nom de dossier de ressources correspondant (`flow.audio_mappings`) — souvent identique au nom, mais peut diverger. |
| **Chemin canonique** | Un chemin de ressource calculé par la formule fixe du §3.2 (variable/hashmap + valeur + langue/format) — soit présent tel quel, soit absent, jamais de recherche approximative. |
| **Résolution best-effort** | Recherche d'un fichier par simple nom de fichier (sans chemin canonique connu), utilisée uniquement pour `hashmaps_no_resources` et les options de `root` — voir §3.4/§3.5. |
| **État actif/inactif** (`active_overrides`) | Overlay additif marquant certaines valeurs de variable/hashmap comme désactivées (à ne pas proposer à l'utilisateur), appliqué seulement si le nœud a `controle_active: true` — voir [`01_flow_json_reference.md`](./01_flow_json_reference.md) §1.5. Ce n'est **pas** une suppression : le Studio continue d'afficher tout le contenu, actif ou non. |
| **Enveloppe `audio_sequence`** | Le format de réponse standard des 6 routes backend (`{"type":"audio_sequence","sequence":[...]}`) — à ne pas confondre avec le champ de nœud homonyme legacy (§6.1). |
| **Bloc** (d'une réponse `audio_sequence`) | Un élément de `sequence[]` — une liste d'audios jouée bout à bout, suivie d'une image optionnelle et d'une pause avant le bloc suivant. |
| **Manifeste** (`manifest.json`) | Inventaire fichier par fichier (chemin, hash, taille) du dossier de ressources réellement présent sur disque à un instant donné — voir [`05_versioning_et_livraison.md`](./05_versioning_et_livraison.md) §5.2. |
| **`repository_hash`** | Hash global déterministe de l'ensemble du dépôt de ressources — la valeur à comparer pour détecter une mise à jour disponible, voir §5.3. |
| **Build** | Étape du Studio qui valide le flow, scanne les ressources, réconcilie les deux et écrit 8 fichiers d'artefacts — sert à itérer/vérifier localement. |
| **Publication** | Un Build, plus un dossier `assets/` prêt à distribuer (seulement les fichiers réellement référencés) — c'est ce que l'app mobile télécharge. |
| **Ressource manquante** | Un chemin attendu par le flow (inventaire) mais absent du dossier de ressources scanné. |
| **Ressource orpheline** | Un fichier présent dans le dossier de ressources mais qu'aucun nœud/variable/hashmap du flow n'attend plus — jamais copié dans une Publication. |

## 6.3. En cas de doute

1. Vérifier le comportement réel dans `flow.json` (à la racine du dépôt
   `flow_editor`) — c'est le seul flow réellement en cours de développement de
   contenu aujourd'hui.
2. Vérifier le code de référence cité en tête de chaque document de cette
   spec (`src/utils/simulationEngine.ts`, `simulationResources.ts`,
   `validator.ts`, `resourceInventory.ts`, `assetRepository.ts`,
   `buildProject.ts`).
3. Tester le comportement dans le **Simulateur de Flow** du Studio (bouton
   "🚀 Simulateur") — il permet de rejouer un parcours complet, y compris un
   vrai appel HTTP à une route backend déjà partiellement implémentée, sans
   attendre que l'app mobile existe.
4. Si la spec et le code/simulateur divergent, ouvrir la question avec
   l'équipe Flow Editor plutôt que de trancher unilatéralement côté mobile —
   ce document doit rester la traduction fidèle du comportement réel, pas une
   source indépendante qui peut dériver.
