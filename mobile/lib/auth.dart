import 'package:flutter/material.dart';
import 'api.dart';
import 'home.dart';
import 'ui.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});
  @override
  State<AuthScreen> createState() => _AuthState();
}

class _AuthState extends State<AuthScreen> {
  final email = TextEditingController(), pass = TextEditingController(), company = TextEditingController(), phone = TextEditingController();
  bool register = false, busy = false;
  String role = 'BUYER';

  Future<void> submit() async {
    setState(() => busy = true);
    await guard(context, () async {
      if (register) {
        final d = await Api.post('auth/register', {
          'email': email.text.trim(), 'password': pass.text, 'role': role, 'company': company.text.trim(),
          if (phone.text.isNotEmpty) 'phone': phone.text.trim(),
        });
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(d['message'])));
        setState(() => register = false);
      } else {
        await Api.login(email.text.trim(), pass.text);
        if (!mounted) return;
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const HomeShell()));
      }
    });
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext c) => Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(children: [
                const Text('NeXice', style: TextStyle(fontSize: 38, fontWeight: FontWeight.bold)),
                const Text('Le commerce entre professionnels, en toute confiance'),
                const SizedBox(height: 24),
                if (register) ...[
                  DropdownButtonFormField<String>(
                    value: role,
                    decoration: const InputDecoration(labelText: 'Je suis'),
                    items: const [
                      DropdownMenuItem(value: 'BUYER', child: Text('Acheteur')),
                      DropdownMenuItem(value: 'SELLER', child: Text('Vendeur / Fournisseur')),
                      DropdownMenuItem(value: 'DRIVER', child: Text('Livreur')),
                    ],
                    onChanged: (v) => setState(() => role = v!),
                  ),
                  TextField(controller: company, decoration: const InputDecoration(labelText: 'Entreprise / Nom commercial')),
                  TextField(controller: phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Téléphone')),
                ],
                TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
                TextField(controller: pass, obscureText: true, decoration: InputDecoration(labelText: 'Mot de passe${register ? ' (8 caractères min.)' : ''}')),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: busy ? null : submit,
                    child: busy ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Text(register ? 'Créer mon compte' : 'Connexion'),
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() => register = !register),
                  child: Text(register ? 'J\'ai déjà un compte' : 'Créer un compte professionnel'),
                ),
              ]),
            ),
          ),
        ),
      );
}
