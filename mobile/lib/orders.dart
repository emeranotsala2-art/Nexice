import 'package:flutter/material.dart';
import 'api.dart';
import 'tracking.dart';
import 'ui.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersState();
}

class _OrdersState extends State<OrdersScreen> {
  late Future<dynamic> f = Api.get('orders');
  void reload() => setState(() => f = Api.get('orders'));

  @override
  Widget build(BuildContext c) => RefreshIndicator(
        onRefresh: () async => reload(),
        child: FutureBuilder(
          future: f,
          builder: (_, s) {
            if (s.hasError) return Center(child: Text('${s.error}'));
            if (!s.hasData) return const Center(child: CircularProgressIndicator());
            final l = s.data as List;
            if (l.isEmpty) return ListView(children: const [SizedBox(height: 200), Center(child: Text('Aucune commande'))]);
            return ListView(children: [
              for (final o in l)
                Card(
                  child: ListTile(
                    title: Text(Api.role == 'SELLER' ? o['buyerCompany'] : o['sellerCompany']),
                    subtitle: Text('${fcfa(o['total'])} • ${(o['items'] as List).length} article(s)'),
                    trailing: Chip(
                      label: Text(statusLabels[o['status']] ?? o['status'], style: const TextStyle(fontSize: 11, color: Colors.white)),
                      backgroundColor: statusColor(o['status']),
                    ),
                    onTap: () async {
                      await Navigator.push(c, MaterialPageRoute(builder: (_) => OrderDetail(id: o['id'])));
                      reload();
                    },
                  ),
                ),
            ]);
          },
        ),
      );
}

class OrderDetail extends StatefulWidget {
  final String id;
  const OrderDetail({super.key, required this.id});
  @override
  State<OrderDetail> createState() => _DetailState();
}

class _DetailState extends State<OrderDetail> {
  late Future<dynamic> f = Api.get('orders/${widget.id}');
  void reload() => setState(() => f = Api.get('orders/${widget.id}'));

  Future<void> status(String s, [String? ref]) => guard(context, () async {
        await Api.patch('orders/${widget.id}/status', {'status': s, if (ref != null) 'reference': ref});
        reload();
      });

  @override
  Widget build(BuildContext c) => Scaffold(
        appBar: AppBar(title: const Text('Commande')),
        body: FutureBuilder(
          future: f,
          builder: (_, s) {
            if (s.hasError) return Center(child: Text('${s.error}'));
            if (!s.hasData) return const Center(child: CircularProgressIndicator());
            final o = s.data as Map;
            final st = o['status'] as String;
            final buyer = o['buyerId'] == Api.userId, seller = o['sellerId'] == Api.userId, driver = Api.role == 'DRIVER';
            final myParty = buyer ? 'BUYER' : 'SELLER';
            final canAnswer = (buyer || seller) && st == 'NEGOTIATION';
            return ListView(padding: const EdgeInsets.all(12), children: [
              Row(children: [
                Chip(label: Text(statusLabels[st] ?? st, style: const TextStyle(color: Colors.white)), backgroundColor: statusColor(st)),
                const Spacer(),
                Text(fcfa(o['total']), style: Theme.of(c).textTheme.titleLarge),
              ]),
              Text('${o['buyerCompany']} → ${o['sellerCompany']}'),
              Text('Livraison : ${o['deliveryAddress'] ?? '-'}'),
              const Divider(),
              for (final i in o['items']) ListTile(dense: true, title: Text(i['name']), subtitle: Text('${i['qty']} × ${fcfa(i['unitPrice'])}')),
              const Divider(),
              Wrap(spacing: 8, children: [
                if (canAnswer && o['lastOfferBy'] != myParty) FilledButton(onPressed: () => status('VALIDATED'), child: const Text('Accepter l\'offre')),
                if (canAnswer)
                  OutlinedButton(
                    onPressed: () async {
                      final v = await askText(c, 'Votre contre-proposition (FCFA)', number: true);
                      if (v == null || v.isEmpty || !c.mounted) return;
                      await guard(c, () async {
                        await Api.post('orders/${widget.id}/offer', {'total': int.parse(v)});
                        reload();
                      });
                    },
                    child: const Text('Négocier'),
                  ),
                if (buyer && st == 'VALIDATED')
                  FilledButton(
                    onPressed: () async {
                      final r = await askText(c, 'Référence Orange Money', hint: 'ID de la transaction');
                      if (r != null && r.isNotEmpty) status('PAID', r);
                    },
                    child: const Text('Payer (Orange Money)'),
                  ),
                if (driver && st == 'PAID' && o['driverId'] == null) FilledButton(onPressed: () => status('SHIPPED'), child: const Text('Prendre en charge')),
                if (driver && st == 'SHIPPED' && o['driverId'] == Api.userId) FilledButton(onPressed: () => status('DELIVERED'), child: const Text('Confirmer la livraison')),
                if ((buyer || seller) && (st == 'NEGOTIATION' || st == 'VALIDATED'))
                  TextButton(onPressed: () => status('CANCELLED'), child: const Text('Annuler', style: TextStyle(color: Colors.red))),
                if (st == 'SHIPPED')
                  OutlinedButton.icon(
                    icon: const Icon(Icons.map),
                    label: Text(o['driverId'] == Api.userId ? 'Partager ma position' : 'Suivre la livraison'),
                    onPressed: () => Navigator.push(c, MaterialPageRoute(builder: (_) => TrackingScreen(orderId: o['id'], isDriver: o['driverId'] == Api.userId))),
                  ),
                if (o['invoiceNumber'] != null) OutlinedButton(onPressed: () => showInvoice(c), child: const Text('Facture')),
                OutlinedButton(onPressed: () => verify(c), child: const Text('Vérifier l\'intégrité')),
              ]),
              const SizedBox(height: 12),
              Text('Historique infalsifiable', style: Theme.of(c).textTheme.titleSmall),
              for (final e in o['events'])
                ListTile(
                  dense: true,
                  leading: const Icon(Icons.link, size: 18),
                  title: Text(e['type']),
                  subtitle: Text('${e['at']}\n#${(e['hash'] as String).substring(0, 12)}'),
                ),
            ]);
          },
        ),
      );

  Future<void> verify(BuildContext c) => guard(c, () async {
        final r = await Api.get('orders/${widget.id}/verify');
        if (!c.mounted) return;
        ScaffoldMessenger.of(c).showSnackBar(SnackBar(content: Text(r['valid'] == true ? '✔ Historique intègre' : '⚠ Historique altéré !')));
      });

  Future<void> showInvoice(BuildContext c) => guard(c, () async {
        final i = await Api.get('orders/${widget.id}/invoice');
        if (!c.mounted) return;
        showDialog(
          context: c,
          builder: (_) => AlertDialog(
            title: Text('Facture ${i['number']}'),
            content: Text('${i['seller']} → ${i['buyer']}\n\n'
                '${(i['lines'] as List).map((l) => '${l['name']} ${l['qty']}×${fcfa(l['unitPrice'])}').join('\n')}\n\n'
                'Total HT : ${fcfa(i['totalHT'])}\nTVA : ${fcfa(i['tva'])}\nTotal TTC : ${fcfa(i['totalTTC'])}\n'
                'Paiement : ${i['paymentRef']}'),
            actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('Fermer'))],
          ),
        );
      });
}
