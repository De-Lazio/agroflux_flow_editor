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

Chaque bloc représente une étape de navigation. Ils sont identifiés par un code couleur :

### 🟦 MENU (Bleu)
Utilisé pour présenter des choix explicites à l'utilisateur.
- **Usage :** Navigation principale, sélection de langue, choix de catégorie.
- **Structure :** Contient une liste d'**options** (ID, label, lien vers le nœud suivant).

### 🟩 FILTER (Vert)
Utilisé pour le filtrage progressif (souvent lié à des données dynamiques comme les marchés ou les localités).
- **Usage :** Sélection d'un département, d'une commune, ou d'un produit spécifique.
- **Structure :** Possède généralement un champ `next_filter` ou des options de filtrage.

### 🟨 RESULTS (Jaune)
Représente l'écran final affichant les informations recherchées.
- **Usage :** Affichage des prix des produits, jours de marché, etc.

### 🟪 WIDGET (Violet)
Composants spécialisés pour des interactions riches.
- **Usage :** Calendriers, sélecteurs complexes.

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
