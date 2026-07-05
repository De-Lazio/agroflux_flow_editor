# Documentation d'Utilisation - AgroFlux Flow Editor

Ce document présente le fonctionnement du **Flow Editor**, l'outil visuel de gestion des flux de navigation pour l'application mobile AgroFlux Bénin.

## 1. Structure de l'Interface

L'application est divisée en quatre zones principales :
- **Barre d'Outils (Haut) :** Accès aux actions globales (Charger, Sauvegarder, Ajouter, Réorganiser, Valider).
- **Canevas de Flux (Centre) :** Espace visuel interactif où les nœuds sont affichés et reliés.
- **Éditeur de Nœud (Droite) :** Panneau contextuel qui s'ouvre lors de la sélection d'un nœud pour modifier ses propriétés.
- **Panneau de Validation (Bas) :** Affiche les erreurs et avertissements structurels après une analyse du flux.

---

## 2. Les Types de Nœuds (Blocs)

L'éditeur supporte deux formats : **LEGACY** (statique) et **DYNAMIC** (avancé avec variables).

### Format DYNAMIQUE (Nouveau)
- **🟦 ROOT (Indigo) :** Menu principal dynamique.
- **🩵 GRID (Cyan) :** Grille d'options générée à partir d'une variable (ex: liste des produits).
- **🌹 RESULT (Rose) :** Résultats de recherche basés sur une API.
- **🟪 CALENDRIER (Violet) :** Sélecteur de date spécialisé.
- **🟧 PRE_FILTER (Ambre) :** Logique de filtrage interne (HashMap).

---

## 3. Nouveau Système Audio (Format Dynamique)

Le format dynamique utilise un système audio unifié et puissant :

### Séquences Audios
Au lieu d'un simple fichier, chaque nœud définit une **séquence** d'audios joués l'un après l'autre.
- **ID Audio (Key) :** Un identifiant unique pour cette séquence (ex: `acheter_produit_intro`).
- **Variables dynamiques :** Vous pouvez injecter des variables dans les audios en utilisant des accolades.
  - `{"{produit}"}` : Jouera l'audio correspondant au produit choisi.
  - `{"{prix:1000}"}` : Jouera l'audio pour le prix 1000 FCFA.
- **Fallback :** Un audio de secours si un fichier est manquant.

### Mappage Global
Dans la barre d'outils, le bouton **"Audios"** permet de définir les dossiers racines pour chaque type de variable (ex: `produit` -> `produits/`).

---

## 3. Guide d'Utilisation

### Navigation dans le Canevas
- **Zoom :** Utilisez la molette de la souris.
- **Déplacement :** Cliquez et faites glisser le fond du canevas.
- **Sélection :** Cliquez sur un nœud pour ouvrir ses détails à droite.

### Modification du Flux
1. **Ajouter un nœud :** Cliquez sur le bouton **"+"** dans la barre d'outils, choisissez le type et l'ID.
2. **Relier des nœuds :** Cliquez sur le point de sortie (bas) d'un nœud et faites glisser vers le point d'entrée (haut) d'un autre.
3. **Réorganiser :** Si le graphe devient désordonné, cliquez sur **"🔄 Réorganiser"**. L'outil alignera automatiquement les nœuds avec un espacement optimal (250px en vertical).
4. **Éditer :** Modifiez les labels, les audios (chemins de fichiers) et les options directement dans le panneau de droite.

### Validation et Export
- **Validation :** Cliquez sur le bouton de validation pour vérifier les liens brisés ou les IDs manquants.
- **Sauvegarde :** Le bouton **"Enregistrer"** télécharge un fichier `flow.json` compatible avec l'application mobile.
- **Chargement :** Utilisez **"Importer"** pour reprendre le travail sur un fichier JSON existant.

---

## 4. Raccourcis et Astuces
- **Undo/Redo :** Utilisez les flèches dans la barre d'outils pour annuler ou rétablir vos actions.
- **Recherche :** La barre de recherche permet de localiser rapidement un nœud par son ID ou son label.
- **Visualisation des liens :** Les liens d'options sont des traits pleins animés, tandis que les liens de type `next_filter` sont en pointillés verts.
