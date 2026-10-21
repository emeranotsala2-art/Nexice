import 'package:flutter/material.dart';
import 'api.dart';
import 'auth.dart';
import 'catalog.dart';
import 'more.dart';
import 'notifications.dart';
import 'orders.dart';
import 'ui.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeState();
}

class _HomeState extends State<HomeShell> {
  int i = 0;

  @override
  void initState() {
    super.initState();
    Notifs.start();
  }

  List<(String, IconData, Widget)> get tabs => switch (Api.role) {
        'BUYER' => [('Catalogue', Icons.storefront, const CatalogScreen()), ('Commandes', Icons.receipt_long, const OrdersScreen()), ('Plus', Icons.more_horiz, const MoreScreen())],
        'SELLER' => [('Produits', Icons.inventory_2, const SellerProductsScreen()), ('Commandes', Icons.receipt_long, const OrdersScreen()), ('Plus', Icons.more_horiz, const MoreScreen())],
        'DRIVER' => [('Missions', Icons.local_shipping, const OrdersScreen()), ('Plus', Icons.more_horiz, const MoreScreen())],
        _ => [('Validations', Icons.verified_user, const AdminScreen()), ('Commandes', Icons.receipt_long, const OrdersScreen()), ('Plus', Icons.more_horiz, const MoreScreen())],
      };

  @override
  Widget build(BuildContext c) {
    final t = tabs;
    return Scaffold(
      appBar: AppBar(title: Text(t[i].$1), actions: [
        if (Api.role == 'BUYER')
          ValueListenableBuilder<int>(
            valueListenable: Cart.count,
            builder: (_, n, __) => IconButton(
              icon: Badge(isLabelVisible: n > 0, label: Text('$n'), child: const Icon(Icons.shopping_cart_outlined)),
              onPressed: () => Navigator.push(c, MaterialPageRoute(builder: (_) => const CartScreen())),
            ),
          ),
        ValueListenableBuilder<int>(
          valueListenable: Notifs.unread,
          builder: (_, n, __) => IconButton(
            tooltip: 'Notifications',
            icon: Badge(isLabelVisible: n > 0, label: Text('$n'), child: const Icon(Icons.notifications_outlined)),
            onPressed: () async {
              await Navigator.push(c, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
              Notifs.refresh();
            },
          ),
        ),
        IconButton(
          tooltip: 'Mode léger',
          icon: const Icon(Icons.speed),
          onPressed: () => lightMode.value = !lightMode.value,
        ),
      ]),
      body: t[i].$3,
      bottomNavigationBar: NavigationBar(
        selectedIndex: i,
        onDestinationSelected: (v) => setState(() => i = v),
        destinations: [for (final x in t) NavigationDestination(icon: Icon(x.$2), label: x.$1)],
      ),
    );
  }
}

Future<void> doLogout(BuildContext c) async {
  Notifs.stop();
  await Api.logout();
  Cart.clear();
  if (c.mounted) Navigator.pushAndRemoveUntil(c, MaterialPageRoute(builder: (_) => const AuthScreen()), (_) => false);
}
