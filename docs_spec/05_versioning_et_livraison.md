# 5. Versioning et livraison du flow et des ressources

Contrairement aux documents précédents (qui décrivent un comportement déjà
implémenté et testable dans le Studio), **ce document distingue explicitement
ce qui existe déjà** (le format des artefacts produits par le Studio) **de ce
qui est une recommandation** pour l'app mobile (stratégie de mise à jour) —
aucune app mobile de référence n'existe encore pour valider cette dernière
partie en conditions réelles.

## 5.1. Qui produit quoi

Le Studio (Flow Editor) a trois étapes qui produisent des artefacts, dans cet
ordre : **Ressources** (scan du dossier de ressources réel) → **Build**
(valide + scanne + réconcilie + écrit des artefacts) → **Publication** (même
chose que Build, plus un dossier `assets/` prêt à distribuer). Implémentation
de référence : `src/utils/buildProject.ts` (`runBuild`, `preparePublication`),
`src/utils/assetRepository.ts` (manifeste/hash).

### Les 8 fichiers écrits par un Build (et repris par une Publication)

| Fichier | Contenu |
|---|---|
| `flow.json` | Le flow validé, tel quel (voir [`01_flow_json_reference.md`](./01_flow_json_reference.md)). |
| `resource_inventory.json` | La liste complète des ressources attendues par ce flow (`report.audios`/`report.images` — mêmes chemins que ceux résolus par l'app, voir [`03_ressources_et_chemins.md`](./03_ressources_et_chemins.md)). |
| `manifest.json` | Inventaire réel du dossier de ressources scanné — voir §5.2. |
| `repository.json` | Hash global du dépôt de ressources + métadonnées — voir §5.3. |
| `validation_report.json` / `.md` | Erreurs/avertissements de validation + le même inventaire de ressources, en formats machine et lisible humain. |
| `backend_contract.json` / `.md` | Liste des routes backend dérivées des nœuds `result` du flow (endpoint, méthode, params, exemple de réponse) — utile à l'équipe backend, pas directement à l'app mobile. |

### Ce qu'ajoute une Publication

Un dossier `assets/` contenant une copie de **seulement les fichiers
réellement référencés par le flow** (jamais les orphelins — fichiers présents
sur disque mais plus attendus par aucun nœud/variable/hashmap — jamais un
`cp -r` aveugle de tout le dossier source). C'est ce dossier `assets/`, avec
sa structure `audio/{langue}/...` + `images/...` (voir
[`03_ressources_et_chemins.md`](./03_ressources_et_chemins.md) §3.1), qui
correspond exactement à ce que l'app mobile doit télécharger et stocker
localement.

**Si le flow a des erreurs de validation bloquantes, rien n'est écrit** —
jamais de package partiel/incohérent livré à l'app mobile ou au backend.

## 5.2. `manifest.json` — inventaire fichier par fichier

```json
{
  "generated_at": "2026-08-19T10:00:00.000Z",
  "entries": [
    {
      "path": "audio/fon/produits/mais.mp3",
      "hash": "3f2504e...",
      "file_size": 24576,
      "resource_type": "audio",
      "last_modified": "2026-08-18T09:12:00.000Z"
    }
  ]
}
```

- `path` : chemin relatif, snake_case, jamais d'URL absolue — la
  reconstruction `base_url + path` est une responsabilité du client
  (app/backend), pas du manifeste.
- `hash` : SHA-256 du contenu du fichier (hex).
- `resource_type` : dérivé uniquement du premier segment du chemin
  (`audio` → `"audio"`, `images` → `"image"`) — un fichier hors de ces deux
  racines n'est pas une ressource connue du Studio et n'apparaît pas ici.

## 5.3. `repository.json` — hash global de version

```json
{ "repository_hash": "9b74c9897bac770...", "generated_at": "2026-08-19T10:00:00.000Z", "entry_count": 1842 }
```

`repository_hash` est **déterministe** : même ensemble de fichiers (mêmes
chemins, mêmes tailles, mêmes contenus) ⇒ toujours le même hash, quel que
soit l'ordre de scan. Il change dès qu'**un seul** fichier change (contenu,
taille ou chemin). Calcul exact (`src/utils/assetRepository.ts`,
`computeRepositoryHash`) :

```
entries_triées = manifest.entries triées par path (ordre alphabétique)
chaîne = pour chaque entrée, "{path}|{hash}|{file_size}", jointes par "\n"
repository_hash = SHA-256(chaîne)
```

C'est **la seule valeur à comparer** pour savoir si le paquet de ressources
côté serveur a changé depuis la dernière fois — pas besoin de télécharger le
manifeste complet juste pour vérifier qu'il n'y a rien de neuf.

## 5.4. Stratégie de mise à jour recommandée pour l'app mobile

*(Recommandation — à valider avec l'équipe backend au moment de brancher un
vrai endpoint de distribution ; aucune route de ce type n'existe encore dans
le contrat des 6 routes du §4.)*

1. **Au démarrage de l'app** (ou périodiquement, ex. une fois par jour) :
   demander au backend le `repository_hash` courant (endpoint à définir avec
   le backend) et le comparer au `repository_hash` stocké localement (celui
   du dernier paquet téléchargé avec succès).
2. **Si identique** : rien à faire, continuer avec les ressources locales.
3. **Si différent** : télécharger le nouveau `flow.json` et le nouveau
   `manifest.json`, puis :
   - **Mise à jour complète (simple, recommandée pour un premier
     lancement)** : télécharger l'intégralité du dossier `assets/` de la
     nouvelle Publication, remplacer le stockage local, puis mettre à jour le
     `repository_hash` stocké.
   - **Mise à jour incrémentale (optimisation ultérieure)** : comparer les
     `entries` du nouveau `manifest.json` à celles du manifeste local
     (comparaison par `path` + `hash`) pour ne télécharger que les fichiers
     nouveaux ou modifiés, et supprimer localement ceux qui ont disparu du
     nouveau manifeste. Le manifeste contient déjà tout ce qu'il faut pour ce
     diff (aucune information supplémentaire à demander au backend).
4. **Ne jamais servir un flow et des ressources incohérents entre eux** :
   `flow.json` et le dossier `assets/` doivent toujours provenir de la **même**
   Publication (même `repository_hash` associé) — ne jamais mélanger un
   `flow.json` neuf avec des ressources encore anciennes, au risque de
   demander un fichier qui n'existe pas encore localement en pleine
   navigation utilisateur.
5. **Résilience hors-ligne** : l'app doit rester utilisable avec le dernier
   paquet téléchargé avec succès si le réseau est indisponible au démarrage —
   ne bloquer l'utilisateur que si **aucun** paquet n'a jamais été téléchargé
   avec succès (premier lancement sans réseau).

## 5.5. Ce que `version` dans `flow.json` ne veut PAS dire

Le champ `version` à la racine de `flow.json` (§1.1) est un numéro de
**version de format/schéma** (aujourd'hui `"1.0"` pour tous les flows
existants), pas un numéro de release de contenu. **N'utilisez jamais ce champ
comme mécanisme de détection de changement de contenu** — c'est
`repository_hash` (§5.3) qui joue ce rôle.
