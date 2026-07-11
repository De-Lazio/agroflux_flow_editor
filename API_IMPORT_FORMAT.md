# Format attendu — Import de Variables/HashMaps depuis une API

Ce document décrit le JSON que doit renvoyer la route API branchée sur
**Données ▾ → Importer depuis API** dans le Flow Editor.

## Requête envoyée par le Flow Editor

```
GET <url renseignée dans le formulaire>
Authorization: Bearer <token>   (uniquement si un token est saisi)
```

Aucun corps n'est envoyé. La réponse doit être `200 OK` avec un corps JSON.

## Forme générale de la réponse

Chaque valeur de variable, et chaque clé/valeur de HashMap, porte directement
son **état actif** (`true` = actif, `false` = inactif) — pas de tableau plat de
chaînes, mais un objet `{ valeur: booléen }`. C'est la forme la plus simple à
produire côté backend (un objet, aucune structure imbriquée supplémentaire).

```json
{
  "variables": {
    "produits": {
      "mais": true,
      "riz": true,
      "sorgho": false
    },
    "departements": {
      "oueme": true,
      "plateau": true
    }
  },
  "hashmaps": {
    "marche_par_departement": {
      "oueme": {
        "active": true,
        "values": {
          "ouando": true,
          "adjohoun": false,
          "seme": true
        }
      },
      "plateau": {
        "active": false,
        "values": {
          "sakete": true,
          "ketou": true
        }
      }
    }
  }
}
```

- `variables` : objet `{ nom: { valeur: booléen } }`. Les clés de l'objet
  interne sont la liste des valeurs de la variable ; chaque booléen indique
  si cette valeur est active ou non.
- `hashmaps` : objet `{ nom: { clé: { active, values } } }`. Pour chaque
  clé : `active` (booléen, l'état de la clé elle-même) et `values` (objet
  `{ valeur: booléen }`, l'état de chaque valeur de la liste de cette clé).
- Les deux champs racine sont **optionnels indépendamment** : une réponse
  `{ "variables": {...} }` seule (sans `hashmaps`) est valide, et
  inversement. Un champ absent est traité comme vide (`{}`), pas comme une
  erreur.
- Aucun autre champ n'est requis ; des champs supplémentaires dans la
  réponse sont ignorés.

## Ce que signifie l'état actif

L'état actif est une donnée **d'auteur**, pas un filtre appliqué par le
Studio : le Gestionnaire de Variables et le Gestionnaire de HashMaps
continuent d'afficher l'intégralité du contenu, actif ou non (icône œil sur
chaque valeur/clé). C'est l'application mobile et le backend qui décident,
à l'exécution, d'afficher ou non une option selon cet état — voir la section
"États actif / inactif" de la documentation du projet
(`public/documentation.html`).

Pour une clé de HashMap désactivée (`"active": false`), le Studio considère
également désactivées **toutes ses valeurs**, même si `values` les déclare
individuellement à `true` — la désactivation d'une clé prime sur ses valeurs.

## Règles de validation

Le Flow Editor rejette la réponse (avec un message d'erreur explicite) si :

| Cas | Erreur |
|---|---|
| La réponse n'est pas un objet JSON | "La réponse de l'API doit être un objet JSON." |
| `variables` n'est pas un objet `{nom: {...}}` | "Le champ \"variables\" doit être un objet { nom: { valeur: true/false } }." |
| Une variable n'est pas un objet `{valeur: booléen}` | "La variable \"X\" doit être un objet { valeur: true/false }." |
| Une valeur de variable n'est pas un booléen | "La valeur \"X\" de la variable \"Y\" doit être un booléen (true = actif, false = inactif)." |
| `hashmaps` n'est pas un objet `{nom: {...}}` | "Le champ \"hashmaps\" doit être un objet { nom: { clé: { active, values } } }." |
| Une clé de hashmap n'a pas de champ `active` booléen | "La clé \"X\" du hashmap \"Y\" doit avoir un champ \"active\" booléen." |
| Une clé de hashmap n'a pas de champ `values` objet | "La clé \"X\" du hashmap \"Y\" doit avoir un champ \"values\" objet { valeur: true/false }." |
| Une valeur de `values` n'est pas un booléen | "La valeur \"X\" de la clé \"Y\" (hashmap \"Z\") doit être un booléen." |

## Ce qui se passe après réception

Pour chaque variable/hashmap reçu, comparé à l'état local (valeurs **et**
état actif) :

- **absent en local** → ajouté automatiquement (valeurs + état actif), sans
  confirmation.
- **présent en local avec un contenu identique** (mêmes valeurs, même état
  actif pour chacune) → ignoré, rien à faire.
- **présent en local avec un ensemble de valeurs différent, ou un état actif
  différent pour au moins une valeur commune** → affiché comme conflit, à
  résoudre manuellement (conserver local, conserver distant, ou fusionner
  avec priorité locale/distante). La fusion s'applique aussi bien aux
  valeurs qu'à leur état actif : en priorité locale, l'état déjà connu en
  local est conservé pour les valeurs déjà présentes (seules les valeurs
  nouvelles, apportées par le distant, adoptent son état) ; en priorité
  distante, c'est l'inverse.

## Exemple minimal (uniquement des variables)

```json
{
  "variables": {
    "produits": { "mais": true, "riz": true }
  }
}
```

## Exemple minimal (uniquement des hashmaps)

```json
{
  "hashmaps": {
    "marche_par_departement": {
      "oueme": { "active": true, "values": { "ouando": true, "adjohoun": true } }
    }
  }
}
```
