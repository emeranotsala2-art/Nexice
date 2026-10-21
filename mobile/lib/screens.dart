import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'api.dart';
import 'main.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _L();
}

class _L extends State<LoginScreen> {
  final e = TextEditingController(), p = TextEditingController();
  String msg = '';
  @override
  Widget build(BuildContext c) => Scaffold(
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Text('NeXice', style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            TextField(controller: e, decoration: const InputDecoration(labelText: 'Email')),
            TextField(controller: p, obscureText: true, decoration: const InputDecoration(labelText: 'Mot de passe')),
            const SizedBox(height: 16),
            FilledButton(
                onPressed: () async {
                  final ok = await Api.login(e.text, p.text);
                  if (!mounted) return;
                  ok
                      ? Navigator.pushReplacement(c, MaterialPageRoute(builder: (_) => const HomeScreen()))
                      : setState(() => msg = 'Echec ou compte en attente de validation');
                },
                child: const Text('Connexion')),
            Text(msg, style: const TextStyle(color: Colors.red)),
          ]),
        ),
      );
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});
  @override
  Widget build(BuildContext c) => Scaffold(
        appBar: AppBar(title: Text('NeXice - ${Api.role}'), actions: [
          IconButton(
              tooltip: 'Mode leger',
              icon: const Icon(Icons.speed),
              onPressed: () => NexiceApp.light.value = !NexiceApp.light.value),
        ]),
        body: ListView(children: [
          ListTile(leading: const Icon(Icons.store), title: const Text('Catalogue'),
              onTap: () => Navigator.push(c, MaterialPageRoute(builder: (_) => const CatalogScreen()))),
          ListTile(leading: const Icon(Icons.map), title: const Text('Suivi en direct'),
              onTap: () => Navigator.push(c, MaterialPageRoute(builder: (_) => const TrackingScreen()))),
        ]),
      );
}

class CatalogScreen extends StatelessWidget {
  const CatalogScreen({super.key});
  @override
  Widget build(BuildContext c) => Scaffold(
        appBar: AppBar(title: const Text('Catalogue')),
        body: FutureBuilder(
          future: Api.get('products'),
          builder: (_, s) => !s.hasData
              ? const Center(child: CircularProgressIndicator())
              : ListView(children: [
                  for (final p in s.data as List)
                    ListTile(title: Text(p['name']), subtitle: Text('Stock : ${p['stock']}'), trailing: Text('${p['price']} FCFA')),
                ]),
        ),
      );
}

class TrackingScreen extends StatefulWidget {
  const TrackingScreen({super.key});
  @override
  State<TrackingScreen> createState() => _T();
}

class _T extends State<TrackingScreen> {
  LatLng pos = const LatLng(3.848, 11.502); // Yaounde
  late io.Socket s;
  @override
  void initState() {
    super.initState();
    s = io.io('$apiUrl/tracking', io.OptionBuilder().setTransports(['websocket']).build());
    s.emit('join', {'orderId': 'demo'});
    s.on('position', (d) => setState(() => pos = LatLng(d['lat'], d['lng'])));
  }

  @override
  void dispose() { s.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext c) => Scaffold(
        appBar: AppBar(title: const Text('Suivi en direct')),
        body: FlutterMap(
          options: MapOptions(initialCenter: pos, initialZoom: 13),
          children: [
            TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'app.nexice'),
            MarkerLayer(markers: [Marker(point: pos, child: const Icon(Icons.local_shipping, color: Colors.green, size: 36))]),
          ],
        ),
      );
}
