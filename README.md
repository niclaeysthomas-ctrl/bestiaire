# BESTIAIRE

Un carnet de terrain gamifié. Une espèce par jour, à révéler ; une collection de cartes à
compléter ; des dossiers thématiques ; un quiz quotidien qui révise ce qui a déjà été vu.

Conçu pour un lecteur de 14 ans qui connaît déjà bien les animaux : le vocabulaire scientifique
n'est pas dilué, il est défini au moment où il apparaît.

## Contenu

| | |
|---|---|
| Espèces | 175 — 50 mammifères, 32 oiseaux, 18 reptiles, 11 amphibiens, 24 poissons, 40 invertébrés |
| Faits de terrain | 837, chacun étiqueté **base**, **pointu** ou **expert** |
| Définitions de vocabulaire | 175, une par fiche |
| Questions écrites à la main | 413 |
| Questions générées | illimitées (comparaisons, taxonomie, « qui suis-je », statuts UICN) |
| Dossiers thématiques | 21 |

À raison d'une espèce par jour, il y a près de six mois de contenu quotidien — et bien moins si
les expéditions sont utilisées. Les modes d'entraînement libre restent ouverts indéfiniment.

## Principes de contenu

- **Trois niveaux d'information par fiche.** `base` : le fait qu'on retient. `pointu` : le
  mécanisme. `expert` : l'étude, la controverse, ce qui n'est pas dans les documentaires.
- **Les faits faux célèbres sont traités comme du contenu.** Le mâle alpha du loup, les bactéries
  du dragon de Komodo, les 105 °C du ver de Pompéi, la vision « supérieure » de la crevette-mante,
  le tardigrade indestructible : chacun est corrigé explicitement, avec la raison pour laquelle
  l'erreur circule encore. Le dossier *Records du vivant* enseigne le réflexe : qui a mesuré,
  comment, quelqu'un a-t-il refait la mesure.
- **Aucun spoiler.** Une question de quiz ne porte jamais sur une espèce non découverte. Les
  espèces inconnues n'apparaissent que comme noms leurres.

## Écrans

- **Aujourd'hui** — carte face cachée à révéler (+10 ✦), fiche complète, carnet de notes libre,
  puis le bloc **Expédition**.
- **Expédition** — une fois la carte du jour révélée, on peut découvrir autant d'espèces
  supplémentaires qu'on veut, à la demande (+4 ✦ chacune). Elles entrent dans le bestiaire, les
  badges et les quiz exactement comme la carte du jour. Le rituel quotidien reste distinct : la
  série ne dépend que de lui, et il rapporte davantage. On peut aussi partir d'une carte
  verrouillée précise et la découvrir immédiatement.
- **Bestiaire** — les 96 cartes. Les non-découvertes sont des silhouettes ; les toucher donne des
  indices (groupe, régime, milieu, rareté) et permet de les mettre en tête de file sans dévoiler
  leur nom. On peut aussi prioriser un groupe entier.
- **Dossiers** — 21 enquêtes transversales, chacune close par trois questions.
- **Lexique** — les 175 mots de vocabulaire en répétition espacée (SM-2), même moteur et mêmes
  quatre notes que 990 et CUMBRE. Un mot n'entre dans le paquet que lorsque l'espèce qui
  l'enseigne a été découverte. Rythme réglable : 3, 6, 10 ou 20 nouveaux mots par jour ; les
  révisions ne sont jamais plafonnées.
- **Quiz** — le quiz du jour (6 questions : l'espèce du jour, deux révisions, des questions
  générées) plus trois modes libres : Révision, Duel des chiffres, Mêlée générale.
- **Profil** — rang, série, part de cartes du jour et d'expéditions, mots vus et acquis,
  progression par groupe, 31 badges, export/import de la sauvegarde.

### Le moteur du lexique

SM-2 classique, avec deux garde-fous ajoutés après mesure :

- **« Difficile » doit gagner au moins un jour.** Sans ça, `1 × 1,2` arrondit à 1 et une carte
  jugée difficile reste bloquée à un jour pour toujours.
- **Plafond à un an.** Sans ça, quelques « Facile » d'affilée envoient une carte à neuf ans,
  c'est-à-dire hors du lexique pour de bon.

Courbes obtenues, en partant d'une carte neuve : « Bien » → 1, 3, 8, 20, 50, 125, 313, 365 j ;
« Facile » → 4, 14, 51, 196, 365 j ; « Difficile » → 1, 2, 3, 4, 5, 6 j. Un mot est compté
**acquis** à partir d'un intervalle de 21 jours.

## En ligne

**https://niclaeysthomas-ctrl.github.io/bestiaire/**

Sur téléphone, « Ajouter à l'écran d'accueil » installe la PWA : plein écran, hors ligne, et la
progression est stockée durablement sur l'appareil.

## Lancer en local

```bash
cd ~/bestiaire && python3 -m http.server 8127
```

## Fichiers

```
index.html            structure
style.css             thème (carnet de terrain nocturne)
app.js                état, file de découverte, expéditions, moteur de quiz, badges
data-animaux-1.js     mammifères
data-animaux-2.js     oiseaux, reptiles, amphibiens
data-animaux-3.js     poissons, invertébrés
data-animaux-4.js     mammifères et oiseaux (suite)
data-animaux-5.js     reptiles, amphibiens, poissons (suite)
data-animaux-6.js     invertébrés (suite)
data-dossiers.js      dossiers thématiques
data-dossiers-2.js    dossiers thématiques (suite)
sw.js                 cache hors ligne (stale-while-revalidate : se met à jour tout seul)
```

Les fichiers de données s'ajoutent les uns aux autres (`concat`) : l'ordre n'a pas d'importance,
seule compte leur présence dans `index.html` et dans la liste de `sw.js`.

## Ajouter une espèce

Ajouter une entrée dans un des `data-animaux-*.js`, ou créer un `data-animaux-7.js` sur le même
modèle et le déclarer aux deux endroits ci-dessus. Le format est documenté en tête du fichier 1.
Rien d'autre à toucher : la file quotidienne, la grille, les filtres, les badges et le générateur
de questions se recalculent à partir des données.

Contraintes : `bio` doit être un des biomes connus (ils déterminent la couleur de la carte),
`rar` va de 1 à 5, chaque fait porte un niveau `base` / `pointu` / `expert`, et chaque question
a exactement quatre choix avec une explication.

## Sauvegarde

Tout est en `localStorage`, sur l'appareil, sans compte ni réseau. **Profil → Exporter** produit
un fichier JSON à réimporter en cas de changement de téléphone.
