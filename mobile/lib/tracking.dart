import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'api.dart';

// Fond de carte configurable. Le serveur public d'OpenStreetMap est réservé à un usage léger :
// en production, utilisez un fournisseur de tuiles (MapTiler, Stadia, Mapbox...) via --dart-define=TILE_URL=...
const tileUrl = String.fromEnvironment('TILE_URL', defaultValue: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
const tileAttribution = String.fromEnvironment('TILE_ATTRIBUTION', defaultValue: '© contributeurs OpenStreetMap');

class TrackingScreen extends StatefulWidget {
  final String orderId;
  final bool isDriver;
  const TrackingScreen({super.key, required this.orderId, required this.isDriver});
  @override
  State<TrackingScreen> createState() => _TrackingState();
}

class _TrackingState extends State<TrackingScreen> {
  LatLng? pos;
  late io.Socket s;
  Timer? timer;
  final map = MapController();

  @override
  void initState() {
    super.initState();
    s = io.io('$apiUrl/tracking', io.OptionBuilder().setTransports(['websocket']).setAuth({'token': Api.token}).build());
    s.onConnect((_) => s.emitWithAck('join', {'orderId': widget.orderId}, ack: (d) {
          if (d is Map && d['lat'] != null && mounted) setState(() => pos = LatLng(d['lat'], d['lng']));
        }));
    s.on('position', (d) {
      if (!mounted) return;
      setState(() => pos = LatLng((d['lat'] as num).toDouble(), (d['lng'] as num).toDouble()));
    });
    if (widget.isDriver) startSharing();
  }

  Future<void> startSharing() async {
    var p = await Geolocator.checkPermission();
    if (p == LocationPermission.denied) p = await Geolocator.requestPermission();
    if (p == LocationPermission.denied || p == LocationPermission.deniedForever) return;
    timer = Timer.periodic(const Duration(seconds: 5), (_) async {
      final g = await Geolocator.getCurrentPosition();
      s.emit('position', {'orderId': widget.orderId, 'lat': g.latitude, 'lng': g.longitude});
    });
  }

  @override
  void dispose() {
    timer?.cancel();
    s.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext c) => Scaffold(
        appBar: AppBar(title: Text(widget.isDriver ? 'Partage de position actif' : 'Suivi en direct')),
        body: pos == null
            ? const Center(child: Text('En attente de la position du livreur…'))
            : FlutterMap(
                mapController: map,
                options: MapOptions(initialCenter: pos!, initialZoom: 14),
                children: [
                  TileLayer(urlTemplate: tileUrl, userAgentPackageName: 'cm.nexice.app'),
                  const RichAttributionWidget(attributions: [TextSourceAttribution(tileAttribution)]),
                  MarkerLayer(markers: [Marker(point: pos!, width: 44, height: 44, child: const Icon(Icons.local_shipping, color: Colors.green, size: 36))]),
                ],
              ),
      );
}
