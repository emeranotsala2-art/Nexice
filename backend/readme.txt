NEXICE BACKEND v2 (NestJS 10, TypeORM, PostgreSQL, Socket.io)
Prerequis : Node 20+, Docker (ou PostgreSQL 15+).

Installation : docker compose up -d ; copier .env.example en .env ; npm install ; npm run migration:run ; npm run seed:demo ; npm run start:dev
(npm run seed et seed:demo appliquent aussi les migrations en attente.)
Tests : npm test (verification de la chaine de hash)
Docker complet : docker compose --profile full up -d --build   (API + base)
Production : DB_SYNC=false, JWT_SECRET long et aleatoire, CORS_ORIGIN renseigne, HTTPS (reverse proxy).
Nouveau serveur : npm run build ; npm run migration:run:prod ; npm run seed:prod (admin + tarifs) ; node dist/main.js

Securite integree : validation stricte des entrees, bcrypt (cout 12), JWT 12 h, roles, limitation de debit (global + login), helmet,
prix recalcules cote serveur, stock decremente en transaction (verrou), WebSocket authentifie par JWT.

Endpoints (prefixe /api) :
  GET  /health
  POST /auth/register | /auth/login ; GET /auth/me
  GET  /products?q= ; GET /products/mine (SELLER) ; POST /products ; PATCH /products/:id (SELLER)
  GET  /orders ; POST /orders (BUYER) ; GET /orders/:id ; POST /orders/:id/offer
  PATCH /orders/:id/status {status: VALIDATED|PAID|SHIPPED|DELIVERED|CANCELLED, reference?}
  GET  /orders/:id/verify ; GET /orders/:id/invoice (HT, TVA TVA_RATE, TTC)
  GET  /badges/plans ; POST /badges/request {color, omReference}
  GET  /admin/stats|users|badges ; PATCH /admin/users/:id/(approve|reject) ; PATCH /admin/badges/:id/(confirm|reject) ; PUT /admin/plans/:color {price}
  POST /ai/ask {question} (5 questions gratuites, illimite avec badge actif)
WebSocket namespace /tracking (auth: {token}) : 'join' {orderId} ; 'position' {orderId,lat,lng} (livreur assigne) ; ecoute 'position'.

Cycle d'une commande : NEGOTIATION > VALIDATED > PAID > SHIPPED > DELIVERED (ou CANCELLED avant paiement).
Chaque etape est ajoutee au journal SHA-256 chaine (table order_event).
Les tarifs des badges par defaut (10 000 / 25 000 / 50 000 FCFA) sont a ajuster via PUT /admin/plans/:color.

NOTIFICATIONS ET RAPPELS (v2.1)
  GET /notifications ; GET /notifications/unread-count ; PATCH /notifications/read-all ; PATCH /notifications/:id/read
  Temps reel : WebSocket namespace /notifications (auth: {token}), evenement 'notification'.
  Evenements notifies : nouvelle commande, offre, validation, paiement recu, nouvelle mission (livreurs), livraison, annulation,
  inscription et paiement de badge (admins), decision sur un badge.
  Rappels automatiques (cron toutes les heures, sans doublon grace a la cle de dedoublonnage) :
    - offre sans reponse > 24 h (partie qui doit repondre)      - commande validee non payee > 24 h (acheteur)
    - commande payee sans livreur > 6 h (vendeur + livreurs)    - livraison en cours > 24 h (livreur)
    - badge expirant sous 7 jours                               - stock <= 5 (vendeur)
    - inscriptions en attente > 48 h (admins)
  Pas de notification push hors application (FCM/APNs) : prevu en etape suivante.

MIGRATIONS (schema de base de donnees)
  Le schema n'est plus cree par synchronize : il est versionne dans src/migrations (migration initiale incluse, testee sur PostgreSQL 16 :
  application, annulation, reapplication, aucune difference restante avec les entites).
  npm run migration:run       applique les migrations en attente
  npm run migration:show      liste l'etat des migrations
  npm run migration:revert    annule la derniere migration
  npm run migration:generate src/migrations/NomDuChangement   apres avoir modifie src/entities.ts (relire le fichier genere avant de l'appliquer)
  DB_MIGRATIONS_RUN=true      applique automatiquement les migrations au demarrage de l'API (pratique avec Docker).
  Production : sauvegarder la base (pg_dump) avant chaque migration ; ne jamais modifier une migration deja appliquee, en creer une nouvelle.
  Important : dans .env, les valeurs contenant # doivent etre entre guillemets (ex. ADMIN_PASSWORD="Admin#12345"), sinon la fin est ignoree.

CONFORMITE PLAY STORE
  DELETE /api/auth/me : supprime le compte (donnees personnelles effacees, commandes anonymisees ; refuse si commande en cours ou admin).
  GET /api/legal/privacy et /api/legal/delete-account : pages publiques (variables LEGAL_COMPANY, LEGAL_EMAIL).
  Deploiement : docker-compose.prod.yml + Caddyfile (HTTPS automatique), voir ../PLAYSTORE.txt.
