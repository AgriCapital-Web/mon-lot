# Mon Lot — feuille de route
Référence : docs/CAHIER_DES_CHARGES.md

## P0 — Données et sécurité
- [x] Retirer les terrains de démonstration des pages accueil et catalogue.
- [ ] Charger les fiches terrain depuis Supabase et supprimer la source statique de production.
- [ ] Vérifier RLS sur une base de test (visiteur, utilisateur, administrateur).
- [ ] Vérifier les variables Vercel/Lovable sans exposer les secrets.

## P1 — Réservation et contact
- [ ] Créer le formulaire de réservation prérempli depuis une fiche.
- [ ] Brancher submitReservationRequest et gérer succès/erreur.
- [ ] Revalider publication/disponibilité côté serveur.
- [ ] Ajouter protection anti-spam et validation téléphone.
- [ ] Tester persistance des demandes et accusés de réception.

## P2 — Administration
- [ ] Créer connexion, déconnexion et récupération de mot de passe.
- [ ] Créer le tableau de bord.
- [ ] Créer CRUD terrains, publication, statut, vedette et priorité.
- [ ] Gérer les demandes de réservation et de contact.
- [ ] Vérifier les droits utilisateur/admin.

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
