import { Controller, Get, Header } from '@nestjs/common';
import { Public } from './common';

const page = (title: string, body: string) => `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} - NeXice</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1a1a1a}h1,h2{color:#0e7c66}</style>
</head><body><h1>${title}</h1>${body}</body></html>`;
const co = () => process.env.LEGAL_COMPANY || 'l\'éditeur de NeXice';
const mail = () => process.env.LEGAL_EMAIL || 'contact@exemple.com';

@Controller('legal') export class LegalController {
  @Public() @Get('privacy') @Header('Content-Type', 'text/html; charset=utf-8')
  privacy() {
    return page('Politique de confidentialité', `
<p><em>Dernière mise à jour : ${new Date().toISOString().slice(0, 10)}</em></p>
<p>NeXice est une application de mise en relation entre professionnels (acheteurs, vendeurs, livreurs), éditée par ${co()}. Contact : <a href="mailto:${mail()}">${mail()}</a>.</p>
<h2>Données collectées</h2><ul>
<li><b>Compte</b> : email, mot de passe (stocké sous forme chiffrée irréversible), nom de l'entreprise, téléphone (facultatif), rôle.</li>
<li><b>Activité commerciale</b> : produits, commandes, offres, historique des étapes, factures, références de paiement Orange Money saisies par l'utilisateur.</li>
<li><b>Position</b> : uniquement pour les livreurs, tant que l'application est ouverte et que le partage de livraison est actif. Elle est visible de l'acheteur et du vendeur de la commande concernée. Aucune position n'est collectée en arrière-plan.</li>
<li><b>Notifications</b> : messages liés à vos commandes, enregistrés dans l'application.</li>
<li><b>Assistant IA</b> : les questions que vous posez sont transmises à un fournisseur d'IA (Anthropic) pour générer la réponse. N'y saisissez pas de données sensibles.</li></ul>
<h2>Utilisation</h2><p>Les données servent à faire fonctionner la plateforme : validation des profils, commandes, livraison, facturation, sécurité et prévention de la fraude. Nous ne vendons pas vos données et n'affichons pas de publicité.</p>
<h2>Partage</h2><p>Vos informations d'entreprise et les détails d'une commande sont visibles des parties à cette commande. Elles sont hébergées chez notre prestataire d'hébergement. Les échanges sont chiffrés (HTTPS).</p>
<h2>Conservation et suppression</h2><p>Vous pouvez supprimer votre compte dans l'application (Plus &gt; Supprimer mon compte) ou via <a href="delete-account">cette page</a>. Vos données personnelles sont alors effacées. L'historique des commandes est conservé de façon anonymisée pour les obligations comptables et la traçabilité des transactions.</p>
<h2>Vos droits</h2><p>Accès, rectification, suppression : écrivez à <a href="mailto:${mail()}">${mail()}</a>.</p>
<h2>Enfants</h2><p>NeXice s'adresse aux professionnels majeurs et n'est pas destiné aux enfants.</p>`);
  }
  @Public() @Get('delete-account') @Header('Content-Type', 'text/html; charset=utf-8')
  deleteAccount() {
    return page('Supprimer mon compte', `
<p><b>Dans l'application :</b> Plus &gt; Supprimer mon compte. Vos commandes en cours doivent d'abord être terminées ou annulées.</p>
<p><b>Sans accès à l'application :</b> envoyez un email à <a href="mailto:${mail()}">${mail()}</a> depuis l'adresse de votre compte, avec l'objet « Suppression de compte NeXice ». Nous traitons la demande sous 30 jours.</p>
<p><b>Données supprimées :</b> email, nom d'entreprise, téléphone, notifications, accès au compte. <b>Données conservées (anonymisées) :</b> historique des commandes et factures, pour les obligations comptables et la traçabilité.</p>`);
  }
}
