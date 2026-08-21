# 3. Organisation des ressources (audio / images)

Implémentation de référence : `src/utils/resourceInventory.ts` (formule des
chemins générés), `src/utils/simulationResources.ts` (résolution/lecture),
`src/utils/assetRepository.ts` (inventaire réel sur disque).

## 3.1. Arborescence

```
<racine ressources>/
├── audio/
│   ├── fon/
│   │   ├── produits/
│   │   │   ├── mais.mp3
│   │   │   └── riz.mp3
│   │   ├── marche_par_departement/
│   │   │   └── oueme/
│   │   │       └── ouando.mp3
│   │   ├── prix/1000_fcfa.mp3
│   │   ├── date/2026_03_10.mp3
│   │   ├── intro/root_intro.mp3
│   │   └── questions/achete_produit.mp3
│   ├── yoruba/                    (même arborescence, contenu différent)
│   ├── dendi/
│   └── adja/
└── images/
    ├── produits/
    │   └── mais.jpeg
    ├── marche_par_departement/
    │   └── oueme/
    │       └── ouando.jpeg
    └── intro/acheter.jpeg
```

**Règle fondamentale : `audio/` a un niveau de dossier supplémentaire pour la
langue (une arborescence complète et identique sous chaque langue), `images/`
n'en a jamais** — une image ne dépend jamais de la langue de navigation.

## 3.2. Formule de chemin — ressources de variable/hashmap

Pour une **variable** `nom` (dossier = `flow.audio_mappings[nom]` ou `nom` si
absent du mapping), valeur `v`, langue `l`, formats `fa`/`fi` (audio/image de
`flow.resource_formats`) :

```
audio/{l}/{dossier}/{v}.{fa}      — une entrée PAR LANGUE ACTIVE
images/{dossier}/{v}.{fi}         — une seule entrée, jamais dupliquée par langue
```

Pour un **hashmap** `nom`, clé `k`, valeur `v` :

```
audio/{l}/{dossier}/{k}/{v}.{fa}
images/{dossier}/{k}/{v}.{fi}
```

Exemple concret (`flow.json` réel) : variable `produits`, valeur `mais`,
langues `[fon, yoruba, dendi, adja]` ⇒
`audio/fon/produits/mais.mp3`, `audio/yoruba/produits/mais.mp3`,
`audio/dendi/produits/mais.mp3`, `audio/adja/produits/mais.mp3`,
`images/produits/mais.jpeg` (une seule).

Hashmap `marche_par_departement`, clé `oueme`, valeur `ouando` ⇒
`audio/fon/marche_par_departement/oueme/ouando.mp3`,
`images/marche_par_departement/oueme/ouando.jpeg`.

## 3.3. Chemins littéraux — audio de nœud et réponses backend

**Deux régimes de chemins coexistent, à ne jamais confondre :**

1. **Chemins générés** (§3.2, ci-dessus) : calculés par une formule fixe à
   partir d'un nom de variable/hashmap + valeur. C'est ce que produit
   l'Asset Repository du Studio.
2. **Chemins littéraux** : écrits tels quels dans `flow.json`
   (`node.audio.sequence`/`fallback`, voir §1.4) ou renvoyés tels quels par le
   backend dans une réponse `audio_sequence` (`sequence[i].audios[]`, voir
   [`04_contrat_api_backend.md`](./04_contrat_api_backend.md) §4). Ces
   chemins **ne comportent jamais le préfixe de langue** — c'est une
   convention volontaire pour que ni le flow ni le backend n'aient à
   connaître la langue de l'utilisateur.

**Règle côté app mobile : préfixer systématiquement `audio/{langue_utilisateur}/`
avant de résoudre un chemin littéral audio.** C'est possible car l'arborescence
est identique sous chaque dossier de langue (mêmes noms de fichier). Une image
littérale (`sequence[i].image`), elle, est **déjà complète** (`images/...`
inclus) et ne se préfixe jamais.

```
préfixer_langue(chemin) = "audio/" + langue_utilisateur + "/" + chemin
```

Exemples de chemins littéraux valides renvoyés par le backend :
`"produits/mais.mp3"`, `"prix/1000_fcfa.mp3"`, `"date/2026_03_10.mp3"`,
`"phrases/est_a.mp3"`, `"conseils/prix_bas_bonne_opportunite.mp3"` — à
préfixer en `"audio/fon/produits/mais.mp3"` etc. avant lecture pour un
utilisateur en fon.

**Convention de nommage pour les valeurs numériques/dates** (fichiers déjà
enregistrés sous ces noms, jamais générés dynamiquement) :
- Prix : `prix/{valeur}_fcfa.mp3` (ex. `prix/1000_fcfa.mp3`).
- Date : `date/{YYYY}_{MM}_{DD}.mp3` (ex. `date/2026_03_10.mp3`).

Si un prix/une date précis n'a pas de fichier correspondant, c'est un manque
de contenu à faire enregistrer — jamais un cas à contourner par une
génération dynamique côté app ou backend.

## 3.4. Cas particulier — `hashmaps_no_resources`

Un hashmap listé dans `flow.hashmaps_no_resources` (ex. `marches_par_departement`,
`communes_par_departement` dans le flow réel) n'a **aucun chemin canonique
généré** par la formule du §3.2 — ses clés/valeurs sont déjà couvertes par des
ressources de variable existantes ailleurs (mêmes libellés, ex. les noms de
marché existent déjà comme ressources indépendantes de tout département).

Pour résoudre l'audio/image d'une valeur issue d'un tel hashmap, l'app doit
faire une **recherche best-effort par nom de fichier** dans tout l'index de
ressources déjà téléchargées, restreinte au bon préfixe de racine
(`audio/{langue}/` ou `images/`) pour ne jamais confondre un audio et une
image homonymes :

```
recherche_best_effort(valeur, format, prefixe_racine):
    nom_fichier = valeur + "." + format
    retourner le premier chemin déjà connu se terminant par "/" + nom_fichier
             et commençant par prefixe_racine
    sinon : introuvable
```

C'est une résolution "au mieux", sans garantie — contrairement au chemin
canonique du §3.2, qui est soit présent au chemin exact, soit absent.

## 3.5. Cas particulier — options d'un nœud `root`

Aucune formule officielle ne génère de ressources pour les options d'un nœud
`root` (ce ne sont pas des valeurs de variable). Une convention **best-effort,
non garantie** existe pour l'audio uniquement :

```
audio/{langue}/questions/{option_id}.{format_audio}
```

Aucune convention équivalente n'existe pour une image d'option de `root` —
n'en attendre aucune. Si le fichier attendu par cette convention n'existe pas,
l'app doit se rabattre silencieusement sur un affichage texte seul de
l'option, jamais planter ni bloquer la navigation.

## 3.6. Langues actives

`flow.languages` liste les langues pour lesquelles des ressources audio
doivent exister (ex. `["fon", "yoruba", "dendi", "adja"]` en production —
`fr` peut apparaître en plus comme langue de référence/débogage pendant le
développement, à ne pas nécessairement exposer à l'utilisateur final). L'app
mobile doit proposer à l'utilisateur un choix de langue parmi cette liste (ou
un sous-ensemble jugé pertinent), stocker son choix, et l'utiliser comme
`langue_utilisateur` dans toutes les résolutions de chemin ci-dessus.

## 3.7. Comment les ressources sont livrées à l'app

Voir [`05_versioning_et_livraison.md`](./05_versioning_et_livraison.md) pour
le mécanisme complet (manifeste, hash, package de publication). En résumé :
l'app télécharge un paquet de ressources (dossier `assets/` d'une Publication)
qui respecte exactement l'arborescence décrite ici — aucune reconstruction de
chemin côté app au-delà des règles ci-dessus.
