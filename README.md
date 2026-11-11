# ARTECH Solutions

Site vitrine et boutique Next.js, TypeScript et MongoDB Atlas.

## Démarrage

```bash
npm install
npm run dev
```

- Accueil : http://localhost:3000
- Boutique client : http://localhost:3000/boutique
- Administration : http://localhost:3000/admin

## Configuration locale

Copiez `.env.example` vers `.env.local` si ce fichier n’existe pas. Renseignez `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` et `SESSION_SECRET` (clé aléatoire longue). Ne publiez jamais ce fichier. La configuration locale existante contient déjà un identifiant administrateur et un mot de passe aléatoire ; consultez-les dans `.env.local` sans les copier dans les journaux.

Renseignez `NEXT_PUBLIC_SITE_URL` avec l’adresse publique du site en production : elle sert au sitemap, au robots.txt, aux aperçus de partage (WhatsApp, Facebook) et à la fiche entreprise lue par Google.

MongoDB Atlas doit autoriser l’adresse IP du serveur. Les transactions MongoDB sont nécessaires pour réserver le stock sans vendre deux fois la même unité. Redémarrez le serveur après toute modification des variables d’environnement. En production, utilisez HTTPS (cookie administrateur sécurisé).

## Premier lancement de la boutique

1. Connectez-vous à `/admin` avec les valeurs `ADMIN_EMAIL` et `ADMIN_PASSWORD`.
2. Dans **Articles & stock**, ajoutez les produits, catégories, descriptions, prix en FCFA et quantités disponibles. Cliquez sur **Choisir une photo dans mes fichiers**, sélectionnez une image puis enregistrez l’article : elle sera affichée dans la boutique. Les photos JPG, PNG et WebP sont acceptées (5 Mo et 20 mégapixels maximum), optimisées puis conservées dans MongoDB. Une adresse HTTPS reste utilisable dans les options de la photo. Le logo peut servir d’image provisoire. Décochez la visibilité pour retirer un produit du catalogue sans perdre son historique.
3. Dans **Paiements**, renseignez pour MYNITA, AMANATA et WAVE le compte destinataire, les instructions, puis activez les moyens de paiement réellement disponibles.
4. Consultez **Commandes** pour contrôler les transferts reçus, confirmer le paiement et suivre la préparation jusqu’au retrait.

Le catalogue réel démarre vide. Les comptes de paiement restent inactifs tant que vous ne les renseignez pas. Aucun numéro destinataire n’est inventé.

## Parcours client

- Recherche et filtres par catégorie ; prix, descriptions et quantités en stock.
- Panier conservé dans le navigateur, avec modification des quantités et retrait d’articles.
- Commande avec nom, téléphone, note facultative et moyen de paiement souhaité.
- Choix entre retrait gratuit à la boutique (Quartier Zak, Niamey) et livraison avec quartier, adresse et repères obligatoires.
- Frais de livraison à convenir avec le client selon son quartier. L’administrateur les saisit dans la commande après accord ; le serveur recalcule le total et débloque les instructions de paiement. Le client doit actualiser son suivi pour consulter le montant final. Le reçu provisoire précise que les frais ne sont pas encore inclus.
- Paiement en boutique disponible pour les retraits : le client présente le reçu PDF imprimé ou sur téléphone et règle sur place. L’administrateur utilise **Encaisser en boutique** uniquement après réception de l’argent, puis remet les articles.
- Page privée de suivi et téléchargement d’un reçu PDF avec logo ARTECH, nom de l’entreprise, coordonnées client et tableau détaillé : article, quantité, prix unitaire et total par ligne. Le total général figure en bas, avec les frais de livraison séparés. Les en-têtes sont répétés sur les reçus de plusieurs pages. Le reçu est disponible avant paiement et indique clairement si le règlement est encore attendu.
- Transfert manuel dans l’application MYNITA, AMANATA ou WAVE, puis transmission de la référence de transaction. Le client ne peut pas déclarer lui-même la commande payée.
- Validation ou refus après vérification par l’administrateur. Aucun appel aux API de paiement et aucun débit automatique.

Conservez le lien de commande : il permet d’accéder aux coordonnées et au récapitulatif. La dernière commande est retrouvable depuis le navigateur utilisé. Aucun compte client n’est nécessaire.

## Stock et commandes

Le serveur recalcule les prix et le total à partir de MongoDB. La réservation de tous les articles et la création de la commande forment une transaction. Une même clé de commande ne crée qu’une commande, même après une nouvelle tentative réseau. Les modifications de stock périmées sont rejetées pour éviter d’écraser une vente récente.

Le stock est réservé dès la création de commande. Une commande restée **À confirmer** et **Non payée** au-delà de `ORDER_EXPIRY_HOURS` heures (48 par défaut, `0` pour désactiver) est annulée automatiquement et son stock libéré ; confirmez donc les commandes que vous comptez honorer. Vous pouvez aussi annuler à la main les commandes abandonnées depuis l’administration. Une annulation ne remet le stock qu’une seule fois. Les commandes payées ne sont pas annulables dans cette interface ; les remboursements doivent être traités avec le client. La remise au client exige un paiement validé. Les livraisons passent par **Prête à livrer**, **En cours de livraison**, puis **Remise au client**. La mise en livraison exige un tarif confirmé et un paiement validé ; le paiement à la livraison n’est pas proposé. Les anciennes commandes restent considérées comme des retraits en boutique.

La session administrateur dure 8 heures ; la connexion est limitée à 10 tentatives par adresse IP et par tranche de 15 minutes (300 au total, par sécurité). La configuration actuelle propose un compte administrateur partagé ; elle ne gère pas encore des comptes individuels et rôles multiples.

## Vérifications

```bash
npm run lint
npm run build
npm run test:shop
```

Les tests d’intégration créent une base Atlas temporaire nommée `artech_shop_test_<timestamp>`, puis la suppriment. Ils nécessitent une connexion Atlas et les variables administrateur. Ils couvrent les permissions, la validation des produits, le calcul des prix, les réservations concurrentes, les doubles envois, le PDF, le paiement manuel, le cycle des commandes, les annulations et le retour arrière en cas de stock insuffisant.

Pour inclure le parcours navigateur avec Chrome installé, dans PowerShell :

```powershell
$env:SHOP_BROWSER_TEST='1'
npm run test:shop
```

`TEST_BROWSER=msedge` permet d’utiliser Edge. Les captures de test sont enregistrées dans `test-results/`. `TEST_PORT` permet de changer le port 3107 utilisé par défaut. Le serveur de test utilise `.next-test` pour ne pas écraser le build principal.

Les tests `node tests/receipt.preview.cjs` vérifient localement le traitement des photos et génèrent des exemples de reçus dans `test-results/`, sans connexion Atlas. `node tests/photo.browser.cjs` vérifie le sélecteur de fichiers, l’aperçu et l’affichage boutique avec des réponses de base simulées ; il ne valide pas la persistance MongoDB. Pour exécuter les tests d’intégration avec une base temporaire locale, définissez `SHOP_LOCAL_DB=1` (nécessite le téléchargement du binaire MongoDB lors du premier lancement).
