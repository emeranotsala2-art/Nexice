import 'package:flutter/material.dart';
import 'api.dart';
import 'ui.dart';

class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key});
  @override
  State<CatalogScreen> createState() => _CatalogState();
}

class _CatalogState extends State<CatalogScreen> {
  String q = '';
  late Future<dynamic> f = Api.get('products');
  void reload() => setState(() => f = Api.get('products?q=${Uri.encodeQueryComponent(q)}'));

  @override
  Widget build(BuildContext c) => Column(children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Rechercher un produit', border: OutlineInputBorder()),
            onChanged: (v) => q = v,
            onSubmitted: (_) => reload(),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async => reload(),
            child: FutureBuilder(
              future: f,
              builder: (_, s) {
                if (s.hasError) return Center(child: Text('${s.error}'));
                if (!s.hasData) return const Center(child: CircularProgressIndicator());
                final l = s.data as List;
                if (l.isEmpty) return const Center(child: Text('Aucun produit trouvé'));
                return ListView(children: [
                  for (final p in l)
                    Card(
                      child: ListTile(
                        title: Text(p['name']),
                        subtitle: Text('${p['sellerCompany']} • Stock : ${p['stock']} ${p['unit']}'),
                        trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          Text(fcfa(p['price']), style: const TextStyle(fontWeight: FontWeight.bold)),
                          const Text('+ panier', style: TextStyle(fontSize: 11)),
                        ]),
                        onTap: p['stock'] < 1 ? null : () {
                          final err = Cart.add(p);
                          ScaffoldMessenger.of(c).showSnackBar(SnackBar(content: Text(err ?? '${p['name']} ajouté au panier')));
                        },
                      ),
                    ),
                ]);
              },
            ),
          ),
        ),
      ]);
}

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});
  @override
  State<CartScreen> createState() => _CartState();
}

class _CartState extends State<CartScreen> {
  final address = TextEditingController(), offer = TextEditingController();

  @override
  Widget build(BuildContext c) => Scaffold(
        appBar: AppBar(title: Text('Panier${Cart.sellerCompany != null ? ' • ${Cart.sellerCompany}' : ''}')),
        body: Cart.items.isEmpty
            ? const Center(child: Text('Votre panier est vide'))
            : ListView(padding: const EdgeInsets.all(12), children: [
                for (final e in Cart.items.entries)
                  ListTile(
                    title: Text(e.value['product']['name']),
                    subtitle: Text('${fcfa(e.value['product']['price'])} × ${e.value['qty']}'),
                    leading: Row(mainAxisSize: MainAxisSize.min, children: [
                      IconButton(icon: const Icon(Icons.remove_circle_outline), onPressed: () => setState(() {
                            e.value['qty'] = (e.value['qty'] as int) - 1;
                            if (e.value['qty'] < 1) Cart.remove(e.key);
                          })),
                    ]),
                    trailing: IconButton(icon: const Icon(Icons.add_circle_outline), onPressed: () => setState(() => e.value['qty'] = (e.value['qty'] as int) + 1)),
                  ),
                const Divider(),
                Text('Total catalogue : ${fcfa(Cart.total)}', style: Theme.of(c).textTheme.titleMedium),
                const SizedBox(height: 8),
                TextField(controller: offer, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Votre offre (FCFA) — optionnel', border: OutlineInputBorder())),
                const SizedBox(height: 8),
                TextField(controller: address, decoration: const InputDecoration(labelText: 'Adresse de livraison', border: OutlineInputBorder())),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => guard(c, () async {
                    await Api.post('orders', {
                      'items': [for (final e in Cart.items.entries) {'productId': e.key, 'qty': e.value['qty']}],
                      'deliveryAddress': address.text.trim(),
                      if (offer.text.isNotEmpty) 'offerTotal': int.parse(offer.text),
                    });
                    Cart.clear();
                    if (c.mounted) {
                      Navigator.pop(c);
                      ScaffoldMessenger.of(c).showSnackBar(const SnackBar(content: Text('Commande envoyée au fournisseur')));
                    }
                  }),
                  child: const Text('Envoyer la commande'),
                ),
              ]),
      );
}

class SellerProductsScreen extends StatefulWidget {
  const SellerProductsScreen({super.key});
  @override
  State<SellerProductsScreen> createState() => _SellerState();
}

class _SellerState extends State<SellerProductsScreen> {
  late Future<dynamic> f = Api.get('products/mine');
  void reload() => setState(() => f = Api.get('products/mine'));

  Future<void> add() async {
    final n = TextEditingController(), p = TextEditingController(), s = TextEditingController(), u = TextEditingController(text: 'unité');
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Nouveau produit'),
        content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: n, decoration: const InputDecoration(labelText: 'Nom')),
          TextField(controller: u, decoration: const InputDecoration(labelText: 'Unité (sac, carton…)')),
          TextField(controller: p, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Prix unitaire (FCFA)')),
          TextField(controller: s, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Stock')),
        ])),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Ajouter')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    await guard(context, () async {
      await Api.post('products', {'name': n.text.trim(), 'unit': u.text.trim(), 'price': int.parse(p.text), 'stock': int.parse(s.text)});
      reload();
    });
  }

  @override
  Widget build(BuildContext c) => Scaffold(
        floatingActionButton: FloatingActionButton(onPressed: add, child: const Icon(Icons.add)),
        body: RefreshIndicator(
          onRefresh: () async => reload(),
          child: FutureBuilder(
            future: f,
            builder: (_, s) {
              if (s.hasError) return Center(child: Text('${s.error}'));
              if (!s.hasData) return const Center(child: CircularProgressIndicator());
              final l = s.data as List;
              if (l.isEmpty) return const Center(child: Text('Ajoutez votre premier produit'));
              return ListView(children: [
                for (final p in l)
                  Card(
                    child: ListTile(
                      title: Text(p['name']),
                      subtitle: Text('${fcfa(p['price'])} • Stock : ${p['stock']} ${p['unit']}'),
                      trailing: IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () async {
                          final v = await askText(c, 'Nouveau stock', number: true);
                          if (v == null || v.isEmpty || !c.mounted) return;
                          await guard(c, () async {
                            await Api.patch('products/${p['id']}', {'stock': int.parse(v)});
                            reload();
                          });
                        },
                      ),
                    ),
                  ),
              ]);
            },
          ),
        ),
      );
}
