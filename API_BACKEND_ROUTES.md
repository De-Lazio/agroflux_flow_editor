# Documentation API — Routes backend des 6 branches AgroFlux

Ce document spécifie les 6 routes backend à développer pour le flow actuel
(`flow.json`), à destination de l'équipe backend. **Toutes les zones
d'ambiguïté identifiées lors d'une première passe ont été tranchées avec
le porteur de projet** (voir §7 pour le détail des décisions et leur
justification) — ce document reflète l'état final, prêt à être transmis
tel quel.

Généré à partir de l'état réel de `flow.json` au 2026-07-12 (branche
`feature/simulator`). Si le flow évolue, ce document doit être régénéré/mis
à jour en conséquence — ce n'est pas une source de vérité indépendante du
flow, seulement sa traduction en langage "contrat API".

---

## 1. Vue d'ensemble des 6 branches

| # | Branche (menu racine) | Endpoint | Méthode | Params body |
|---|---|---|---|---|
| 1 | Acheter un produit | `api/app/acheter_produit` | POST | `produit`, `departement` |
| 2 | Vendre un produit | `api/app/vendre_produit` | POST | `produit`, `departement` |
| 3 | Marché animé (date relative) | `api/app/anime_x` | POST | `date`, `departement` |
| 4 | Marché animé (calendrier) | `api/app/anime_calendrier` | POST | `anime_date`, `departement` |
| 5 | Infos sur un marché | `api/app/infos_marches` | POST | `marche`, `info_type` |
| 6 | Explorer un produit | `api/app/explorer_prix` | POST | `marche`, `produit`, `periode` |

Chaque branche correspond à un chemin complet dans `flow.json`, du nœud
`root` jusqu'à un nœud `result`. Le détail branche par branche est en §6.
**Les 6 routes renvoient toutes le même format de réponse standard,
`audio_sequence`** (voir §4 — décision actée en §7, point 10).

---

## 2. Conventions générales de requête

- **Méthode : `POST`.** Tous les paramètres partent en **JSON body**,
  jamais en query string ni interpolés dans l'URL.
- **Authentification : obligatoire.** Chaque requête doit porter un
  `Authorization: Bearer <token>` valide. Le mécanisme exact (JWT
  applicatif signé côté backend, clé API fixe, etc.) reste à préciser avec
  l'équipe backend au moment de l'implémentation — ce document fixe
  seulement l'exigence, pas le mécanisme.
- **Headers** :
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` (obligatoire, voir ci-dessus)
- **Body** : objet JSON plat `{ "param1": "valeur1", "param2": "valeur2" }`
  — une clé par paramètre listé dans `data_source.params` du nœud `result`
  concerné. Toutes les valeurs sont des **chaînes**.
- **Langue : aucun paramètre de langue dans la requête.** Le frontend gère
  entièrement la dimension langue de son côté (voir §3.2) — le backend n'a
  jamais besoin de savoir dans quelle langue l'utilisateur consulte l'app.

---

## 3. Convention des chemins de ressources (audio/image)

Deux régimes de chemins coexistent — ne pas les confondre.

### 3.1. Chemins générés (options de menu / filtre — rappel, hors périmètre backend)

Pour une valeur de variable/hashmap choisie dans un menu (`grid`/
`pre_filter`), le Studio calcule le chemin par une formule fixe :

```
audio/{langue}/{dossier}/{valeur}.{format_audio}      (une entrée par langue)
images/{dossier}/{valeur}.{format_image}              (jamais par langue)
```

`{format_audio}` = `mp3`, `{format_image}` = `jpeg`. Cette convention
concerne les fichiers audio/image des *options de menu* (déjà couverts par
l'Asset Repository du Studio) — rappelée ici uniquement en référence,
**elle ne s'applique pas directement aux réponses des 6 routes** (voir 3.2).

### 3.2. Chemins renvoyés par le backend dans les 6 routes — DÉCIDÉ

**Tous les fichiers audio/image nécessaires (y compris pour des valeurs
dynamiques comme un prix ou une date) sont déjà enregistrés et disponibles
dans le dossier de ressources partagé. Le backend ne génère jamais
d'audio — il se contente de renvoyer, dans le bon ordre, les chemins vers
des fichiers déjà existants.**

**Pour l'audio**, le backend renvoie le chemin **sans le préfixe
`audio/{langue}/`** :

```
Chemin réel du fichier :  audio/{langue}/{dossier}/{valeur}.{format_audio}
Ce que le backend envoie :             {dossier}/{valeur}.{format_audio}
```

Exemples de valeurs `audios[i]` valides envoyées par le backend :
`"produits/mais.mp3"`, `"prix/1000_fcfa.mp3"`, `"date/2026_03_10.mp3"`,
`"phrases/est_a.mp3"`, `"conseils/prix_bas_bonne_opportunite.mp3"`.

**Le frontend (app mobile / Simulateur) préfixe systématiquement avec
`audio/{langue_utilisateur}/` avant de résoudre le fichier réel** — c'est
possible car l'arborescence est identique (mêmes noms de dossier/fichier,
en français) sous chaque langue, seul le contenu audio change.
**Conséquence : le backend n'a jamais besoin de connaître la langue de
l'utilisateur** (voir §2).

**Pour l'image**, le backend renvoie le chemin **complet**, préfixe
`images/` inclus (les images n'ont pas de dimension langue) :
`"images/produits/mais.jpeg"`. Aucun changement par rapport à ce qui était
déjà documenté.

**Convention de nommage pour les valeurs numériques/dates** (déjà en usage
dans le flow, à respecter par le backend puisque ce sont des fichiers déjà
enregistrés sous ces noms) :
- Prix : `prix/{valeur}_fcfa.mp3` (ex. `prix/1000_fcfa.mp3`).
- Date : `date/{YYYY}_{MM}_{DD}.mp3` (ex. `date/2026_03_10.mp3`).

Si un prix ou une date précis n'a pas de fichier correspondant déjà
enregistré, c'est un problème de contenu (fichier manquant à faire
enregistrer), pas un problème de contrat API — à remonter à l'équipe
responsable des ressources audio, pas à contourner par une génération
dynamique côté backend.

> **⚠️ Action de suivi (hors périmètre de ce document, à traiter côté
> code du Studio) :** en documentant ce point, on a détecté que le
> Simulateur de Flow actuel **ne préfixe pas non plus** `audio/{langue}/`
> pour `audio_prompt` et les séquences d'intro des nœuds
> (`node.audio.sequence`/`fallback`) — un chemin comme
> `"questions/achete_produit.mp3"` est aujourd'hui résolu tel quel, sans
> préfixe, alors qu'il devrait suivre la même règle que les réponses
> `result`. C'est un correctif de code à faire dans ce dépôt (pas dans le
> backend), séparé de ce contrat API — à traiter dans un second temps.

---

## 4. Format de réponse standard : `audio_sequence`

**Les 6 routes renvoient toutes ce même format** (décision actée, voir
§7 point 10 — y compris `infos_marches`, qui utilisait auparavant 3
schémas ad hoc différents).

### 4.1. Schéma

```json
{
  "type": "audio_sequence",
  "version": "1.0",
  "sequence": [
    {
      "audios": ["chemin/vers/fichier1.mp3", "chemin/vers/fichier2.mp3"],
      "image": "images/dossier/fichier.jpeg"
    }
  ],
  "data": {},
  "meta": {
    "pause_ms": 600
  }
}
```

- `type` : **doit être exactement `"audio_sequence"`**.
- `sequence` : tableau de blocs, **lus dans l'ordre**, chaque bloc jouant
  ses `audios` bout à bout puis affichant `image` (ou `null`). Nombre de
  blocs dynamique (0 à N) — détail par branche en §6.
- `audios` : chemins littéraux (§3.2, sans préfixe langue), concaténés et
  joués à la suite.
- `image` : chemin littéral complet ou `null`.
- `data` : **champ optionnel additionnel**, présent uniquement quand une
  route a besoin de transmettre une donnée structurée que le frontend doit
  traiter par programme plutôt que simplement écouter/afficher (seul cas
  aujourd'hui : `calendrier_animation`, voir §6.5). Absent ou `{}` sinon.
- `meta.pause_ms` : pause en ms **entre deux blocs**. Optionnel, défaut
  `flow.json: config.audio.pause_between_ms` (`600`) si absent.
- `version` : conservé par cohérence, non exploité par le parseur actuel.

### 4.2. ⚠️ Piège à éviter : les `{placeholders}` ne sont pas un format de réponse

Dans `flow.json`, les champs `json_response_contrat`/`response_examples`
(usage interne Studio) utilisent une syntaxe `{param}`/`{param:defaut}` à
titre d'illustration. **La réponse réelle du backend ne doit jamais
contenir de `{...}` littéral** — chaque valeur doit être résolue. Les
exemples du §6 sont déjà résolus, à prendre comme référence de forme
finale.

---

## 5. Gestion des erreurs

- Statuts HTTP : `400` (params manquants/invalides), `404` (aucune donnée
  pour ces params — ex. marché inexistant), `401`/`403` (authentification
  manquante ou invalide), `500` (erreur serveur).
- Corps d'erreur :
  ```json
  { "error": { "code": "NOT_FOUND", "message": "Aucun marché animé à cette date." } }
  ```
- **Cas "liste vide" ≠ erreur.** "Aucun marché animé ce jour-là" (branches
  3 et 4) est un résultat légitime → `200` avec une `audio_sequence`
  annonçant l'absence de résultat (voir §6.3), jamais un `404`.

---

## 6. Détail par branche

### 6.1. Acheter un produit — `acheter_result`

**Parcours** : `root` → `achete_produit` (choix produit) →
`achete_produit_departement` (choix département) → `acheter_result`.

**Requête**
```
POST api/app/acheter_produit
{ "produit": "mais", "departement": "atlantique" }
```
- `produit` : valeur de la variable `produits` (28 valeurs, liste
  complète dans `flow.json: variables.produits`).
- `departement` : valeur de la variable `departements` (12 valeurs).

**Objectif** : pour ce produit dans ce département, renvoyer les
meilleurs prix constatés sur les marchés du département (comparaison
multi-marchés, triée du moins cher au plus cher), plus un conseil final.

**Réponse** (1 bloc intro + N blocs "marché" chacun suivi de M blocs
"variété" + 1 bloc conseil final — N/M dynamiques, **0 marché possible**) :
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
Cas 0 marché trouvé : prévoir un bloc explicite (§5), fichier à définir/
enregistrer si absent (voir §7 point sur les fichiers "aucun résultat").

---

### 6.2. Vendre un produit — `vendre_result`

**Parcours** : `root` → `vendre_produit` → `vendre_produit_departement` →
`vendre_result`. Symétrique de 6.1 : même requête (`produit`,
`departement`), même schéma de réponse, mais **triée du plus cher au moins
cher** côté vendeur, conseil orienté vente.

```
POST api/app/vendre_produit
{ "produit": "mais", "departement": "atlantique" }
```

---

### 6.3. Marché animé — date relative — `anime_x_result`

**Parcours** : `root` → `marche_anime_x` → `anime_x_departement` →
`anime_x_result`.

**Requête**
```
POST api/app/anime_x
{ "date": "demain", "departement": "atlantique" }
```
- `date` : valeur de `x_anime_x` — 10 valeurs relatives : `aujourdhui`,
  `demain`, `apres_demain`, `dans_trois_jours`, `dans_quatre_jours`,
  `hier`, `avant_hier`, `trois_jours_passe`, `quatre_jours_passe`,
  `cinq_jours_passe` (coquilles d'espace corrigées dans `flow.json`, ces
  10 valeurs sont maintenant toutes au format `snake_case`).
- `departement` : valeur de `departements_et_tout` — **13 valeurs**
  (`tout_les_departements` + les 12 départements réels, liste corrigée
  dans `flow.json`). Le backend **doit gérer `"tout_les_departements"`**
  en agrégeant tous les départements plutôt que comme un nom de
  département.

**Objectif** : le backend convertit la date relative en date calendaire
réelle (par rapport à la date de la requête), puis renvoie la liste des
marchés programmés ce jour-là dans le département (ou tous départements).

**Réponse** (1 bloc intro date + 1 bloc intro département + 1 bloc
"liste" + N blocs marché, N pouvant être 0) :
```json
{
  "type": "audio_sequence",
  "version": "1.0",
  "sequence": [
    { "audios": ["intro/les_marches_actifs_sont.mp3", "time/a_la_date.mp3", "date/2026_03_10.mp3"], "image": "images/calendar/date.jpeg" },
    { "audios": ["location/dans_le_departement.mp3", "localites/atlantique.mp3"], "image": "images/localites/atlantique.jpeg" },
    { "audios": ["intro/liste_des_marches.mp3"], "image": null },
    { "audios": ["marches/bohicon.mp3"], "image": "images/marches/bohicon.jpeg" },
    { "audios": ["marches/porto_novo.mp3"], "image": "images/marches/porto_novo.jpeg" }
  ],
  "meta": { "pause_ms": 600 }
}
```
**Cas 0 marché** : remplacer les blocs "marché" par un bloc explicite,
ex. `{"audios": ["intro/aucun_marche_ce_jour.mp3"], "image": null}` — clé
proposée, fichier à enregistrer s'il n'existe pas déjà (voir §7).

---

### 6.4. Marché animé — calendrier — `anime_calendrier_result`

**Parcours** : `root` → `anime_calendrier_calendrier` (sélecteur de date,
fenêtre de 7 jours centrée sur aujourd'hui) → `anime_calendrier_departement`
→ `anime_calendrier_result`.

**Requête**
```
POST api/app/anime_calendrier
{ "anime_date": "2026-03-10", "departement": "atlantique" }
```
- `anime_date` : date calendaire exacte, `YYYY-MM-DD`.
- `departement` : identique à 6.3.

**Objectif et réponse** : identiques à 6.3 — seule la nature de la date
diffère (calendaire exacte ici, relative en 6.3). **Recommandation
(guidance, pas une obligation)** : les deux routes peuvent partager la
même implémentation interne une fois la date relative convertie en date
calendaire — à évaluer avec le backend pour éviter une duplication de
code, sans que ce soit bloquant pour livrer les deux routes séparément si
plus simple dans un premier temps.

---

### 6.5. Infos sur un marché — `infos_marche_result`

**Parcours** : `root` → `infos_marche_departement` (choix département) →
`explorer_produit_marche_filter` (pre_filter : marchés du département via
le hashmap `marches_par_departement`) → `infos_marche_infos_type` (choix
du type d'info) → `infos_marche_result`.

**Requête**
```
POST api/app/infos_marches
{ "marche": "takon", "info_type": "calendrier_animation" }
```
- `marche` : résolu par le pre_filter — une valeur de
  `marches_par_departement[departement]`.
- `info_type` : une des 5 valeurs de `type_info_marche` : `resume_rapide`,
  `presentation_du_marche`, `produits_disponibles`, `calendrier_animation`,
  `opportunite_marche`.

**Toutes les variantes renvoient `audio_sequence`** (décision actée,
§7 point 10) — donc un seul format à gérer côté app mobile pour cette route
aussi. `resume_rapide`, `presentation_du_marche`, `produits_disponibles`
et `opportunite_marche` suivent le schéma générique du §4.1 sans
particularité (intro + blocs de contenu dynamiques + éventuel bloc de
clôture), exactement comme les 5 autres branches — pas d'exemple
spécifique nécessaire au-delà du schéma général.

**`calendrier_animation` est un cas particulier**, car le calcul du
calendrier se fait **côté frontend, pas côté backend** : le backend
renvoie uniquement la **règle d'animation brute**, calquée sur la
structure réelle de la table backend `jours_animation` :

```sql
id_jour, id_marche, type_regle ENUM('intervalle','hebdomadaire','mensuel'),
valeur JSONB, description VARCHAR(200) NULL, bname_audio VARCHAR(50) NULL,
actif BOOLEAN
```

Réponse `infos_marches` pour `info_type = "calendrier_animation"` :
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
- `sequence` : narration audio immédiate courte (annonce + description),
  jouable telle quelle sans que le frontend ait besoin d'interpréter la
  règle.
- `data` : **la règle brute, transmise quasiment telle quelle depuis la
  table `jours_animation`** (`type_regle`, `valeur`, `description`,
  `bname_audio`) — c'est ce que le frontend utilise pour générer lui-même
  le calendrier (mettre en évidence les jours animés dans un sélecteur de
  date, par exemple), sans round-trip supplémentaire vers le backend.

**Forme exacte de `valeur` selon `type_regle`** (reprise fidèle du service
backend `MarketAnimationService`, à réimplémenter à l'identique côté
frontend pour éviter toute divergence de calcul) :

| `type_regle` | Forme de `valeur` | Règle de correspondance à une date |
|---|---|---|
| `hebdomadaire` | `{ "jours": [2, 5] }` | Animé si le jour de la semaine ISO de la date (1=lundi … 7=dimanche) est dans `jours`. |
| `intervalle` | `{ "interval": 4, "date_reference": "2026-03-01" }` | Animé si `(date - date_reference)` en jours est un multiple de `interval` (peut être négatif, `%` sur la différence absolue). |
| `mensuel` | `{ "jours": [5], "semaine": 2 }` | Animé si le jour de la semaine ISO correspond à `jours` **ET** que `ceil(jour_du_mois / 7) === semaine`. Ex. `jours:[5], semaine:2` = le 2ème vendredi du mois (car les vendredis d'un mois tombent naturellement dans des tranches de 7 jours successives : jours 1-7 = semaine 1, 8-14 = semaine 2, etc., donc "2ème occurrence du vendredi" ⇔ ce calcul). |

Cette table peut être copiée telle quelle dans le contrat transmis à
l'équipe frontend mobile pour qu'elle réimplémente le même calcul (Dart)
que le service PHP `checkHebdomadaire`/`checkIntervalle`/`checkMensuel`
existant côté backend — **le calcul doit produire exactement les mêmes
dates des deux côtés**, sinon le calendrier affiché à l'utilisateur peut
diverger de ce que le backend considère réellement comme un jour animé
(pertinent si d'autres routes, comme `anime_x`/`anime_calendrier`,
s'appuient sur la même table côté backend pour répondre "marché animé ou
non" — cohérence à vérifier par l'équipe backend elle-même entre ces
routes et `jours_animation`).

---

### 6.6. Explorer un produit — `explorer_produit_result`

**Parcours** : `root` → `explorer_produit_produit` (choix produit) →
`explorer_produit_marche` (choix marché, liste curated de 7 marchés
suivis `marches_suivis`, volontairement restreinte) →
`explorer_produit_periode` (choix période) → `explorer_produit_result`.

**Requête**
```
POST api/app/explorer_prix
{ "marche": "takon", "produit": "mais", "periode": "six_derniers_mois" }
```
- `marche` : une des 7 valeurs de `marches_suivis`.
- `produit` : une des 28 valeurs de `produits`.
- `periode` : une des 6 valeurs de `periode`.

**Objectif** (cahier des charges complet dans `flow.json:
explorer_produit_result.comment`) :
1. Récupérer l'historique de prix (toutes variétés), trié par date
   croissante, sur la période demandée.
2. Grouper par date ; à chaque date, liste des variétés avec prix+unité.
3. **Filtrage des dates** : ne garder que la première date et les dates
   où au moins un prix a changé (comparaison avec la date précédente, par
   variété).
4. Calculer une tendance entre deux dates retenues consécutives (hausse/
   baisse/stable), **seuil de variation : 5%** (repris tel quel de
   l'intention du cahier des charges — configurable plus tard si besoin,
   mais fixé à 5% par défaut pour lever l'ambiguïté).
5. Générer un conseil final basé sur la tendance globale.

**Réponse** (1 bloc intro + par date retenue : 1 bloc date [+variation si
pas la 1ère] puis M blocs variété + 1 bloc conseil final) :
```json
{
  "type": "audio_sequence",
  "version": "1.0",
  "sequence": [
    { "audios": ["intro/historique_prix.mp3", "produits/mais.mp3", "intro/dans_marche.mp3", "marches/takon.mp3", "periode/six_derniers_mois.mp3"], "image": "images/intro/historique.jpeg" },
    { "audios": ["date/2026_01_10.mp3"], "image": null },
    { "audios": ["produits/mais_blanc.mp3", "phrases/est_a.mp3", "prix/5000_fcfa.mp3", "unites/bassine_10kg.mp3"], "image": "images/produits/mais_blanc.jpeg" },
    { "audios": ["date/2026_01_20.mp3", "variation/hausse.mp3"], "image": "images/icons/hausse.jpeg" },
    { "audios": ["produits/mais_blanc.mp3", "phrases/est_a.mp3", "prix/6000_fcfa.mp3", "unites/bassine_10kg.mp3"], "image": "images/produits/mais_blanc.jpeg" },
    { "audios": ["conseils/tendance_hausse.mp3", "conseils/attendre_peut_etre.mp3"], "image": "images/icons/trend_up.jpeg" }
  ],
  "meta": { "pause_ms": 600 }
}
```

**Variétés de produit** : les exemples ci-dessus et en 6.1/6.2 utilisent
des variétés fines (`mais_local`, `mais_blanc`, `mais_jaune`). Les fichiers
audio/image correspondants existent déjà côté ressources (confirmé) — le
backend doit connaître et utiliser exactement ces mêmes noms de variété
pour construire ses chemins. `flow.json` ne modélise pour l'instant ces
variétés qu'en stub (`varietes_par_produit: {"mais": ["mais"]}`, etc.) :
recommandé de mettre à jour ce hashmap avec la vraie liste de variétés par
produit pour que le Studio reste une documentation fiable de ce que le
backend doit connaître — action de suivi côté Studio, non bloquante pour
démarrer le développement backend puisque les fichiers existent déjà.

---

## 7. Décisions actées (points anciennement ouverts)

Ces 15 points étaient identifiés comme ambigus ou non tranchés dans une
première passe. Voici l'état final après clarification avec le porteur de
projet — **rien ci-dessous ne reste ouvert pour le backend.**

1. **Chemins littéraux et langue** → RÉSOLU (§3.2) : le backend envoie
   `{dossier}/{valeur}.{format}` sans préfixe langue ; le frontend
   préfixe `audio/{langue}/`.
2. **Format image `.jpeg` vs `.png`** → RÉSOLU : `.jpeg` partout,
   conformément à `flow.json: resource_formats` (source d'autorité). Les
   quelques `.png` dans d'anciens commentaires illustratifs du flow sont
   des reliquats non représentatifs, ignorés.
3. **Coquilles dans `x_anime_x`** → RÉSOLU : corrigé directement dans
   `flow.json` (espaces remplacés par des underscores).
4. **Authentification** → RÉSOLU : obligatoire (§2).
5. **Paramètre de langue absent des requêtes** → RÉSOLU : c'est voulu, la
   langue ne transite jamais côté backend (§2, §3.2).
6. **Contrat d'erreur** → RÉSOLU : voir §5 (statuts HTTP + corps
   `{error:{code,message}}`).
7. **`departements_et_tout` incomplet** → RÉSOLU : corrigé dans
   `flow.json`, contient maintenant les 12 départements réels +
   `tout_les_departements` (coquille `"colline"` → `"collines"` corrigée
   au passage).
8. **Fichiers audio pour les cas "0 résultat"** → clé de fichier
   proposée en §6.3 (`intro/aucun_marche_ce_jour.mp3`) ; à vérifier si le
   fichier existe déjà dans les ressources, sinon à faire enregistrer —
   action de suivi côté contenu, ne bloque pas le développement backend
   (le contrat de réponse, lui, est défini : §5).
9. **Partage d'implémentation `anime_x`/`anime_calendrier`** → recommandé
   en guidance (§6.4), non obligatoire.
10. **Format `infos_marches`** → RÉSOLU : unifié sur `audio_sequence`
    comme les 5 autres routes (§4, §6.5) ; les 2 variantes qui n'avaient
    aucun schéma (`presentation_du_marche`, `opportunite_marche`) n'en ont
    plus besoin puisqu'elles suivent désormais le schéma générique.
11. **Sémantique de la règle `mensuel`** → RÉSOLU : `semaine =
    ceil(jour_du_mois / 7)`, confirmé par le code backend existant
    (`MarketAnimationService::checkMensuel`) — voir tableau §6.5.
12. **Seuil de variation de prix** → RÉSOLU : 5% (§6.6).
13. **Génération audio pour valeurs numériques/dates arbitraires** →
    RÉSOLU : non pertinent, tous les fichiers nécessaires sont déjà
    enregistrés côté ressources ; le backend référence des chemins
    existants selon une convention de nommage fixe (§3.2), il ne génère
    jamais d'audio.
14. **Variétés de produit non modélisées dans `flow.json`** → largement
    dé-risqué : les fichiers existent déjà (§13) ; reste une action de
    mise à jour du hashmap `varietes_par_produit` côté Studio pour rester
    documentaire, non bloquante (§6.6).
15. **Champ `audio_sequence` (tableau) au niveau du nœud `result` dans
    `flow.json`** → clarifié : c'est un champ hors-schéma, reliquat d'un
    format antérieur, sans rapport avec l'enveloppe de réponse
    `{"type":"audio_sequence",...}` documentée ici (§4). Ignorer ce champ.

---

## 8. Références internes (pour aller plus loin)

- `flow.json` — source de vérité : variables/hashmaps complets, contenu
  exact de `json_response_contrat`/`response_examples`/`comment` par nœud.
- `src/types/flow.ts` — schéma TypeScript des nœuds (`DataSource`,
  `ResultNodeData`, etc.).
- `src/utils/simulationEngine.ts` — logique de référence pour la
  construction de requête et le parsing `audio_sequence` (utile pour
  vérifier qu'une réponse backend réelle sera bien comprise par le
  Simulateur avant même de brancher l'app mobile).
- `src/utils/resourceInventory.ts` — formule exacte des chemins générés
  (§3.1).
- Le **Simulateur de Flow** du Studio (`🚀 Simulateur`) permet de tester
  une route dès qu'elle existe (même partiellement) : vrai appel HTTP,
  bascule sur réponse simulée en cas d'échec — utile pour valider un
  contrat de réponse bloc par bloc avec le backend avant intégration
  complète dans l'app mobile. **Note** : tant que le correctif de préfixe
  langue mentionné en §3.2 n'est pas fait côté Simulateur, la lecture
  audio réelle dans l'outil restera incorrecte pour les chemins littéraux
  — n'affecte pas la validité de ce contrat API, seulement l'aperçu audio
  dans l'outil de test.
