# AgroFlux Studio
## Spécifications d'évolution du Flow Editor

# Présentation

Le Flow Editor n'est plus uniquement un éditeur graphique de parcours utilisateurs.

Il devient **AgroFlux Studio**, l'environnement de conception fonctionnelle utilisé pour produire l'ensemble des ressources nécessaires au fonctionnement de l'écosystème AgroFlux.

Le Studio est responsable de la conception, de la validation, de la génération et de la publication des éléments suivants :

- Flows de navigation
- Contrats JSON
- Inventaire des ressources
- Références des audios
- Références des images
- Manifestes de ressources
- Dépôt des assets
- Validation globale du projet

L'objectif est qu'aucune logique métier ne soit dupliquée entre le Backend, Flutter et le Studio.

Le Studio devient la source de vérité du projet.

---

# Vision générale

Le Studio devra permettre à un concepteur fonctionnel de produire un projet complet sans avoir à modifier le code du backend ou de l'application Flutter.

L'ensemble des fichiers générés devra être directement exploitable par les autres composants du projet.

---

# Architecture générale

Le Studio sera organisé autour de plusieurs modules complémentaires.

Flow Editor
↓

Resource Manager
↓

Asset Repository

↓

Build System

↓

Validation

↓

Publication

---

# Module 1 — Flow Editor

(Module existant)

Responsabilités

- édition graphique
- création des nœuds
- édition des propriétés
- gestion des variables
- gestion des HashMaps
- validation structurelle
- génération du flow.json

Ce module reste le cœur de l'application.

---

# Module 2 — Resource Manager

Ce module centralise la gestion logique des ressources du projet.

Il ne gère pas directement les fichiers.

Il gère uniquement leurs références.

Le Resource Manager est responsable de :

- génération des références audio
- génération des références image
- inventaire complet des ressources attendues
- regroupement par origine
- détection des ressources orphelines
- détection des références inutilisées
- détection des références cassées

Les ressources sont générées automatiquement à partir :

- des variables
- des HashMaps
- des nodes

Aucune ressource n'est créée manuellement.

---

# Module 3 — Validation

Le système actuel de validation devra évoluer.

La validation devra couvrir :

## Structure

- IDs uniques
- liens cassés
- nodes inaccessibles
- cycles
- variables inexistantes
- HashMaps inexistantes

## Ressources

- références audio
- références image
- dossiers inexistants
- fichiers manquants

## Contrats Backend

- endpoints utilisés
- paramètres
- réponses attendues

## Rapport

Le rapport devra être exportable.

Formats souhaités :

- HTML
- JSON
- Markdown

---

# Module 4 — Asset Repository

Nouveau module.

Il constitue le système officiel de gestion des ressources du projet.

Toutes les ressources utilisées par AgroFlux passent par ce module.

Types de ressources :

- audio
- images
- futures vidéos
- futures animations

Le dépôt est entièrement versionné.

---

# Structure du dépôt

assets/

audio/

images/

repository.json

manifest.json

---

# Principe

Le dépôt est généré automatiquement.

Le développeur ne modifie jamais les manifestes.

Le Studio les produit.

---

# Manifest

Le manifest contient l'ensemble des ressources.

Pour chaque ressource :

- chemin
- hash SHA-256
- taille
- date de génération

Le manifest constitue la source de vérité des ressources.

---

# Repository

Le repository représente l'état global du dépôt.

Il contient notamment :

- hash global du dépôt
- date de génération
- informations générales

Le hash du repository est obtenu automatiquement à partir du manifest.

Ainsi, aucune version numérique n'est maintenue manuellement.

Chaque modification du dépôt produit automatiquement un nouvel identifiant.

---

# Gestion des mises à jour

Le système doit permettre :

- ajout de ressources
- suppression
- modification

L'application Flutter téléchargera uniquement les ressources dont le hash diffère.

Le Studio n'a donc pas à générer des patches.

Il fournit simplement l'état actuel du dépôt.

---

# Langues

Le Studio ne connaît aucune langue prédéfinie.

Les langues sont découvertes automatiquement.

L'ajout d'une nouvelle langue ne nécessite aucune modification du code.

Exemple :

audio/

fon/

yoruba/

adja/

dendi/

bariba/

mina/

goun/

Toute langue ajoutée dans le dépôt devient automatiquement disponible.

---

# Build System

Le Studio devra disposer d'un véritable système de Build.

Nouvelle action :

Build Project

Cette action produit automatiquement :

✓ flow.json

✓ resource_inventory.json

✓ manifest.json

✓ repository.json

✓ rapport de validation

✓ liste des ressources manquantes

✓ liste des ressources inutilisées

Le Build doit être entièrement automatique.

Aucune intervention manuelle.

---

# Calcul des Hash

Le Studio calcule automatiquement le hash SHA-256 de chaque ressource.

Le hash est recalculé uniquement lorsque le fichier est modifié.

Aucune saisie manuelle.

---

# Versionnement

Le Studio ne gère aucun numéro de version.

Le versionnement est basé uniquement sur les hash.

Le hash global du repository constitue la version officielle du dépôt.

Cette approche garantit :

- aucune erreur humaine
- aucune incrémentation oubliée
- cohérence totale

---

# Vérification locale des ressources

Le mécanisme actuel basé sur le fichier tree reste conservé.

Le Studio devra :

- générer automatiquement la commande
- importer le résultat
- comparer avec le manifest
- produire un rapport

---

# Publication

À terme, le Studio devra pouvoir préparer un dépôt prêt à être publié.

La publication ne consiste pas à envoyer les fichiers.

Elle consiste à produire un répertoire contenant :

flow.json

manifest.json

repository.json

assets/

Tous les composants du projet pourront utiliser directement ce répertoire.

---

# Contraintes

Le Studio reste :

- une application React
- entièrement exécutée dans le navigateur
- sans backend
- sans base de données
- fonctionnement local

Les fichiers sont lus et générés localement.

Aucun service distant n'est requis.

---

# Objectif final

À terme, AgroFlux Studio devra devenir l'unique outil de conception fonctionnelle du projet.

Le backend, Flutter et les autres composants devront uniquement interpréter les artefacts produits par le Studio.

Le Studio devient ainsi la source unique de vérité pour :

- la navigation
- les ressources
- les contrats JSON
- les assets
- les validations
- les publications