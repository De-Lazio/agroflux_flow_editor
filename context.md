Je pense que tu tiens quelque chose de beaucoup plus ambitieux qu'un simple "éditeur de flow".

En regardant le JSON que tu m'as partagé, on comprend que le Flow Editor n'est pas un simple outil de création d'écrans, mais le moteur de conception fonctionnelle de toute la plateforme AgroFlux. Il décrit les parcours utilisateurs, les règles de navigation, les interactions avec le backend, les contrats des réponses API, ainsi que les ressources multimédias nécessaires (audio, images, etc.).

À mon avis, c'est cette idée qu'il faut transmettre aux développeurs qui vont rejoindre le projet.

PRÉSENTATION DU PROJET AGROFLUX
Document d'introduction pour les développeurs du Flow Editor
AgroFlux Bénin
Présentation générale

AgroFlux Bénin est une plateforme numérique destinée à améliorer l'accès aux informations sur les marchés agricoles béninois.

Le projet centralise les données de marché collectées directement sur le terrain (prix, marchés, calendrier d'animation, disponibilité des produits, tendances des prix, etc.) afin de les rendre accessibles sous différentes formes :

application mobile grand public ;
plateforme web ;
API publique ;
navigation audio multilingue en langues locales (Fon, Yoruba, Dendi et Adja).

L'objectif est de rendre ces informations compréhensibles aussi bien pour un producteur agricole peu alphabétisé que pour une institution publique ou un chercheur.

Les différents composants du projet

Le système AgroFlux est constitué de plusieurs applications complémentaires.

1. Backend

Le backend constitue le cœur de la plateforme.

Il est responsable de :

la gestion des données agricoles ;
la collecte des prix ;
la gestion des marchés ;
la gestion des utilisateurs ;
la génération des réponses API ;
la génération des séquences audio dynamiques.
2. Application Mobile de Collecte

Utilisée par les agents de terrain.

Elle permet notamment :

la saisie des prix ;
la consultation des marchés assignés ;
la synchronisation avec le serveur ;
le suivi des soumissions.
3. Dashboard Administration & Supervision

Permet :

l'administration des données ;
la validation des informations collectées ;
le suivi des agents terrain ;
le contrôle qualité des données.
4. Application Mobile AgroFlux

Application destinée aux utilisateurs finaux.

Elle permet notamment :

rechercher où acheter un produit ;
rechercher où vendre un produit ;
connaître les marchés animés ;
consulter les calendriers d'animation ;
consulter les tendances des prix ;
écouter toutes ces informations en langues locales.

Cette application ne contient pratiquement aucune logique métier.

Elle interprète les réponses produites par le backend.

Le rôle du Flow Editor

Le Flow Editor est le composant stratégique de l'ensemble du projet.

Il ne s'agit pas d'un simple éditeur graphique.

Il constitue le langage fonctionnel utilisé pour décrire la totalité des parcours utilisateurs de l'application AgroFlux.

Autrement dit :

Le Flow Editor décrit comment l'application doit fonctionner.

Pourquoi le Flow Editor est-il aussi important ?

Sans Flow Editor :

aucune navigation audio ;
aucune génération dynamique des réponses ;
aucune cohérence entre le backend et le mobile ;
aucune automatisation de la production des ressources.

Le Flow Editor est donc la source de vérité de toute la navigation de l'application.

Ce que décrit un Flow

Un Flow décrit entièrement un parcours utilisateur.

Par exemple :

Je souhaite acheter du maïs dans le département du Zou.

Le Flow décrit :

les différentes questions posées à l'utilisateur ;
les choix possibles ;
les transitions entre les écrans ;
les appels API nécessaires ;
les paramètres transmis ;
le type de réponse attendu ;
la manière dont cette réponse sera restituée à l'utilisateur.

Le backend exécute ce contrat.

L'application Flutter l'interprète.

Le Flow Editor permet de le concevoir.

Ce que produit le Flow Editor

À partir d'une modélisation graphique, le Flow Editor génère un document JSON structuré qui décrit entièrement le comportement du parcours utilisateur. Ce document contient notamment :

la configuration générale du flow ;
le point d'entrée du parcours ;
les nœuds de navigation ;
les transitions entre les nœuds ;
les paramètres attendus ;
les appels aux API ;
les contrats des réponses API ;
les références vers les ressources multimédias ;
les commentaires techniques associés.

Le JSON généré devient directement exploitable par le backend et par l'application mobile.

Les types de nœuds

Le moteur repose sur plusieurs types de nœuds spécialisés.

Parmi eux :

Root
Grid
Result
Calendar
Pre Filter

Chaque type possède un comportement précis et un contrat bien défini.

Le moteur Flutter interprète ces nœuds pour construire dynamiquement les interfaces utilisateur.

Chaque valeur de variable et chaque clé/valeur de HashMap peut aussi être marquée active ou inactive, sans jamais être supprimée du Studio (qui continue d'exposer l'intégralité du contenu développé, y compris en phase pilote). Les nœuds Grid et Pre-Filter déclarent, indépendamment, s'ils doivent respecter cet état à l'affichage (`controle_active`) et s'ils doivent proposer un choix « Tout » (`can_choix_all`). C'est le backend et l'application Flutter qui appliquent réellement ce filtrage à l'exécution.

Relation entre les différents composants
                Flow Editor
                     │
                     ▼
          Génération du Flow JSON
                     │
      ┌──────────────┴──────────────┐
      ▼                             ▼
Backend API                Application Flutter
      │                             │
      └──────────────┬──────────────┘
                     ▼
              Utilisateur final

Le Flow Editor n'est donc pas une application indépendante.

Il pilote indirectement :

le backend ;
l'application Flutter ;
la navigation utilisateur ;
les réponses API.
Philosophie du projet

Le code métier ne doit jamais être dupliqué.

Les parcours utilisateurs doivent être décrits une seule fois dans le Flow Editor.

Les applications (backend et Flutter) doivent interpréter cette description plutôt que réimplémenter les mêmes règles.

Cette approche permet :

une meilleure maintenabilité ;
une évolution rapide des parcours ;
une réduction des régressions ;
une cohérence entre toutes les plateformes.
État actuel du projet

Aujourd'hui :

le backend est largement développé ;
l'application de collecte est opérationnelle ;
le tableau de bord d'administration est en cours de finalisation ;
le système de supervision est développé ;
l'API publique est en cours de préparation.

Le Flow Editor est fonctionnel dans sa structure générale mais plusieurs éléments restent à finaliser.

Les principaux travaux attendus concernent notamment :

la finalisation des routes et des transitions entre les nœuds ;
la validation complète des contrats JSON générés ;
la génération des références vers les ressources nécessaires (audios, images et autres assets) ;
les derniers ajustements permettant une intégration complète avec le backend et l'application Flutter.
Objectif du développement

L'objectif n'est pas uniquement de terminer une interface graphique.

Le véritable objectif est de construire un moteur de conception robuste qui deviendra le point central de l'écosystème AgroFlux.

Une fois le Flow Editor stabilisé, il permettra :

de concevoir de nouveaux parcours sans modifier le code de l'application mobile ;
d'assurer une parfaite cohérence entre le backend et le frontend ;
de faciliter la production des ressources multimédias ;
d'accélérer considérablement l'évolution future de la plateforme.


exemple du json flow actuel : 
{
  "version": "1.0",
  "entry": "root",
  "config": {
    "audio": {
      "auto_play_prompt": true,
      "auto_play_option": true,
      "pause_between_ms": 600
    }
  },
  "variables": {
    "produits": [
      "mais",
      "soja"
    ],
    "departements": [
      "oueme",
      "plateau",
      "zou",
      "collines",
      "mono",
      "couffo",
      "atlantique",
      "litoral",
      "borgou",
      "alibori",
      "atacora",
      "donga"
    ],
    "x_anime_x": [
      "aujourdhui",
      "demain",
      "apres_demain",
      "dans_trois_jours",
      "dans_quatre_jours",
      "hier",
      "avant_hier",
      "trois_jours passe",
      "quatre_jours passe",
      "cinq_jours passe"
    ],
    "periode": [
      "aujourdhui",
      "cette_semaine",
      "ce_mois",
      "trois_derniers_mois",
      "six_derniers_mois",
      "cette_annee"
    ],
    "marches_suivis": [
      "ikpinle",
      "ketou",
      "parakou",
      "glazoue",
      "save",
      "malanville",
      "kpedekpo"
    ],
    "type_info_marche": [
      "resume_rapide",
      "presentation_du_marche",
      "produits_disponibles",
      "calendrier_animation",
      "opportunite_marche"
    ],
    "departements_et_tout": [
      "tout_les_departements",
      "oueme",
      "plateau",
      "zou",
      "colline"
    ]
  },
  "hashmaps": {
    "marche_par_departement": {
      "oueme": [
        "ouando",
        "adjohoun",
        "gbada",
        "bonou"
      ],
      "plateau": [
        "takon",
        "sakete",
        "ketou"
      ]
    }
  },
  "audio_mappings": {
    "produit": "produits/",
    "departement": "localites/",
    "marche": "marches/",
    "periode": "periode/"
  },
  "dynamic_audio": {},
  "nodes": {
    "root": {
      "type": "root",
      "audio_prompt": "intro/root.mp3",
      "options": [
        {
          "id": "achete_produit",
          "next": "achete_produit"
        },
        {
          "id": "vendre_produit",
          "next": "vendre_produit"
        },
        {
          "id": "marche_anime_x",
          "next": "marche_anime_x"
        },
        {
          "id": "marche_anime_calendrier",
          "next": "anime_calendrier_calendrier"
        },
        {
          "id": "infos_march",
          "next": "infos_marche_departement"
        },
        {
          "id": "explorer_produit",
          "next": "explorer_produit_produit"
        }
      ]
    },
    "achete_produit": {
      "type": "grid",
      "audio_prompt": "questions/achete_produit.mp3",
      "options_source": "produits",
      "set": "produits",
      "next": "acheter_result",
      "audio": {
        "type": "sequence",
        "key": "achete_produit_intro",
        "sequence": [
          "intro/achete_produit_intro.pm3"
        ],
        "fallback": "intro/default.mp3"
      },
      "comment": "Noeud de démarage du flow acheter un produit.\n\nCe noeud permet de choisir le produit à acheter."
    },
    "vendre_produit": {
      "type": "grid",
      "audio_prompt": "questions/vendre_produit.mp3",
      "options_source": "produits",
      "set": "produits",
      "next": "vendre_result",
      "audio": {
        "type": "sequence",
        "key": "vendre_produit_intro",
        "sequence": [
          "intro/vendre_produit_intro.mp3"
        ],
        "fallback": "intro/default.mp3"
      },
      "comment": "Noeud de démarage du flow vendre un produit.\n\nCe noeud permet de choisir le produit à vendre."
    },
    "marche_anime_x": {
      "type": "grid",
      "audio_prompt": "questions/marche_anime_x.mp3",
      "options_source": "x_anime_x",
      "set": "",
      "next": "anime_x_departement"
    },
    "acheter_result": {
      "type": "result",
      "data_source": {
        "endpoint": "api/app/acheter_produit",
        "params": [
          "produit",
          "departement"
        ]
      },
      "audio_sequence": [],
      "comment": "{\n  \"type\": \"audio_sequence\",\n  \"language\": \"fon\",\n\n  \"sequence\": [\n\n    /* ================= INTRO ================= */\n\n    {\n      \"audios\": [\n        \"intro/vous_cherchez_acheter.mp3\",\n        \"produits/mais.mp3\",\n        \"intro/dans_departement.mp3\",\n        \"localites/atlantique.mp3\",\n        \"intro/meilleurs_prix_sont.mp3\"\n      ],\n      \"image\": \"images/intro/acheter.png\"\n    },\n\n    /* ================= MARCHÉ 1 ================= */\n\n    {\n      \"audios\": [\n        \"ordre/premier_marche.mp3\",\n        \"marches/bohicon.mp3\",\n        \"date/releve_le.mp3\",\n        \"date/2026_03_10.mp3\"\n      ],\n      \"image\": \"images/marches/bohicon.png\"\n    },\n\n    /* variété 1 */\n    {\n      \"audios\": [\n        \"produits/mais_local.mp3\",\n        \"phrases/est_a.mp3\",\n        \"prix/1000_fcfa.mp3\",\n        \"unites/kg.mp3\",\n        \"phrases/vendu_a.mp3\",\n        \"prix/5000_fcfa.mp3\",\n        \"unites/bassine_5kg.mp3\"\n      ],\n      \"image\": \"images/produits/mais_local_avec_unites.png\"\n    },\n\n    /* variété 2 */\n    {\n      \"audios\": [\n        \"produits/mais_blanc.mp3\",\n        \"phrases/est_a.mp3\",\n        \"prix/900_fcfa.mp3\",\n        \"unites/kg.mp3\",\n        \"phrases/vendu_a.mp3\",\n        \"prix/4500_fcfa.mp3\",\n        \"unites/bassine_5kg.mp3\"\n      ],\n      \"image\": \"images/produits/mais_blanc_avec_unites.png\"\n    },\n\n    /* ================= MARCHÉ 2 ================= */\n\n    {\n      \"audios\": [\n        \"ordre/deuxieme_marche.mp3\",\n        \"marches/abomey.mp3\",\n        \"date/releve_le.mp3\",\n        \"date/2026_03_09.mp3\"\n      ],\n      \"image\": \"images/marches/abomey.png\"\n    },\n\n    {\n      \"audios\": [\n        \"produits/mais_local.mp3\",\n        \"phrases/est_a.mp3\",\n        \"prix/950_fcfa.mp3\",\n        \"unites/kg.mp3\",\n        \"phrases/vendu_a.mp3\",\n        \"prix/4800_fcfa.mp3\",\n        \"unites/bassine_5kg.mp3\"\n      ],\n      \"image\": \"images/produits/mais_local_avec_unites.png\"\n    },\n\n    /* ================= MARCHÉ 3 ================= */\n\n    {\n      \"audios\": [\n        \"ordre/troisieme_marche.mp3\",\n        \"marches/dassa.mp3\",\n        \"date/releve_le.mp3\",\n        \"date/2026_03_08.mp3\"\n      ],\n      \"image\": \"images/marches/dassa.png\"\n    },\n\n    {\n      \"audios\": [\n        \"produits/mais_jaune.mp3\",\n        \"phrases/est_a.mp3\",\n        \"prix/920_fcfa.mp3\",\n        \"unites/kg.mp3\",\n        \"phrases/vendu_a.mp3\",\n        \"prix/4600_fcfa.mp3\",\n        \"unites/bassine_5kg.mp3\"\n      ],\n      \"image\": \"images/produits/mais_jaune_avec_unites.png\"\n    },\n\n    /* ================= CONSEIL ================= */\n\n    {\n      \"audios\": [\n        \"conseils/prix_bas_bonne_opportunite.mp3\",\n        \"conseils/ajouter_transport.mp3\",\n        \"conseils/comparer_qualite.mp3\"\n      ],\n      \"image\": \"images/icons/attention_transport.png\"\n    }\n  ]\n}",
      "json_response_contrat": "{\n  \"type\": \"audio_sequence\",\n  \"version\": \"1.0\",\n  \"sequence\": [\n    {\n      \"audios\": [\n        \"intro/vous_cherchez_acheter.mp3\",\n        \"{produit}\",\n        \"intro/dans_departement.mp3\",\n        \"{departement}\"\n      ],\n      \"image\": \"images/intro/acheter.png\"\n    },\n    {\n      \"audios\": [\n        \"ordre/premier_marche.mp3\",\n        \"marches/bohicon.mp3\",\n        \"{date:2026-03-10}\"\n      ],\n      \"image\": \"images/marches/bohicon.png\"\n    },\n    {\n      \"audios\": [\n        \"produits/mais_local.mp3\",\n        \"phrases/est_a.mp3\",\n        \"{prix:1000}\",\n        \"unites/kg.mp3\"\n      ],\n      \"image\": \"images/produits/mais_local.png\"\n    }\n  ],\n  \"meta\": {\n     \"auto_play\": true,\n    \"pause_ms\": 600\n  }\n}"
    },
    "vendre_result": {
      "type": "result",
      "data_source": {
        "endpoint": "api/app/vendre_produit",
        "params": [
          "produit",
          "departement"
        ]
      },
      "audio_sequence": [],
      "comment": "{\n  \"type\": \"audio_sequence\",\n  \"language\": \"fon\",\n\n  \"sequence\": [\n\n    /* ================= INTRO ================= */\n\n    {\n      \"audios\": [\n        \"intro/vous_cherchez_vendre.mp3\",\n        \"produits/mais.mp3\",\n        \"intro/dans_departement.mp3\",\n        \"localites/atlantique.mp3\",\n        \"intro/meilleurs_prix_vente.mp3\"\n      ],\n      \"image\": \"images/intro/vendre.png\"\n    },\n\n    /* ================= MARCHÉ 1 ================= */\n\n    {\n      \"audios\": [\n        \"ordre/premier_marche.mp3\",\n        \"marches/bohicon.mp3\",\n        \"date/releve_le.mp3\",\n        \"date/2026_03_10.mp3\"\n      ],\n      \"image\": \"images/marches/bohicon.png\"\n    },\n\n    /* variété 1 */\n    {\n      \"audios\": [\n        \"produits/mais_local.mp3\",\n        \"phrases/est_vendu_a.mp3\",\n        \"prix/1000_fcfa.mp3\",\n        \"unites/kg.mp3\",\n        \"phrases/soit.mp3\",\n        \"prix/5000_fcfa.mp3\",\n        \"unites/bassine_5kg.mp3\"\n      ],\n      \"image\": \"images/produits/mais_local_avec_unites.png\"\n    },\n\n    /* variété 2 */\n    {\n      \"audios\": [\n        \"produits/mais_blanc.mp3\",\n        \"phrases/est_vendu_a.mp3\",\n        \"prix/900_fcfa.mp3\",\n        \"unites/kg.mp3\",\n        \"phrases/soit.mp3\",\n        \"prix/4500_fcfa.mp3\",\n        \"unites/bassine_5kg.mp3\"\n      ],\n      \"image\": \"images/produits/mais_blanc_avec_unites.png\"\n    },\n\n    /* ================= MARCHÉ 2 ================= */\n\n    {\n      \"audios\": [\n        \"ordre/deuxieme_marche.mp3\",\n        \"marches/abomey.mp3\",\n        \"date/releve_le.mp3\",\n        \"date/2026_03_09.mp3\"\n      ],\n      \"image\": \"images/marches/abomey.png\"\n    },\n\n    {\n      \"audios\": [\n        \"produits/mais_local.mp3\",\n        \"phrases/est_vendu_a.mp3\",\n        \"prix/950_fcfa.mp3\",\n        \"unites/kg.mp3\",\n        \"phrases/soit.mp3\",\n        \"prix/4800_fcfa.mp3\",\n        \"unites/bassine_5kg.mp3\"\n      ],\n      \"image\": \"images/produits/mais_local_avec_unites.png\"\n    },\n\n    /* ================= MARCHÉ 3 ================= */\n\n    {\n      \"audios\": [\n        \"ordre/troisieme_marche.mp3\",\n        \"marches/dassa.mp3\",\n        \"date/releve_le.mp3\",\n        \"date/2026_03_08.mp3\"\n      ],\n      \"image\": \"images/marches/dassa.png\"\n    },\n\n    {\n      \"audios\": [\n        \"produits/mais_jaune.mp3\",\n        \"phrases/est_vendu_a.mp3\",\n        \"prix/920_fcfa.mp3\",\n        \"unites/kg.mp3\",\n        \"phrases/soit.mp3\",\n        \"prix/4600_fcfa.mp3\",\n        \"unites/bassine_5kg.mp3\"\n      ],\n      \"image\": \"images/produits/mais_jaune_avec_unites.png\"\n    },\n\n    /* ================= CONSEIL ================= */\n\n    {\n      \"audios\": [\n        \"conseils/prix_eleve_bonne_opportunite.mp3\",\n        \"conseils/ajouter_transport.mp3\",\n        \"conseils/vendre_maintenant_si_possible.mp3\"\n      ],\n      \"image\": \"images/icons/opportunity_transport.png\"\n    }\n  ]\n}"
    },
    "anime_x_departement": {
      "type": "grid",
      "audio_prompt": "questions/anime_x_departement.mp3",
      "options_source": "departements_et_tout",
      "set": "departements_et_tout",
      "next": "anime_x_result"
    },
    "anime_x_result": {
      "type": "result",
      "data_source": {
        "endpoint": "api/app/anime_x",
        "params": [
          "date",
          "departement"
        ]
      },
      "audio_sequence": [],
      "comment": "{\n  \"type\": \"audio_sequence\",\n  \"language\": \"fon\",\n\n  \"context\": {\n    \"date\": \"2026-03-10\",\n    \"departement\": \"Atlantique\",\n    \"filter_type\": \"single_department | all_departments\"\n  },\n\n  \"sequence\": [\n\n    /* ================= INTRO ================= */\n\n    {\n      \"audios\": [\n        \"intro/les_marches_actifs_sont.mp3\",\n        \"time/a_la_date.mp3\",\n        \"date/2026_03_10.mp3\"\n      ],\n      \"image\": \"images/calendar/date.png\"\n    },\n\n    {\n      \"audios\": [\n        \"location/dans_le_departement.mp3\",\n        \"localites/atlantique.mp3\"\n      ],\n      \"image\": \"images/localites/atlantique.png\"\n    },\n\n    /* ================= RESULT LIST ================= */\n\n    {\n      \"audios\": [\n        \"intro/liste_des_marches.mp3\"\n      ],\n      \"image\": null\n    },\n\n    /* ================= MARCHES ================= */\n\n    {\n      \"audios\": [\n        \"marches/bohicon.mp3\"\n      ],\n      \"image\": \"images/marches/bohicon.png\"\n    },\n\n    {\n      \"audios\": [\n        \"marches/porto_novo.mp3\"\n      ],\n      \"image\": \"images/marches/porto_novo.png\"\n    },\n\n    {\n      \"audios\": [\n        \"marches/abomey_calavi.mp3\"\n      ],\n      \"image\": \"images/marches/abomey_calavi.png\"\n    }\n\n  ]\n}"
    },
    "anime_calendrier_calendrier": {
      "type": "calendrier",
      "audio_prompt": "questions/date_anime_calendrier_calendrier.mp3",
      "periode": 7,
      "cadran": "centrer",
      "next": "anime_calendrier_departement"
    },
    "anime_calendrier_result": {
      "type": "result",
      "data_source": {
        "endpoint": "",
        "params": []
      },
      "audio_sequence": [],
      "comment": "{\n  \"type\": \"audio_sequence\",\n  \"language\": \"fon\",\n\n  \"context\": {\n    \"date\": \"2026-03-10\",\n    \"departement\": \"Atlantique\",\n    \"filter_type\": \"single_department | all_departments\"\n  },\n\n  \"sequence\": [\n\n    /* ================= INTRO ================= */\n\n    {\n      \"audios\": [\n        \"intro/les_marches_actifs_sont.mp3\",\n        \"time/a_la_date.mp3\",\n        \"date/2026_03_10.mp3\"\n      ],\n      \"image\": \"images/calendar/date.png\"\n    },\n\n    {\n      \"audios\": [\n        \"location/dans_le_departement.mp3\",\n        \"localites/atlantique.mp3\"\n      ],\n      \"image\": \"images/localites/atlantique.png\"\n    },\n\n    /* ================= RESULT LIST ================= */\n\n    {\n      \"audios\": [\n        \"intro/liste_des_marches.mp3\"\n      ],\n      \"image\": null\n    },\n\n    /* ================= MARCHES ================= */\n\n    {\n      \"audios\": [\n        \"marches/bohicon.mp3\"\n      ],\n      \"image\": \"images/marches/bohicon.png\"\n    },\n\n    {\n      \"audios\": [\n        \"marches/porto_novo.mp3\"\n      ],\n      \"image\": \"images/marches/porto_novo.png\"\n    },\n\n    {\n      \"audios\": [\n        \"marches/abomey_calavi.mp3\"\n      ],\n      \"image\": \"images/marches/abomey_calavi.png\"\n    }\n\n  ]\n}"
    },
    "infos_marche_departement": {
      "type": "grid",
      "audio_prompt": "questions/infos_marche_departement.mp3",
      "options_source": "departements",
      "set": "departements",
      "next": "explorer_produit_marche_filter"
    },
    "infos_marche_infos_type": {
      "type": "grid",
      "audio_prompt": "questions/infos_marche_infos_type.mp3",
      "options_source": "type_info_marche",
      "set": "type_info_marche",
      "next": "infos_marche_result"
    },
    "infos_marche_result": {
      "type": "result",
      "data_source": {
        "endpoint": "api/app/infos_marches",
        "params": [
          "marche",
          "info_type"
        ]
      },
      "audio_sequence": [
        "questions/infos_marche_result.mp3"
      ],
      "comment": "\"regle\": {\n  \"type\": \"hebdomadaire\",\n  \"valeur\": {\n    \"jours\": [2, 5]\n  }\n}\n\"regle\": {\n  \"type\": \"intervalle\",\n  \"valeur\": {\n    \"interval\": 4,\n    \"date_reference\": \"2026-03-01\"\n  }\n}\n\n\n\"regle\": {\n  \"type\": \"mensuel\",\n  \"valeur\": {\n    \"jours\": [5],\n    \"semaine\": 2\n  }\n}\n\n\n\n",
      "json_response_contrat": "{\n  \"type\": \"calendar\",\n  \"version\": \"1.0\",\n  \"data\": {\n    \"marche\": {\n      \"id\": 12,\n      \"nom\": \"takon\"\n    },\n\n    \"regle\": {\n      \"type\": \"hebdomadaire\",\n      \"valeur\": {\n        \"jours\": [2, 5]\n      }\n    },\n\n    \"description\": \"Marché tous les mardi et vendredi\",\n\n    \"intro\": [\n      \"intro/calendrier_marche.mp3\",\n      \"marches/takon.mp3\"\n    ],\n\n    \"outro\": [\n      \"frequence/hebdomadaire.mp3\"\n    ]\n  }\n}\n\n\n"
    },
    "explorer_produit_produit": {
      "type": "grid",
      "audio_prompt": "questions/explorer_produit_produit.mp3",
      "options_source": "produits",
      "set": "produits",
      "next": "explorer_produit_marche"
    },
    "explorer_produit_result": {
      "type": "result",
      "data_source": {
        "endpoint": "explorer_prix",
        "params": [
          "marche",
          "produit",
          "periode"
        ]
      },
      "audio_sequence": [
        "questions/explorer_produit_result.mp3"
      ],
      "comment": "🧠 🎯 Objectif du backend\n\nConstruire un moteur qui transforme des données de prix agricoles en narration audio structurée (JSON).\n\n⚙️ 🔥 GRANDES LIGNES À DONNER AU DEV\n1️⃣ Récupération des données\nInput API :\nproduit\nmarché\npériode (semaine, mois, 6 mois, etc.)\nRequête :\nrécupérer les prix historiques du produit dans le marché\ninclure toutes les variétés\ntrier par date croissante\n2️⃣ Structuration des données\nRegrouper les données par date\nÀ chaque date :\nliste des variétés\nprix + unité\n\n👉 Format interne attendu :\n\n[\n  {\n    \"date\": \"2026-01-10\",\n    \"varieties\": [...]\n  }\n]\n3️⃣ Filtrage intelligent des dates (CRUCIAL)\nNe garder que :\nla première date\nles dates où au moins un prix change\n\n👉 Règle :\n\ncomparer avec la date précédente\ndétecter changement par variété\n4️⃣ Calcul de tendance (🔺🔻➖)\nCalculer variation entre deux dates\nBasé sur prix moyen ou dominant\n\n👉 Règle simple :\n\nhausse → 🔺\nbaisse → 🔻\nstable → ➖\n\n👉 Ajouter seuil (~5%) pour éviter bruit\n\n5️⃣ Enrichissement (mapping assets)\n\nPour chaque élément récupérer :\n\naudio (clé fichier)\nimage associée\n\n👉 Exemple :\n\nproduit → produits/mais.mp3\nmarché → marches/takon.mp3\nunité → unites/kg.mp3\n6️⃣ Génération de la séquence audio\n\nConstruire un JSON structuré avec :\n\n🔹 INTRO\nphrase complète :\nhistorique + produit + marché + période\n🔹 POUR CHAQUE DATE\nBloc date\naudio date\nvariation (sauf première date)\nBloc variétés\npour chaque variété :\nnom\nprix\nunité\n7️⃣ Gestion des cas réels (IMPORTANT)\n\nLe backend doit gérer :\n\n1 seule variété → simple\nplusieurs variétés → boucle\ndonnées manquantes → ignorer proprement\nunités différentes → cohérence obligatoire\n8️⃣ Génération dynamique des audios\n\nLe backend doit pouvoir générer :\n\n📅 dates → date/YYYY_MM_DD.mp3\n💰 prix → prix/XXXX_fcfa.mp3\n📊 variation → variation/hausse.mp3\n9️⃣ Génération du conseil final (IA simple)\n\nBasé sur tendance globale :\n\nhausse → conseil vendre / attendre\nbaisse → conseil acheter\nstable → conseil neutre\n\n\n{\n  \"type\": \"audio_sequence\",\n  \"language\": \"fon\",\n\n  \"sequence\": [\n\n    /* ================= INTRO ================= */\n\n    {\n      \"audios\": [\n        \"intro/historique_prix.mp3\",\n        \"produits/mais.mp3\",\n        \"intro/dans_marche.mp3\",\n        \"marches/takon.mp3\",\n        \"periode/six_derniers_mois.mp3\"\n      ],\n      \"image\": \"images/intro/historique.png\"\n    },\n\n    /* ================= DATE 1 ================= */\n\n    {\n      \"audios\": [\n        \"date/2026_01_10.mp3\"\n      ],\n      \"image\": null\n    },\n\n    {\n      \"audios\": [\n        \"produits/mais_blanc.mp3\",\n        \"phrases/est_a.mp3\",\n        \"prix/5000_fcfa.mp3\",\n        \"unites/bassine_10kg.mp3\"\n      ],\n      \"image\": \"images/produits/mais_blanc.png\"\n    },\n\n    {\n      \"audios\": [\n        \"produits/mais_local.mp3\",\n        \"phrases/est_a.mp3\",\n        \"prix/8000_fcfa.mp3\",\n        \"unites/bassine_10kg.mp3\"\n      ],\n      \"image\": \"images/produits/mais_local.png\"\n    },\n\n    /* ================= DATE 2 ================= */\n\n    {\n      \"audios\": [\n        \"date/2026_01_20.mp3\",\n        \"variation/hausse.mp3\"\n      ],\n      \"image\": \"images/icons/hausse.png\"\n    },\n\n    {\n      \"audios\": [\n        \"produits/mais_blanc.mp3\",\n        \"phrases/est_a.mp3\",\n        \"prix/6000_fcfa.mp3\",\n        \"unites/bassine_10kg.mp3\"\n      ],\n      \"image\": \"images/produits/mais_blanc.png\"\n    },\n\n    {\n      \"audios\": [\n        \"produits/mais_local.mp3\",\n        \"phrases/est_a.mp3\",\n        \"prix/9000_fcfa.mp3\",\n        \"unites/bassine_10kg.mp3\"\n      ],\n      \"image\": \"images/produits/mais_local.png\"\n    },\n\n    /* ================= CONSEIL IA ================= */\n\n    {\n      \"audios\": [\n        \"conseils/tendance_hausse.mp3\",\n        \"conseils/attendre_peut_etre.mp3\"\n      ],\n      \"image\": \"images/icons/trend_up.png\"\n    }\n  ]\n}"
    },
    "explorer_produit_periode": {
      "type": "grid",
      "audio_prompt": "questions/explorer_produit_periode.mp3",
      "options_source": "periode",
      "set": "periode",
      "next": "explorer_produit_result"
    },
    "anime_calendrier_departement": {
      "type": "grid",
      "audio_prompt": "questions/anime_calendrier_departement.mp3",
      "options_source": "departements_et_tout",
      "set": "departements_et_tout",
      "next": "anime_calendrier_result"
    },
    "explorer_produit_marche": {
      "type": "grid",
      "audio_prompt": "questions/explorer_produit_marche.mp3",
      "options_source": "marches_suivis",
      "set": "marches_suivis",
      "next": "explorer_produit_periode"
    },
    "explorer_produit_marche_filter": {
      "type": "pre_filter",
      "audio_prompt": "questions/filtre.mp3",
      "cles": [
        "produits"
      ],
      "filtre_source": "marche_par_departement",
      "next": "infos_marche_infos_type",
      "cle": "departements"
    }
  }
}