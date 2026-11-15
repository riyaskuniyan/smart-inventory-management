
import 'package:flutter/material.dart';

const Color profileBg = Color(0xFF080D0A);
const Color profileSurface = Color(0xFF111A13);
const Color profileLime = Color(0xFF9BE15D);
const Color profileMuted = Color(0xFF91A092);

class ProfileScreen extends StatelessWidget {
  final Map<String, dynamic> user;
  final VoidCallback onLogout;

  const ProfileScreen({
    super.key,
    required this.user,
    required this.onLogout,
  });

  Widget detailTile(String label, String value, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 13),
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: profileSurface,
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Row(
        children: [
          Icon(icon, color: profileLime, size: 22),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: profileMuted, fontSize: 12)),
                const SizedBox(height: 5),
                Text(
                  value.isEmpty ? 'Not provided' : value,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final name = user['name']?.toString() ?? 'User';
    final email = user['email']?.toString() ?? '';
    final role = user['role']?.toString() ?? 'staff';
    final phone = user['phone']?.toString() ?? '';

    return Scaffold(
      backgroundColor: profileBg,
      appBar: AppBar(
        title: const Text('My Profile'),
        backgroundColor: profileBg,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const SizedBox(height: 15),
          Center(
            child: Container(
              height: 100,
              width: 100,
              decoration: BoxDecoration(
                color: profileLime.withValues(alpha: 0.13),
                shape: BoxShape.circle,
                border: Border.all(color: profileLime.withValues(alpha: 0.4)),
              ),
              child: const Icon(Icons.person_rounded, color: profileLime, size: 55),
            ),
          ),
          const SizedBox(height: 17),
          Center(
            child: Text(
              name,
              style: const TextStyle(fontSize: 23, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 7),
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 7),
              decoration: BoxDecoration(
                color: profileLime.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(30),
              ),
              child: Text(
                role.toUpperCase(),
                style: const TextStyle(
                  color: profileLime,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                  fontSize: 11,
                ),
              ),
            ),
          ),
          const SizedBox(height: 32),
          const Text(
            'ACCOUNT INFORMATION',
            style: TextStyle(
              color: profileMuted,
              fontSize: 11,
              letterSpacing: 1.4,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 15),
          detailTile('Full Name', name, Icons.person_outline),
          detailTile('Email Address', email, Icons.email_outlined),
          detailTile('Phone Number', phone, Icons.phone_outlined),
          detailTile('Account Role', role.toUpperCase(), Icons.verified_user_outlined),
          const SizedBox(height: 20),
          SizedBox(
            height: 54,
            child: ElevatedButton.icon(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (dialogContext) => AlertDialog(
                    backgroundColor: profileSurface,
                    title: const Text('Log out?'),
                    content: const Text('Are you sure you want to log out?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(dialogContext),
                        child: const Text('Cancel'),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.pop(dialogContext);
                          onLogout();
                        },
                        child: const Text('Log Out'),
                      ),
                    ],
                  ),
                );
              },
              icon: const Icon(Icons.logout_rounded),
              label: const Text('LOG OUT'),
            ),
          ),
        ],
      ),
    );
  }
}
