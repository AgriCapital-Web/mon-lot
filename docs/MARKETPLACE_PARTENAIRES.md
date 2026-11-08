# Mon Lot — modèle marketplace partenaires

## Modèle commercial validé

Le modèle est hybride et chaque droit commercial dure 90 jours :

- Packs de crédits : 5, 10, 20, 25 ou 50 publications.
- Abonnements : capacité simultanée de 5, 10, 20, 25 ou 50 annonces.
- Offre illimitée disponible comme option contractuelle, soumise aux règles de modération et d'usage.
- Prix FCFA configurés exclusivement depuis l'administration. Aucun montant n'est prérempli arbitrairement.
- Un paiement n'active aucun droit tant que sa confirmation par le prestataire ou un contrôle administratif autorisé n'est pas acquise.
- Les forfaits non configurés ou inactifs ne sont pas commercialisables.

## Parcours partenaire

1. Le visiteur crée un compte et dépose une demande de partenariat (agent indépendant, agence, promoteur, aménageur ou propriétaire).
2. La demande reste en attente. L'utilisateur ne reçoit aucun rôle partenaire par auto-déclaration.
3. Un administrateur examine le dossier et l'approuve ou le refuse.
4. L'approbation met à jour le profil et attribue le rôle partenaire côté base de données.
5. Le partenaire choisit un pack ou un abonnement, puis initie le paiement.
6. Seule une confirmation fiable du paiement permet d'activer un droit de publication pour 90 jours.
7. Le partenaire prépare ses annonces et les soumet à modération.
8. L'administrateur approuve ou refuse chaque annonce. L'approbation consomme un crédit ou vérifie la capacité disponible de l'abonnement.
9. À l'expiration, les annonces partenaires concernées sont retirées de la publication publique.

## Distinction des deux offres

### Pack de crédits
Un crédit est consommé lorsqu'une annonce est approuvée et publiée. Le solde des crédits est conservé dans `partner_entitlements.credits_remaining`. Les crédits ont une durée de validité de 90 jours.

### Abonnement
Le forfait autorise un nombre maximal d'annonces partenaires actives simultanément pendant 90 jours. La suppression ou la dépublication d'une annonce libère une place selon les règles métier à finaliser.

## Contrôles et sécurité

- Les partenaires ne peuvent consulter que leurs dossiers, paiements, droits et annonces.
- Les rôles partenaire et administrateur sont attribués par des fonctions de base de données protégées.
- Les annonces des partenaires restent non publiques tant que la modération et les droits commerciaux ne sont pas validés.
- Un partenaire ne peut pas activer lui-même `is_published`, `is_featured` ou modifier son propriétaire.
- Les mises en avant (« à la une ») restent une prestation distincte, qui devra être tarifée, payée et validée avant activation.
- Les confirmations de paiement doivent provenir d'un webhook serveur vérifié du prestataire choisi. Ne jamais faire confiance à une redirection navigateur ou à un paramètre envoyé par le client.
- Les opérations de confirmation et de consommation des crédits sont transactionnelles et contrôlées en base.

## Migration

Le schéma initial est défini dans :

`supabase/migrations/20261108130000_partner_marketplace_hybrid_plans.sql`

La migration ajoute les demandes partenaires, les forfaits, les droits de publication, les paiements, les consommations de crédits et les fonctions protégées d'administration.

## Étapes obligatoires avant ouverture commerciale

1. Appliquer la migration au projet Supabase de production et vérifier toutes les policies RLS.
2. Configurer les variables Supabase côté Vercel.
3. Choisir et connecter le prestataire de paiement (Kkiapay ou autre), avec vérification serveur de signature et idempotence des webhooks.
4. Configurer les prix et activer les forfaits depuis l'administration.
5. Construire/recetter les écrans demande partenaire, tableau de bord partenaire et file de modération/pilotage des forfaits dans l'administration.
6. Ajouter un traitement planifié sécurisé pour l'expiration des droits et annonces.
7. Tester les scénarios d'abus, accès croisés, paiements en attente/échoués/remboursés, expiration et renouvellement avant publication.

**État :** schéma et règles de sécurité proposés dans le dépôt. Le projet Supabase connecté n'a pas pu être inspecté ni migré dans cette session en raison d'un refus d'autorisation du connecteur. Les écrans et la connexion de paiement ne doivent donc pas être considérés comme opérationnels tant que les étapes ci-dessus ne sont pas exécutées et testées.
