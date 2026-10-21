NEXICE MOBILE v2 (Flutter 3.22+, Dart 3.4+)
Installation : flutter pub get
Lancement : flutter run --dart-define=API_URL=http://10.0.2.2:3000   (emulateur Android ; appareil reel : IP du PC)
Production : flutter build apk --release --dart-define=API_URL=https://api.votredomaine.com

Permissions a ajouter apres "flutter create ." (le dossier android/ios n'est pas fourni) :
  Android (android/app/src/main/AndroidManifest.xml) :
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    pour une API en http (dev) : android:usesCleartextTraffic="true" sur <application>
  iOS (Info.plist) : NSLocationWhenInUseUsageDescription
Commande initiale (une seule fois, dans mobile/) : flutter create . --project-name nexice --org cm.nexice

Ecrans : connexion/inscription, catalogue + recherche, panier + offre, commandes (detail, negociation, paiement,
facture, historique verifiable), suivi carte OSM, badges, assistant IA, produits vendeur, validations admin.
Mode leger : bouton compact dans la barre ou onglet Plus.
Fichiers : lib/main.dart api.dart ui.dart auth.dart home.dart catalog.dart orders.dart tracking.dart more.dart

NOTIFICATIONS (v2.1)
  Cloche avec compteur dans la barre du haut ; ecran Notifications (toucher = ouvrir la commande, 'Tout lire').
  Alerte instantanee (bandeau) quand l'application est ouverte, via WebSocket ; rafraichissement de secours toutes les 60 s.
  Les notifications hors application (telephone verrouille) demandent Firebase Cloud Messaging : non inclus.
  Fichier : lib/notifications.dart

PUBLICATION GOOGLE PLAY : voir ../PLAYSTORE.txt (backend en ligne, signature, test ferme, fiche) et android-release/ (modeles).
Compte supprimable depuis Plus > Supprimer mon compte (exige par Google Play).
Fond de carte : --dart-define=TILE_URL=... et TILE_ATTRIBUTION=... pour un fournisseur de tuiles en production.
