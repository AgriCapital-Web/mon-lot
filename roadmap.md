# Mon Lot — feuille de route
Référence : docs/CAHIER_DES_CHARGES.md

## P0 — Données et sécurité
- [x] Retirer les terrains de démonstration des pages accueil et catalogue.
- [x] Charger les fiches terrain depuis Supabase et supprimer la source statique de production.
- [ ] Vérifier RLS sur une base de test (visiteur, utilisateur, administrateur) après la migration de correction.
- [x] Mettre à niveau TanStack Start et aligner les dépendances de store ; build Vercel validé.
- [ ] Vérifier les variables Vercel/Lovable sans exposer les secrets.

## P1 — Réservation et contact
- [x] Créer le formulaire de réservation prérempli depuis une fiche.
- [x] Brancher submitReservationRequest et gérer succès/erreur.
- [x] Revalider publication/disponibilité côté serveur.
- [ ] Ajouter protection anti-spam et validation téléphone.
- [ ] Tester persistance des demandes et accusés de réception.

## P2 — Administration
- [x] Créer connexion et déconnexion administrateur (récupération de mot de passe à compléter).
- [x] Créer le premier tableau de bord administrateur.
- [x] Créer le CRUD terrains, publication, statut, vedette et priorité (gestion des médias à compléter).
- [x] Gérer les demandes de réservation et de contact par statut.
- [ ] Tester les droits utilisateur/admin sur des comptes réels.

## P3 — Médias, notifications et IA
- [ ] Finaliser upload, stockage et galerie.
- [ ] Finaliser le parcours UI de recommandations IA.
- [ ] Configurer et tester les emails transactionnels.
- [ ] Finaliser SEO, favicon, image sociale et accessibilité.

## P4 — Recette
- [ ] Tests unitaires des formules et arrondis.
- [ ] Tests intégration des Server Functions et RLS.
- [ ] Tests E2E accueil, catalogue, fiche, réservation, contact et administration.
- [ ] Vérifications mobile, tablette, desktop et navigateurs.
- [ ] Build, lint, variables d’environnement et déploiement Vercel.
