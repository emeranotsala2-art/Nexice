import 'package:flutter/material.dart';
import 'api.dart';
import 'auth.dart';
import 'home.dart';
import 'ui.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Api.restore();
  runApp(const NexiceApp());
}

class NexiceApp extends StatelessWidget {
  const NexiceApp({super.key});
  @override
  Widget build(BuildContext context) => ValueListenableBuilder<bool>(
        valueListenable: lightMode,
        builder: (_, light, __) => MaterialApp(
          title: 'NeXice',
          debugShowCheckedModeBanner: false,
          scaffoldMessengerKey: messengerKey,
          theme: ThemeData(
            colorSchemeSeed: const Color(0xFF0E7C66),
            useMaterial3: true,
            visualDensity: light ? VisualDensity.compact : VisualDensity.standard,
            cardTheme: const CardTheme(margin: EdgeInsets.symmetric(horizontal: 12, vertical: 6)),
          ),
          home: Api.token == null ? const AuthScreen() : const HomeShell(),
        ),
      );
}
