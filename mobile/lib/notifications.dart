import 'dart:async';
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'api.dart';
import 'orders.dart';
import 'ui.dart';

/// Notifications en temps réel (WebSocket) + rafraîchissement périodique de secours.
class Notifs {
  static final unread = ValueNotifier<int>(0);
  static io.Socket? _s;
  static Timer? _t;

  static void start() {
    stop();
    refresh();
    _t = Timer.periodic(const Duration(seconds: 60), (_) => refresh());
    _s = io.io('$apiUrl/notifications', io.OptionBuilder().setTransports(['websocket']).setAuth({'token': Api.token}).build());
    _s!.on('notification', (d) {
      unread.value++;
      messengerKey.currentState?.showSnackBar(SnackBar(
        content: Text('${d['title']}\n${d['body']}'),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 5),
      ));
    });
  }

  static void stop() {
    _t?.cancel();
    _s?.dispose();
    _s = null;
    unread.value = 0;
  }

  static Future<void> refresh() async {
    try {
      unread.value = (await Api.get('notifications/unread-count'))['count'];
    } catch (_) {}
  }
}

IconData _icon(String t) => switch (t) {
      'REMINDER' => Icons.alarm,
      'MISSION' => Icons.local_shipping,
      'BADGE' || 'BADGE_REQUEST' => Icons.workspace_premium,
      'SIGNUP' => Icons.person_add,
      _ => Icons.receipt_long,
    };

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotifState();
}

class _NotifState extends State<NotificationsScreen> {
  late Future<dynamic> f = Api.get('notifications');
  void reload() => setState(() => f = Api.get('notifications'));

  @override
  Widget build(BuildContext c) => Scaffold(
        appBar: AppBar(title: const Text('Notifications'), actions: [
          TextButton(
            onPressed: () => guard(c, () async {
              await Api.patch('notifications/read-all');
              reload();
            }),
            child: const Text('Tout lire'),
          ),
        ]),
        body: RefreshIndicator(
          onRefresh: () async => reload(),
          child: FutureBuilder(
            future: f,
            builder: (_, s) {
              if (s.hasError) return Center(child: Text('${s.error}'));
              if (!s.hasData) return const Center(child: CircularProgressIndicator());
              final l = s.data as List;
              if (l.isEmpty) return ListView(children: const [SizedBox(height: 200), Center(child: Text('Aucune notification'))]);
              return ListView(children: [
                for (final n in l)
                  ListTile(
                    leading: Icon(_icon(n['type']), color: n['isRead'] ? Colors.grey : Theme.of(c).colorScheme.primary),
                    title: Text(n['title'], style: TextStyle(fontWeight: n['isRead'] ? FontWeight.normal : FontWeight.bold)),
                    subtitle: Text('${n['body']}\n${DateTime.parse(n['createdAt']).toLocal().toString().substring(0, 16)}'),
                    isThreeLine: true,
                    onTap: () async {
                      await guard(c, () => Api.patch('notifications/${n['id']}/read'));
                      if (n['orderId'] != null && c.mounted) {
                        await Navigator.push(c, MaterialPageRoute(builder: (_) => OrderDetail(id: n['orderId'])));
                      }
                      reload();
                    },
                  ),
              ]);
            },
          ),
        ),
      );
}
