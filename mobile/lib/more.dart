import 'package:flutter/material.dart';
import 'api.dart';
import 'home.dart';
import 'ui.dart';

const badgeNames = {'GREEN': 'Vert', 'PURPLE': 'Violet', 'PINK': 'Rose'};
const badgeColors = {'GREEN': Colors.green, 'PURPLE': Colors.purple, 'PINK': Colors.pink};

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});
  @override
  Widget build(BuildContext c) => ListView(children: [
        ListTile(leading: const Icon(Icons.business), title: Text(Api.company ?? ''), subtitle: Text('Rôle : ${Api.role}')),
        if (Api.role != 'ADMIN' && Api.role != 'DRIVER') ...[
          ListTile(leading: const Icon(Icons.workspace_premium), title: const Text('Badges de certification'), onTap: () => Navigator.push(c, MaterialPageRoute(builder: (_) => const BadgesScreen()))),
        ],
        if (Api.role != 'ADMIN')
          ListTile(leading: const Icon(Icons.smart_toy), title: const Text('Assistant IA'), onTap: () => Navigator.push(c, MaterialPageRoute(builder: (_) => const AiScreen()))),
        ValueListenableBuilder<bool>(
          valueListenable: lightMode,
          builder: (_, v, __) => SwitchListTile(secondary: const Icon(Icons.speed), title: const Text('Mode léger'), subtitle: const Text('Affichage compact'), value: v, onChanged: (x) => lightMode.value = x),
        ),
        ListTile(leading: const Icon(Icons.logout), title: const Text('Se déconnecter'), onTap: () => doLogout(c)),
        if (Api.role != 'ADMIN')
          ListTile(
            leading: const Icon(Icons.delete_forever, color: Colors.red),
            title: const Text('Supprimer mon compte', style: TextStyle(color: Colors.red)),
            onTap: () async {
              final ok = await showDialog<bool>(
                context: c,
                builder: (_) => AlertDialog(
                  title: const Text('Supprimer le compte ?'),
                  content: const Text('Vos données personnelles seront effacées définitivement. L\'historique des commandes est conservé de façon anonymisée.'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Annuler')),
                    FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Supprimer')),
                  ],
                ),
              );
              if (ok != true || !c.mounted) return;
              await guard(c, () async {
                await Api.req('DELETE', 'auth/me');
                if (c.mounted) await doLogout(c);
              });
            },
          ),
      ]);
}

class BadgesScreen extends StatefulWidget {
  const BadgesScreen({super.key});
  @override
  State<BadgesScreen> createState() => _BadgesState();
}

class _BadgesState extends State<BadgesScreen> {
  late final Future<dynamic> f = Api.get('badges/plans');
  @override
  Widget build(BuildContext c) => Scaffold(
        appBar: AppBar(title: const Text('Badges')),
        body: FutureBuilder(
          future: f,
          builder: (_, s) {
            if (s.hasError) return Center(child: Text('${s.error}'));
            if (!s.hasData) return const Center(child: CircularProgressIndicator());
            return ListView(padding: const EdgeInsets.all(12), children: [
              const Text('Payez par Orange Money puis saisissez la référence de transaction : un administrateur confirme et active votre badge (valable 1 an).'),
              for (final p in s.data as List)
                Card(
                  child: ListTile(
                    leading: Icon(Icons.workspace_premium, color: badgeColors[p['color']]),
                    title: Text('Badge ${badgeNames[p['color']]}'),
                    subtitle: Text(fcfa(p['price'])),
                    trailing: FilledButton(
                      onPressed: () async {
                        final r = await askText(c, 'Référence Orange Money', hint: 'ID de la transaction');
                        if (r == null || r.isEmpty || !c.mounted) return;
                        await guard(c, () async {
                          await Api.post('badges/request', {'color': p['color'], 'omReference': r});
                          if (c.mounted) ScaffoldMessenger.of(c).showSnackBar(const SnackBar(content: Text('Demande envoyée, en attente de confirmation')));
                        });
                      },
                      child: const Text('Demander'),
                    ),
                  ),
                ),
            ]);
          },
        ),
      );
}

class AiScreen extends StatefulWidget {
  const AiScreen({super.key});
  @override
  State<AiScreen> createState() => _AiState();
}

class _AiState extends State<AiScreen> {
  final q = TextEditingController();
  final msgs = <(bool, String)>[];
  bool busy = false;

  Future<void> send() async {
    final t = q.text.trim();
    if (t.isEmpty) return;
    setState(() { msgs.add((true, t)); busy = true; });
    q.clear();
    await guard(context, () async {
      final r = await Api.post('ai/ask', {'question': t});
      setState(() => msgs.add((false, r['answer'])));
    });
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext c) => Scaffold(
        appBar: AppBar(title: const Text('Assistant NeXice')),
        body: Column(children: [
          Expanded(
            child: ListView(padding: const EdgeInsets.all(12), children: [
              for (final m in msgs)
                Align(
                  alignment: m.$1 ? Alignment.centerRight : Alignment.centerLeft,
                  child: Card(color: m.$1 ? Theme.of(c).colorScheme.primaryContainer : null, child: Padding(padding: const EdgeInsets.all(10), child: Text(m.$2))),
                ),
              if (busy) const Center(child: CircularProgressIndicator()),
            ]),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Row(children: [
                Expanded(child: TextField(controller: q, decoration: const InputDecoration(hintText: 'Posez votre question…', border: OutlineInputBorder()), onSubmitted: (_) => send())),
                IconButton(onPressed: busy ? null : send, icon: const Icon(Icons.send)),
              ]),
            ),
          ),
        ]),
      );
}

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});
  @override
  State<AdminScreen> createState() => _AdminState();
}

class _AdminState extends State<AdminScreen> {
  late Future<List<dynamic>> f = load();
  Future<List<dynamic>> load() async => [await Api.get('admin/users'), await Api.get('admin/badges'), await Api.get('admin/stats')];
  void reload() => setState(() => f = load());

  Future<void> act(String path) => guard(context, () async {
        await Api.patch(path);
        reload();
      });

  @override
  Widget build(BuildContext c) => RefreshIndicator(
        onRefresh: () async => reload(),
        child: FutureBuilder(
          future: f,
          builder: (_, s) {
            if (s.hasError) return Center(child: Text('${s.error}'));
            if (!s.hasData) return const Center(child: CircularProgressIndicator());
            final d = s.data!;
            final st = d[2] as Map;
            return ListView(children: [
              ListTile(title: Text('${st['users']} utilisateurs • ${st['orders']} commandes')),
              const ListTile(title: Text('Profils à valider', style: TextStyle(fontWeight: FontWeight.bold))),
              for (final u in d[0] as List)
                Card(
                  child: ListTile(
                    title: Text('${u['company']} (${u['role']})'),
                    subtitle: Text('${u['email']} • ${u['phone'] ?? ''}'),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      IconButton(icon: const Icon(Icons.check_circle, color: Colors.green), onPressed: () => act('admin/users/${u['id']}/approve')),
                      IconButton(icon: const Icon(Icons.cancel, color: Colors.red), onPressed: () => act('admin/users/${u['id']}/reject')),
                    ]),
                  ),
                ),
              const ListTile(title: Text('Paiements de badges', style: TextStyle(fontWeight: FontWeight.bold))),
              for (final b in d[1] as List)
                Card(
                  child: ListTile(
                    title: Text('${b['userEmail']} • Badge ${badgeNames[b['color']]}'),
                    subtitle: Text('${fcfa(b['amount'])} • Réf. OM : ${b['omReference']}'),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      IconButton(icon: const Icon(Icons.check_circle, color: Colors.green), onPressed: () => act('admin/badges/${b['id']}/confirm')),
                      IconButton(icon: const Icon(Icons.cancel, color: Colors.red), onPressed: () => act('admin/badges/${b['id']}/reject')),
                    ]),
                  ),
                ),
            ]);
          },
        ),
      );
}
