# Guide de Conception de Flux - AgroFlux Bénin

Ce guide explique comment structurer efficacement votre arbre de navigation dans le **Flow Editor** pour offrir la meilleure expérience aux revendeuses de produits agricoles.

---

## 1. MENU vs FILTER : Quand choisir quoi ?

### Utiliser un MENU (Options)
*   **Quand :** Vous avez un petit nombre de choix fixes (2 à 5) qui ne changent jamais.
*   **Pourquoi :** Chaque option peut avoir un fichier audio spécifique ("Appuyez sur 1 pour le Maïs"). C'est idéal pour la navigation structurelle.
*   **Exemple :** Choix de la langue, Choix entre "Prix du jour" et "Jours de marché".

### Utiliser un FILTER
*   **Quand :** Vous avez une liste longue, dynamique ou hiérarchique (données provenant d'une base de données).
*   **Pourquoi :** Évite de créer 50 nœuds manuellement. Le filtre permet de passer d'un niveau à l'autre (ex: Département -> Commune) de manière fluide.
*   **Exemple :** Liste des 77 communes du Bénin, liste de 40 types de tubercules.

---

## 2. Cas d'Usage Modèles

### Cas A : Le Parcours Express (Menu Direct)
*Idéal pour les informations les plus consultées.*

1.  **Niveau 1 (MENU) :** Accueil ("Bienvenue. Pour les céréales, tapez 1. Pour les tubercules, tapez 2.")
2.  **Niveau 2 (RESULTS) :** Affiche directement les prix moyens nationaux de la catégorie choisie.
*   **Pourquoi ?** Réduit le nombre de clics pour l'utilisateur qui veut une info globale rapide.

### Cas B : La Recherche par Localité (Menu -> Filtre)
*Le cas classique pour trouver un prix local.*

1.  **Niveau 1 (MENU) :** Choisir "Prix par Marché".
2.  **Niveau 2 (FILTER) :** Sélection du Département (ex: Borgou).
3.  **Niveau 3 (FILTER) :** Sélection de la Commune (ex: Parakou).
4.  **Niveau 4 (RESULTS) :** Affiche les prix pratiqués sur les marchés de Parakou.
*   **Pourquoi ?** Utiliser des filtres ici permet de gérer facilement toutes les communes sans surcharger le graphique visuel.

### Cas C : Le Filtrage par Produit (Menu -> Menu -> Filtre)
*Pour une précision maximale sur les variétés.*

1.  **Niveau 1 (MENU) :** Sélection "Céréales".
2.  **Niveau 2 (MENU) :** Sélection "Maïs".
3.  **Niveau 3 (FILTER) :** Sélection de la variété (Maïs Blanc, Maïs Jaune, Maïs Séché).
4.  **Niveau 4 (RESULTS) :** Prix spécifiques à la variété.
*   **Pourquoi ?** On utilise un MENU pour les grandes catégories (Céréales/Maïs) car on veut des icônes et des audios très clairs, puis un FILTER pour les variétés qui peuvent varier selon les saisons.

---

## 3. Conseils pour une bonne organisation

1.  **Profondeur Maximum :** Essayez de ne pas dépasser 4 niveaux avant d'arriver au résultat. Au-delà, l'utilisateur risque de s'égarer.
2.  **Nomenclature des IDs :** Utilisez des préfixes clairs :
    *   `m_` pour les menus (ex: `m_main_welcome`)
    *   `f_` pour les filtres (ex: `f_communes_borgou`)
    *   `r_` pour les résultats (ex: `r_price_maize`)
3.  **Audit Visuel :** Utilisez le bouton **"Réorganiser"** régulièrement. Si les traits se croisent trop, c'est peut-être que votre logique de `next` est trop complexe et qu'un **FILTER** serait plus approprié qu'un **MENU** géant.

---

## 4. Contrôler l'affichage des options (actif / « Tout »)

Chaque valeur de variable et chaque clé/valeur de HashMap peut être marquée **inactive** sans être supprimée (icône œil dans les Gestionnaires de Variables/HashMaps). C'est utile pour préparer un contenu à l'avance sans encore l'exposer aux utilisateurs finaux — par exemple déclarer un nouveau produit ou un nouveau marché dans le Studio bien avant sa sortie officielle.

**Important :** marquer une valeur inactive ne change rien tout seul. C'est le nœud `grid`/`pre_filter` qui décide, via la case **"N'afficher que les options actives"** (`controle_active`), s'il respecte cet état ou non :

*   **Case décochée (par défaut) :** le nœud affiche toutes les valeurs, actives ou non — comportement identique à avant l'existence de cette fonctionnalité. Rien ne casse sur les flows existants.
*   **Case cochée :** le nœud ne proposera à l'utilisateur que les valeurs actives de sa variable/HashMap source. Pratique pour un menu grand public pendant qu'un catalogue complet reste géré en coulisses dans le Studio.

L'autre case, **"Autoriser le choix « Tout »"** (`can_choix_all`), est indépendante : elle indique que l'utilisateur doit pouvoir sélectionner « Tout » en plus de la liste (par exemple "tous les départements"), sans avoir besoin d'ajouter une valeur artificielle du type `tout_les_departements` directement dans la variable.

**Quand cocher `controle_active` ?**
*   Menu grand public où vous voulez limiter l'affichage à un sous-ensemble validé (ex. phase pilote sur certains départements seulement), pendant que le catalogue complet reste développé dans le Studio pour la suite.
*   Filtre interne (`pre_filter`) qui ne doit exposer que des clés déjà "prêtes" (ressources audio/image disponibles et validées), sans bloquer la préparation des autres en amont.

**Quand ne pas la cocher :**
*   Tant que le contenu n'a pas besoin d'être restreint — la case décochée reproduit exactement le comportement historique du flow.
