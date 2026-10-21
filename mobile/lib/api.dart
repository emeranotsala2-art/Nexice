import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://192.168.10.1:3000');

class ApiError implements Exception {
  final String message;
  ApiError(this.message);
  @override
  String toString() => message;
}

class Api {
  static String? token, role, userId, badge, company;

  static Future<void> restore() async {
    final p = await SharedPreferences.getInstance();
    token = p.getString('token');
    role = p.getString('role');
    userId = p.getString('userId');
    badge = p.getString('badge');
    company = p.getString('company');
  }

  static Future<void> logout() async {
    token = role = userId = badge = company = null;
    await (await SharedPreferences.getInstance()).clear();
  }

  static Future<dynamic> req(String method, String path, [Map<String, dynamic>? body]) async {
    final r = http.Request(method, Uri.parse('$apiUrl/api/$path'));
    r.headers['Content-Type'] = 'application/json';
    if (token != null) r.headers['Authorization'] = 'Bearer $token';
    if (body != null) r.body = jsonEncode(body);
    http.Response res;
    try {
      res = await http.Response.fromStream(await r.send().timeout(const Duration(seconds: 20)));
    } catch (_) {
      throw ApiError('Connexion impossible au serveur');
    }
    final data = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 300) {
      final m = data is Map ? data['message'] : null;
      throw ApiError(m is List ? m.join('\n') : (m?.toString() ?? 'Erreur ${res.statusCode}'));
    }
    return data;
  }

  static Future<dynamic> get(String p) => req('GET', p);
  static Future<dynamic> post(String p, Map<String, dynamic> b) => req('POST', p, b);
  static Future<dynamic> patch(String p, [Map<String, dynamic>? b]) => req('PATCH', p, b ?? {});
  static Future<dynamic> put(String p, Map<String, dynamic> b) => req('PUT', p, b);

  static Future<void> login(String email, String pass) async {
    final d = await post('auth/login', {'email': email, 'password': pass});
    token = d['token'];
    role = d['role'];
    userId = d['id'];
    badge = d['badge'];
    company = d['company'];
    final p = await SharedPreferences.getInstance();
    await p.setString('token', token!);
    await p.setString('role', role!);
    await p.setString('userId', userId!);
    await p.setString('company', company ?? '');
    if (badge != null) await p.setString('badge', badge!);
  }
}
