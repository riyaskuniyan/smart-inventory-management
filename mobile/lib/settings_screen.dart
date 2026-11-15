
import 'package:flutter/material.dart';

const Color settingsBg = Color(0xFF080D0A);
const Color settingsSurface = Color(0xFF111A13);
const Color settingsLime = Color(0xFF9BE15D);
const Color settingsMuted = Color(0xFF91A092);

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool notificationsEnabled = true;
  bool soundEnabled = true;

  Widget settingsTile({
    required IconData icon,
    required String title,
    required String subtitle,
    Widget? trailing,
    VoidCallback? onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: settingsSurface,
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 17, vertical: 5),
        leading: Container(
          height: 42,
          width: 42,
          decoration: BoxDecoration(
            color: settingsLime.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(13),
          ),
          child: Icon(icon, color: settingsLime),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          subtitle,
          style: const TextStyle(color: settingsMuted, fontSize: 12),
        ),
        trailing: trailing,
      ),
    );
  }

  void showInformation(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: settingsSurface,
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: settingsBg,
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: settingsBg,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'PREFERENCES',
            style: TextStyle(
              color: settingsMuted,
              fontSize: 11,
              letterSpacing: 1.4,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 15),
          settingsTile(
            icon: Icons.notifications_active_outlined,
            title: 'Notifications',
            subtitle: 'Notification preference',
            trailing: Switch(
              value: notificationsEnabled,
activeThumbColor: settingsLime,              onChanged: (value) {
                setState(() => notificationsEnabled = value);
              },
            ),
          ),
          settingsTile(
            icon: Icons.volume_up_outlined,
            title: 'Sound',
            subtitle: 'Sound preference',
            trailing: Switch(
              value: soundEnabled,
activeThumbColor: settingsLime,              onChanged: (value) {
                setState(() => soundEnabled = value);
              },
            ),
          ),
          const SizedBox(height: 22),
          const Text(
            'SECURITY & INFORMATION',
            style: TextStyle(
              color: settingsMuted,
              fontSize: 11,
              letterSpacing: 1.4,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 15),
          settingsTile(
            icon: Icons.lock_outline,
            title: 'Privacy & Security',
            subtitle: 'Account and data security information',
            trailing: const Icon(Icons.chevron_right, color: settingsMuted),
            onTap: () => showInformation(
              'Privacy & Security',
              'Your login token is stored securely on this device. '
              'Always log out when using a shared device.',
            ),
          ),
          settingsTile(
            icon: Icons.info_outline,
            title: 'About Smart Inventory',
            subtitle: 'Application information',
            trailing: const Icon(Icons.chevron_right, color: settingsMuted),
            onTap: () => showInformation(
              'Smart Inventory',
              'Smart Inventory Management System\n\n'
              'Manage products, stock, customers, orders, billing and reports '
              'from one application.',
            ),
          ),
          const SizedBox(height: 25),
          const Center(
            child: Column(
              children: [
                Icon(Icons.inventory_2_rounded, color: settingsLime, size: 30),
                SizedBox(height: 9),
                Text(
                  'SMART INVENTORY',
                  style: TextStyle(
                    color: settingsLime,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.5,
                  ),
                ),
                SizedBox(height: 5),
                Text('Version 1.0.0', style: TextStyle(color: settingsMuted, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

