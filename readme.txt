NEXICE - Plateforme B2B mobile (acheteurs, vendeurs, livreurs, administrateurs)  v2.0
====================================================================================
Dossiers :
  backend/  API NestJS + PostgreSQL + Socket.io   (voir backend/readme.txt)
  mobile/   Application Flutter iOS/Android       (voir mobile/readme.txt)

Demarrage rapide (developpement) :
  1) cd backend
     docker compose up -d                 (PostgreSQL)
     copy .env.example .env               (puis changer JWT_SECRET)
     npm install
     npm run seed:demo                    (applique les migrations + admin + comptes demo + produits)
     npm run start:dev                    (API sur http://localhost:3000/api)
  2) cd mobile
     flutter pub get
     flutter run --dart-define=API_URL=http://10.0.2.2:3000     (emulateur Android)

Comptes de demonstration (apres seed:demo) - mot de passe Demo#12345 :
  vendeur@demo.cm | acheteur@demo.cm | livreur@demo.cm
  Admin : valeurs ADMIN_EMAIL / ADMIN_PASSWORD du fichier .env

Scenario de test complet :
  acheteur : catalogue > panier > offre > commande
  vendeur  : accepte ou contre-propose  (l'AUTRE partie accepte la derniere offre)
  acheteur : payer (reference Orange Money) -> facture generee
  livreur  : prend en charge, partage sa position ; acheteur suit sur la carte
  livreur  : confirme la livraison ; "Verifier l'integrite" controle la chaine de hash

Publication Play Store : PLAYSTORE.txt (guide) et store/fiche-store.txt (textes et declarations).
Notifications et rappels : voir backend/readme.txt (section NOTIFICATIONS ET RAPPELS).

Etat du projet / limites connues :
  - Paiement Orange Money : declaratif + confirmation admin (pas d'API de paiement branchee).
  - Assistant IA : necessite ANTHROPIC_API_KEY cote serveur.
  - Backend teste de bout en bout sur PostgreSQL 16 (migrations, parcours commande complet, droits par role, integrite
    de la chaine de hash, detection d'une falsification en base). Non testes ici : WebSocket, rappels (cron) et appel IA.
  - L'application Flutter n'a pas ete compilee dans cet environnement : prevoir de petites corrections au premier lancement.
