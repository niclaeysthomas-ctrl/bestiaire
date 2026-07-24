# BESTIAIRE

Un carnet de terrain gamifié. Une espèce par jour, à révéler ; une collection de cartes à
compléter ; des dossiers thématiques ; un quiz quotidien qui révise ce qui a déjà été vu.

Conçu pour un lecteur de 14 ans qui connaît déjà bien les animaux : le vocabulaire scientifique
n'est pas dilué, il est défini au moment où il apparaît.

## Contenu

| | |
|---|---|
| Espèces | 96 — 35 mammifères, 17 oiseaux, 9 reptiles, 5 amphibiens, 12 poissons, 18 invertébrés |
| Faits de terrain | 449, chacun étiqueté **base**, **pointu** ou **expert** |
| Définitions de vocabulaire | 96, une par fiche |
| Questions écrites à la main | 240 |
| Questions générées | illimitées (comparaisons, taxonomie, « qui suis-je », statuts UICN) |
| Dossiers thématiques | 16 |

À raison d'une espèce par jour, il y a un peu plus de trois mois de contenu quotidien — puis les
modes d'entraînement libre restent ouverts indéfiniment.

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

- **Aujourd'hui** — carte face cachée à révéler (+10 ✦), fiche complète, carnet de notes libre.
- **Bestiaire** — les 96 cartes. Les non-découvertes sont des silhouettes ; les toucher donne des
  indices (groupe, régime, milieu, rareté) et permet de les mettre en tête de file sans dévoiler
  leur nom. On peut aussi prioriser un groupe entier.
- **Dossiers** — 16 enquêtes transversales, chacune close par trois questions.
- **Quiz** — le quiz du jour (6 questions : l'espèce du jour, deux révisions, des questions
  générées) plus trois modes libres : Révision, Duel des chiffres, Mêlée générale.
- **Profil** — rang, série, progression par groupe, 22 badges, export/import de la sauvegarde.

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
app.js                état, sélection quotidienne, moteur de quiz, badges
data-animaux-1.js     mammifères
data-animaux-2.js     oiseaux, reptiles, amphibiens
data-animaux-3.js     poissons, invertébrés
data-dossiers.js      dossiers thématiques
sw.js                 cache hors ligne (stale-while-revalidate : se met à jour tout seul)
```

## Ajouter une espèce

Ajouter une entrée dans un des `data-animaux-*.js`. Le format est documenté en tête du fichier 1.
Rien d'autre à toucher : la file quotidienne, la grille, les filtres, les badges et le générateur
de questions se recalculent à partir des données.

Contraintes : `bio` doit être un des biomes connus (ils déterminent la couleur de la carte),
`rar` va de 1 à 5, chaque fait porte un niveau `base` / `pointu` / `expert`, et chaque question
a exactement quatre choix avec une explication.

## Sauvegarde

Tout est en `localStorage`, sur l'appareil, sans compte ni réseau. **Profil → Exporter** produit
un fichier JSON à réimporter en cas de changement de téléphone.
