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

```json
{
  "variables": {
    "produits": ["mais", "riz", "sorgho", "soja"],
    "departements": ["oueme", "plateau", "zou", "collines"]
  },
  "hashmaps": {
    "marche_par_departement": {
      "oueme": ["ouando", "adjohoun", "seme"],
      "plateau": ["sakete", "ketou"]
    },
    "type_par_produit": {
      "mais": ["cereale"],
      "riz": ["cereale"],
      "sorgho": ["cereale"]
    }
  }
}
```

- `variables` : objet `{ nom: [valeurs] }` — chaque valeur doit être une chaîne. Correspond exactement au format `FlowVariables` du flow (voir `VariableManager`).
- `hashmaps` : objet `{ nom: { clé: [valeurs] } }` — chaque `clé` associe une liste de chaînes. Correspond au format `FlowHashmaps` (voir `HashMapManager`).
- Les deux champs sont **optionnels indépendamment** : une réponse `{ "variables": {...} }` seule (sans `hashmaps`) est valide, et inversement. Un champ absent est traité comme vide (`{}`), pas comme une erreur.
- Aucun autre champ n'est requis ; des champs supplémentaires dans la réponse sont ignorés.

## Règles de validation

Le Flow Editor rejette la réponse (avec un message d'erreur explicite) si :

| Cas | Erreur |
|---|---|
| La réponse n'est pas un objet JSON | "La réponse de l'API doit être un objet JSON." |
| `variables` n'est pas un objet `{nom: [...]}` | "Le champ \"variables\" doit être un objet { nom: [valeurs] }." |
| Une variable contient autre chose que des chaînes | "La variable \"X\" doit être un tableau de chaînes." |
| `hashmaps` n'est pas un objet `{nom: {clé: [...]}}` | "Le champ \"hashmaps\" doit être un objet { nom: { clé: [valeurs] } }." |
| Une clé de hashmap contient autre chose que des chaînes | "La clé \"X\" du hashmap \"Y\" doit être un tableau de chaînes." |

## Ce qui se passe après réception

Pour chaque variable/hashmap reçu :
- **absent en local** → ajouté automatiquement, sans confirmation.
- **présent en local avec un contenu identique** (même ensemble de valeurs, ordre indifférent) → ignoré, rien à faire.
- **présent en local avec un contenu différent** → affiché comme conflit, à résoudre manuellement (conserver local, conserver distant, ou fusionner avec priorité locale/distante).

## Exemple minimal (uniquement des variables)

```json
{
  "variables": {
    "produits": ["mais", "riz"]
  }
}
```

## Exemple minimal (uniquement des hashmaps)

```json
{
  "hashmaps": {
    "marche_par_departement": {
      "oueme": ["ouando", "adjohoun"]
    }
  }
}
```
