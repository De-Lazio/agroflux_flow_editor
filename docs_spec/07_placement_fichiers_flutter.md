# 7. Où placer les fichiers de Publication dans le projet Flutter

Une Publication du Studio (voir [`05_versioning_et_livraison.md`](./05_versioning_et_livraison.md))
produit ce répertoire :

```
assets/                 backend_contract.md  manifest.json    resource_inventory.json  validation_report.md
backend_contract.json   flow.json            repository.json  validation_report.json
```

Tous ces fichiers ne se rangent pas au même endroit côté Flutter — il faut
distinguer ce qui est **consommé par l'app à l'exécution** de ce qui est de
la **documentation d'équipe**.

## 7.1. Consommé par l'app à l'exécution

| Fichier/dossier | Où | Pourquoi |
|---|---|---|
| `flow.json` | Stockage applicatif accessible en écriture (`path_provider` → `getApplicationSupportDirectory()`), **jamais** `assets/` de `pubspec.yaml` | Doit pouvoir être remplacé à chaque mise à jour de contenu (§5.4). Un asset Flutter déclaré dans `pubspec.yaml` est figé dans le binaire à la compilation — impossible à mettre à jour sans repasser par le store. |
| `assets/` (audio/images) | Même stockage applicatif en écriture, ex. `<app_support_dir>/resources/audio/...`, `.../images/...` | Même raison — c'est exactement le contenu que remplace une mise à jour (comparaison `repository_hash`, §5.3). |
| `manifest.json` | Même stockage applicatif | Sert à l'app pour savoir quels fichiers elle a déjà (diff incrémental lors d'une mise à jour, §5.4 point 3). |
| `repository.json` | Même stockage applicatif | Sert à comparer le hash local au hash serveur pour savoir si une mise à jour est disponible (§5.3, §5.4 points 1-2). |

**Recommandé en plus (optionnel mais conseillé) :** embarquer une copie de ces
mêmes fichiers dans les vrais assets Flutter (`assets/flow_seed/` déclaré
dans `pubspec.yaml`) comme **jeu de secours pour le tout premier lancement
hors-ligne**. Au démarrage, si le stockage applicatif est vide, l'app copie
ce seed vers le stockage applicatif, puis c'est cette copie (jamais le seed)
qui est ensuite mise à jour par le mécanisme réseau (§5.4 point 5,
résilience hors-ligne).

## 7.2. Pas dans le projet Flutter

| Fichier | Destination |
|---|---|
| `backend_contract.json` / `.md` | Équipe backend uniquement — sert à définir les routes API (voir [`04_contrat_api_backend.md`](./04_contrat_api_backend.md)), aucun usage côté app. |
| `validation_report.json` / `.md` | Documentation Studio (preuve que le flow a passé la validation), aucun usage runtime. |
| `resource_inventory.json` | Redondant avec ce que l'app dérive déjà de `flow.json` (voir [`03_ressources_et_chemins.md`](./03_ressources_et_chemins.md)) — utile en debug/CI côté Studio, pas à embarquer dans l'app. |

Ces trois-là peuvent rester dans le dépôt du Flow Editor (ou un dossier
`docs_spec`/`handoff` partagé) — inutile de les copier dans le repo Flutter.

## 7.3. Résumé visuel

```
Publication (Studio)                    Projet Flutter
├── flow.json              ──────────►  stockage applicatif en écriture (+ copie seed optionnelle dans assets/)
├── assets/                ──────────►  stockage applicatif en écriture (+ copie seed optionnelle dans assets/)
├── manifest.json          ──────────►  stockage applicatif en écriture
├── repository.json        ──────────►  stockage applicatif en écriture
├── backend_contract.*     ──────────►  (ne va pas dans le projet Flutter — équipe backend)
├── validation_report.*    ──────────►  (ne va pas dans le projet Flutter)
└── resource_inventory.json──────────►  (ne va pas dans le projet Flutter)
```
