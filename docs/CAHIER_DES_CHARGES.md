# Cahier des charges fonctionnel et technique — Mon Lot
Version consolidée 1.1 — 8 novembre 2026

## 1. Objet et principes
Mon Lot est une plateforme web de présentation et de commercialisation de terrains en Côte d’Ivoire. Le site public présente les offres réelles, leurs caractéristiques, les formules de paiement et permet de transmettre des demandes. Un espace privé doit permettre aux administrateurs de gérer le catalogue et les demandes.

Principes obligatoires :
- Aucune offre, référence, localisation, superficie, photo ou prix fictif ne doit être présenté comme réel.
- La base de données est la source de vérité du catalogue et des demandes.
- Une demande n’est ni une vente ni une attribution automatique du terrain.
- Les contrôles d’accès doivent être appliqués côté serveur et dans PostgreSQL via RLS.
- Interface française, mobile-first, accessible, cohérente avec l’identité Mon Lot (vert, sable, anthracite).

## 2. Acteurs et habilitations
| Acteur | Droits attendus |
|---|---|
| Visiteur | Consulter les terrains publiés, simuler les paiements, envoyer une demande de contact ou réservation. |
| Utilisateur authentifié | Gérer son profil ; aucun accès aux demandes d’autrui. |
| Administrateur | Gérer terrains, publication, statut, vedette, demandes et profil. |
| Serveur | Valider les données et exécuter les opérations autorisées sans exposer de secret au navigateur. |

L’attribution du rôle administrateur doit être faite par une procédure maîtrisée. Aucun formulaire public ne doit permettre de s’accorder le rôle admin.

## 3. Parcours publics
### Accueil — /
- Présentation de Mon Lot, proposition de valeur et appels à l’action vers catalogue/contact.
- Terrains disponibles mis en vedette, triés par priorité puis date de publication.
- Si aucune offre réelle n’est publiée, afficher un état vide commercial propre ; ne jamais injecter des données de démonstration.

### Catalogue — /terrains
- Lire uniquement les terrains publiés depuis la base.
- Recherche par référence, titre, zone et ville ; filtres ville et statut.
- État vide clair si aucune offre n’est publiée.
- Chaque carte renvoie vers la fiche de la référence enregistrée.

### Fiche terrain — /terrains/:reference
- Charger le terrain depuis la base, jamais depuis un tableau TypeScript statique.
- Afficher référence, titre, statut, superficie, ville, zone, région, prix, description, accès, documents, photos et coordonnées si elles existent.
- Ne pas inventer de coordonnées GPS ; masquer carte/navigation si coordonnées absentes.
- Réservation uniquement si terrain publié et disponible.

### Paiement — /paiement
- Simulateur indicatif basé sur un prix saisi, avec mention qu’il ne remplace pas le prix officiel de la fiche.
- Formules présentes dans le code : comptant 100 %, 3 mois 110 %, 6 mois 120 %, 9 mois 135 %, 12 mois 150 %.
- Pour les formules échelonnées : premier versement de 30 % du total ; solde réparti sur la durée, dernière échéance ajustée pour absorber les arrondis.
- Toute modification de taux ou d’acompte exige validation de la direction et mise à jour des tests/textes.

### Réservation
- Formulaire prérempli depuis la fiche : référence et formule choisie.
- Champs : nom complet, téléphone, email facultatif, durée et message facultatif.
- Le serveur relit le terrain en base et vérifie publication et disponibilité avant insertion.
- Conserver un instantané du terrain, de la formule et des montants.
- Afficher un accusé de réception ; ne pas annoncer une réservation confirmée avant validation humaine.

### Contact — /contact
- Formulaire nom, téléphone, email facultatif, objet et message.
- Validation client/serveur, enregistrement en base, retour explicite en cas d’échec.
- Coordonnées centralisées dans src/lib/site.ts.
- Email à contact@monlot.ci seulement après configuration et test du domaine d’envoi ; en attendant, conserver les demandes en administration.

## 4. Administration privée
Écrans à réaliser :
- Connexion, déconnexion, récupération de mot de passe et session sécurisée.
- Tableau de bord : terrains publiés/disponibles/réservés/vendus, nouvelles demandes.
- CRUD terrains : statut, publication, vedette, priorité, photos/galerie, documents et localisation.
- Gestion des demandes de réservation/contact : liste, détail, recherche, filtres et statuts nouvelle, contactee, traitee, archivee.
- Profil administrateur.
- Toute opération sensible exige authentification, vérification de rôle côté serveur et politiques RLS.

## 5. Modèle de données existant
- lots : référence, titre, ville, zone, région, superficie, prix comptant, statut, image, galerie, description, accès, documents, coordonnées, vedette, priorité, publication.
- profiles : profil utilisateur.
- user_roles : rôles admin et user.
- reservation_requests : terrain, référence/titre instantanés, durée, total, acompte, mensualité, coordonnées demandeur et statut.
- contact_requests : coordonnées, objet, message et statut.

Toute évolution de schéma passe par une migration SQL versionnée et une mise à jour des types TypeScript.

## 6. Recommandations IA
Une fonction serveur existe. Elle doit recommander uniquement les terrains publiés et disponibles, respecter budget/ville, ne jamais inventer d’offre/prix/disponibilité, et gérer l’absence de clé IA ou de résultat. L’aide IA n’est jamais un engagement commercial.

## 7. Sécurité et confidentialité
- Ne jamais exposer le contenu de .env, les clés service-role, les clés IA ou secrets fournisseur.
- Vérifier les rôles côté serveur, sans faire confiance aux données du client.
- Valider les entrées avec Zod ; normaliser les téléphones ; contrôler les URLs médias.
- Prévenir le spam des formulaires (limitation de fréquence, honeypot ou équivalent).
- Ne jamais exposer demandes et profils aux visiteurs anonymes.
- Journaliser les erreurs sans données personnelles ni secrets.
- Prévoir chargement, vide, succès, erreur et reprise.

## 8. UX, SEO et accessibilité
Responsive mobile/tablette/ordinateur, navigation clavier, labels, focus visible, contrastes, réduction des animations, métadonnées par page, Open Graph/Twitter, favicon/image sociale, images optimisées et pages d’erreur françaises.
- Logo local servi avec son véritable format WebP ; aucun chemin d’asset Lovable externe ne doit être requis en production.
- Favicon PNG/ICO, icône Apple Touch et image Open Graph/Twitter servis depuis le domaine public du site.
- Manifeste PWA français, mode standalone, couleurs de marque et service worker avec cache du shell et repli hors connexion.
- Les photos de terrain indisponibles doivent afficher un visuel local de remplacement plutôt qu’une image cassée.
- Recette PWA restante : produire des icônes dédiées 192x192 et 512x512 et vérifier l’installation réelle sur Android/iOS.

## 9. Critères de recette
- Aucun terrain de démonstration sur les pages publiques.
- Un terrain non publié est invisible anonymement ; une référence inconnue/retirée renvoie une page introuvable.
- La fiche reflète la base ; sans coordonnées, pas de carte.
- Les cinq formules sont exactes et la somme des échéances égale le solde.
- Réservation rejetée si terrain absent, non publié ou indisponible.
- Formulaires valident les entrées et préservent les demandes en cas d’erreur.
- Un utilisateur standard ne gère pas le catalogue et ne lit pas les demandes.
- Un administrateur peut gérer terrains et demandes.
- Build, lint, tests métier, parcours et affichage mobile/desktop réussis avant production.

## 10. Audit initial
### Présent dans le dépôt
- Socle TanStack Start, React, TypeScript et composants UI.
- Accueil, catalogue, paiement et contact.
- Modèle Supabase, trois migrations initiales et politiques RLS.
- Fonctions serveur catalogue, contact, réservation et administration.
- Calcul centralisé des formules et fonction de recommandation IA.
- Charte graphique, logo, favicon et image sociale.

### Inachevé ou incohérent constaté
1. Accueil et catalogue utilisaient DEMO_LOTS lorsque la base était vide, contrairement à l’exigence de données réelles.
2. La fiche /terrains/:reference utilisait une source statique distincte du catalogue. Correction effectuée : elle charge désormais la référence depuis la même fonction serveur Supabase que le catalogue.
3. Le parcours de réservation n’était pas raccordé. Correction effectuée : formulaire intégré à la fiche, appel à submitReservationRequest, contrôle serveur du statut et accusé de réception. Les tests métier et anti-spam restent à réaliser.
4. Correction initiale réalisée : route /admin avec connexion Supabase, contrôle de rôle, tableau de bord, CRUD des terrains et traitement des statuts de demandes. Restent à valider les parcours réels avec un compte administrateur et à compléter le stockage média.
5. Upload et gestion des photos/galeries ne sont pas finalisés.
6. L’envoi email est conditionné à une configuration externe et n’est pas démontré.
7. Les recommandations IA existent côté serveur ; leur interface et recette restent à vérifier.
8. Anti-spam, tests métier automatisés et tests E2E restent à établir.
9. Correction apportée par migration : private.has_role est SECURITY DEFINER avec search_path vide et objets qualifiés, afin d’éviter la récursion RLS. Les politiques doivent encore être testées sur la base réelle.

## 11. Ordre d’exécution
P0 données/sécurité : données fictives retirées, fiches branchées sur Supabase, TanStack Start mis à niveau (1.169.4), react-store aligné (0.11.2), fonction de rôle RLS corrigée. Vérification RLS et configuration réelle encore à faire.
P1 conversion : terminer réservation, accusé de réception et formulaires.
P2 exploitation : première version de /admin livrée (connexion, tableau de bord, CRUD terrains, statuts des demandes) ; recette fonctionnelle et gestion des médias restent à faire.
P3 enrichissement : médias, recommandations IA, emails, SEO/accessibilité.
P4 recette : tests prix, RLS, parcours et validation production.

## 12. Décisions à confirmer avant production
- Statut juridique exact des documents et formulation commerciale autorisée.
- Conditions contractuelles de réservation, acompte, annulation et remboursement.
- Validation des taux de majoration et du versement initial de 30 %.
- Coordonnées commerciales et domaine email officiels.
- Politique de conservation des données personnelles.


## 13. Vérification de livraison — 8 novembre 2026
- Branche : main.
- Build Vercel : READY sur le commit d4f4aa67b275f55c2e364f50a9a2ee072fb6617c ; compilation client et serveur terminée.
- La mise à niveau TanStack Start et l’alignement de react-store ont été validés par ce build.
- La réussite du build ne remplace pas les tests de connexion, de rôles RLS, de création de terrain, de réservation et de parcours mobile sur la base réelle.
