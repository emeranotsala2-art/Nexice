import 'package:flutter/material.dart';
import 'api.dart';

final messengerKey = GlobalKey<ScaffoldMessengerState>();
final lightMode = ValueNotifier<bool>(false); // mode léger : affichage compact

String fcfa(num n) =>
    '${n.round().toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ' ')} FCFA';

const statusLabels = {
  'NEGOTIATION': 'Négociation',
  'VALIDATED': 'Validée',
  'PAID': 'Payée',
  'SHIPPED': 'En livraison',
  'DELIVERED': 'Livrée',
  'CANCELLED': 'Annulée',
};

Color statusColor(String s) => switch (s) {
      'NEGOTIATION' => Colors.orange,
      'VALIDATED' => Colors.blue,
      'PAID' => Colors.indigo,
      'SHIPPED' => Colors.teal,
      'DELIVERED' => Colors.green,
      _ => Colors.red,
    };

Future<void> guard(BuildContext c, Future<void> Function() f) async {
  try {
    await f();
  } on ApiError catch (e) {
    if (c.mounted) ScaffoldMessenger.of(c).showSnackBar(SnackBar(content: Text(e.message)));
  }
}

Future<String?> askText(BuildContext c, String title, {String hint = '', bool number = false}) {
  final t = TextEditingController();
  return showDialog<String>(
    context: c,
    builder: (_) => AlertDialog(
      title: Text(title),
      content: TextField(controller: t, autofocus: true, decoration: InputDecoration(hintText: hint),
          keyboardType: number ? TextInputType.number : TextInputType.text),
      actions: [
        TextButton(onPressed: () => Navigator.pop(c), child: const Text('Annuler')),
        FilledButton(onPressed: () => Navigator.pop(c, t.text.trim()), child: const Text('Valider')),
      ],
    ),
  );
}

/// Panier mono-fournisseur (une commande = un fournisseur)
class Cart {
  static String? sellerId, sellerCompany;
  static final items = <String, Map<String, dynamic>>{}; // productId -> {product, qty}
  static final count = ValueNotifier<int>(0);

  static String? add(Map p) {
    if (sellerId != null && sellerId != p['sellerId']) {
      return 'Votre panier contient déjà des articles d\'un autre fournisseur';
    }
    sellerId = p['sellerId'];
    sellerCompany = p['sellerCompany'];
    final e = items.putIfAbsent(p['id'], () => {'product': p, 'qty': 0});
    e['qty'] = (e['qty'] as int) + 1;
    count.value = items.length;
    return null;
  }

  static void remove(String id) {
    items.remove(id);
    if (items.isEmpty) sellerId = null;
    count.value = items.length;
  }

  static void clear() {
    items.clear();
    sellerId = null;
    count.value = 0;
  }

  static int get total =>
      items.values.fold(0, (s, e) => s + (e['qty'] as int) * ((e['product']['price']) as int));
}
