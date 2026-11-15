
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'products_screen.dart';
import 'stock_screen.dart';
import 'customers_screen.dart';
import 'orders_screen.dart';
import 'barcode_scanner_screen.dart';
import 'reports_screen.dart';
import 'profile_screen.dart';
import 'settings_screen.dart';

const Color bg = Color(0xFF080D0A);
const Color surface = Color(0xFF111A13);
const Color surfaceLight = Color(0xFF1A261C);
const Color lime = Color(0xFF9BE15D);
const Color limeBright = Color(0xFFB5F56B);
const Color muted = Color(0xFF91A092);

const String apiUrl = 'http://10.0.2.2:5000/api';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SmartInventoryApp());
}

// ==========================================
// MAIN APP
// ==========================================

class SmartInventoryApp extends StatelessWidget {
  const SmartInventoryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Smart Inventory',
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: bg,
        colorScheme: const ColorScheme.dark(
          primary: lime,
          secondary: limeBright,
          surface: surface,
          error: Color(0xFFFF6969),
        ),
        fontFamily: 'Roboto',
        appBarTheme: const AppBarTheme(
          backgroundColor: bg,
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: surfaceLight,
          hintStyle: const TextStyle(color: muted),
          prefixIconColor: lime,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 18,
            vertical: 18,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(
              color: Colors.white.withValues(alpha: 0.06),
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: lime),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: lime,
            foregroundColor: const Color(0xFF10190E),
            elevation: 0,
            padding: const EdgeInsets.symmetric(vertical: 17),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            textStyle: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
        ),
      ),
      home: const LoginScreen(),
    );
  }
}

// ==========================================
// LOGIN SCREEN
// ==========================================

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();

  final storage = const FlutterSecureStorage();

  late final Dio dio;

  bool isLoading = false;
  bool obscurePassword = true;

  @override
  void initState() {
    super.initState();

    dio = Dio(
      BaseOptions(
        baseUrl: apiUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 15),
        headers: {'Content-Type': 'application/json'},
      ),
    );
  }

  Future<void> login() async {
    if (isLoading) return;

    final email = emailController.text.trim();
    final password = passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      showMessage('Please enter email and password');
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() => isLoading = true);

    try {
      final response = await dio.post(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
        },
      );

      final data = response.data;

      if (data is! Map || data['success'] != true) {
        showMessage(
          data is Map
              ? data['message']?.toString() ?? 'Login failed'
              : 'Invalid server response',
        );
        return;
      }

      if (data['user'] is! Map) {
        showMessage('Invalid user data received from server.');
        return;
      }

      final token = data['token']?.toString();

      if (token == null || token.isEmpty) {
        showMessage('Login token was not received.');
        return;
      }

      final user = Map<String, dynamic>.from(data['user']);

      await storage.write(
        key: 'auth_token',
        value: token,
      );

      if (!mounted) return;

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => DashboardScreen(
            user: user,
            storage: storage,
          ),
        ),
      );
    } on DioException catch (error) {
      debugPrint('LOGIN ERROR: $error');

      final responseData = error.response?.data;

      final message = responseData is Map
          ? responseData['message']?.toString() ?? 'Login failed'
          : error.type == DioExceptionType.connectionTimeout
              ? 'Connection timed out. Check your backend.'
              : error.type == DioExceptionType.connectionError
                  ? 'Cannot connect to server. Check your backend.'
                  : 'Login request failed. Please try again.';

      showMessage(message);
    } catch (error) {
      debugPrint('LOGIN ERROR: $error');
      showMessage('Login error: $error');
    } finally {
      if (mounted) {
        setState(() => isLoading = false);
      }
    }
  }

  void showMessage(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor: surfaceLight,
      ),
    );
  }

  Widget fieldLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: Text(
        text,
        style: const TextStyle(
          fontWeight: FontWeight.w600,
          color: Colors.white70,
        ),
      ),
    );
  }

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF172719),
              bg,
              Color(0xFF080D0A),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(25),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 30),
                    Container(
                      height: 82,
                      width: 82,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: lime.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(25),
                        border: Border.all(
                          color: lime.withValues(alpha: 0.25),
                        ),
                      ),
                      child: const Icon(
                        Icons.inventory_2_rounded,
                        size: 42,
                        color: lime,
                      ),
                    ),
                    const SizedBox(height: 25),
                    const Text(
                      'SMART INVENTORY',
                      style: TextStyle(
                        fontSize: 27,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'INVENTORY & ORDER MANAGEMENT',
                      style: TextStyle(
                        color: lime,
                        fontSize: 11,
                        letterSpacing: 2,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 55),
                    const Text(
                      'Welcome back.',
                      style: TextStyle(
                        fontSize: 31,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 9),
                    const Text(
                      'Sign in to manage your business.',
                      style: TextStyle(color: muted, fontSize: 14),
                    ),
                    const SizedBox(height: 35),
                    fieldLabel('Email Address'),
                    TextField(
                      controller: emailController,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        hintText: 'Enter your email',
                        prefixIcon: Icon(Icons.email_outlined),
                      ),
                    ),
                    const SizedBox(height: 23),
                    fieldLabel('Password'),
                    TextField(
                      controller: passwordController,
                      obscureText: obscurePassword,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => login(),
                      decoration: InputDecoration(
                        hintText: 'Enter your password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          onPressed: () {
                            setState(() {
                              obscurePassword = !obscurePassword;
                            });
                          },
                          icon: Icon(
                            obscurePassword
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 30),
                    SizedBox(
                      height: 56,
                      child: ElevatedButton(
                        onPressed: isLoading ? null : login,
                        child: isLoading
                            ? const SizedBox(
                                height: 22,
                                width: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.black,
                                ),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text('SIGN IN'),
                                  SizedBox(width: 10),
                                  Icon(Icons.arrow_forward_rounded),
                                ],
                              ),
                      ),
                    ),
                    const SizedBox(height: 28),
                    const Text(
                      'SECURE ACCESS  •  ADMIN  •  MANAGER  •  STAFF',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: muted,
                        fontSize: 10,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ==========================================
// DASHBOARD SCREEN
// ==========================================

class DashboardScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final FlutterSecureStorage storage;

  const DashboardScreen({
    super.key,
    required this.user,
    required this.storage,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic> stats = {};

  bool isLoading = true;
  String? errorMessage;

  late final Dio dio;

  @override
  void initState() {
    super.initState();

    dio = Dio(
      BaseOptions(
        baseUrl: apiUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 15),
      ),
    );

    fetchDashboard();
  }

  Future<void> fetchDashboard() async {
    if (!mounted) return;

    setState(() {
      isLoading = true;
      errorMessage = null;
    });

    try {
      final token = await widget.storage.read(
        key: 'auth_token',
      );

      if (token == null || token.isEmpty) {
        throw Exception('Please log in again.');
      }

      final response = await dio.get(
        '/dashboard',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      final data = response.data;

      if (data is! Map || data['success'] != true) {
        throw Exception('Could not load dashboard data.');
      }

      final receivedStats = data['stats'];

      if (receivedStats is! Map) {
        throw Exception('Invalid dashboard response.');
      }

      if (!mounted) return;

      setState(() {
        stats = Map<String, dynamic>.from(receivedStats);
      });
    } on DioException catch (error) {
      debugPrint('DASHBOARD ERROR: $error');

      if (!mounted) return;

      setState(() {
        errorMessage = error.response?.statusCode == 401
            ? 'Session expired. Please log in again.'
            : 'Unable to connect to dashboard API.';
      });
    } catch (error) {
      debugPrint('DASHBOARD ERROR: $error');

      if (!mounted) return;

      setState(() {
        errorMessage = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => isLoading = false);
      }
    }
  }

  Future<void> logout() async {
    try {
      await widget.storage.delete(key: 'auth_token');

      if (!mounted) return;

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(
          builder: (_) => const LoginScreen(),
        ),
        (route) => false,
      );
    } catch (error) {
      debugPrint('LOGOUT ERROR: $error');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to log out.')),
        );
      }
    }
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  void openProducts() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProductsScreen(
          user: widget.user,
          storage: widget.storage,
        ),
      ),
    );
  }

  void openStock() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => StockScreen(
          user: widget.user,
          storage: widget.storage,
        ),
      ),
    );
  }

  void openCustomers() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CustomersScreen(
          user: widget.user,
          storage: widget.storage,
        ),
      ),
    );
  }

  void openOrders() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => OrdersScreen(
          user: widget.user,
          storage: widget.storage,
        ),
      ),
    );
  }

  void openBarcodeScanner() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BarcodeScannerScreen(
          user: widget.user,
          storage: widget.storage,
        ),
      ),
    );
  }

  // Only ONE Reports navigation function.
  void openReports() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ReportsScreen(
          user: widget.user,
          storage: widget.storage,
        ),
      ),
    );
  }
  void openProfile() {
  Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => ProfileScreen(
        user: widget.user,
        onLogout: logout,
      ),
    ),
  );
}

void openSettings() {
  Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => const SettingsScreen(),
    ),
  );
}

  // ==========================================
  // DASHBOARD WIDGETS
  // ==========================================

  Widget statCard(
    String title,
    String value,
    IconData icon,
    Color iconColor,
  ) {
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF1D2B20),
            Color(0xFF111A13),
          ],
        ),
        borderRadius: BorderRadius.circular(23),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.07),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.18),
            blurRadius: 15,
            offset: const Offset(0, 7),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            height: 39,
            width: 39,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 25,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
          ),
          Text(
            title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: muted,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget sectionTitle(String title, {String? subtitle}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 19,
            fontWeight: FontWeight.bold,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 5),
          Text(
            subtitle,
            style: const TextStyle(
              color: muted,
              fontSize: 12,
            ),
          ),
        ],
      ],
    );
  }

  // ==========================================
  // BOTTOM NAVIGATION
  // ==========================================

  Widget bottomNavigationItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(15),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 7),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                color: lime,
                size: 25,
              ),
              const SizedBox(height: 5),
              Text(
                label,
                style: const TextStyle(
                  color: lime,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget buildBottomNavigationBar() {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: 10,
          vertical: 10,
        ),
        decoration: BoxDecoration(
          color: surface,
          border: Border(
            top: BorderSide(
              color: Colors.white.withValues(alpha: 0.08),
            ),
          ),
        ),
        child: Row(
          children: [
            bottomNavigationItem(
              icon: Icons.inventory_2_rounded,
              label: 'Products',
              onTap: openProducts,
            ),
            bottomNavigationItem(
              icon: Icons.swap_vert_circle_rounded,
              label: 'Stock',
              onTap: openStock,
            ),
            bottomNavigationItem(
              icon: Icons.people_alt_rounded,
              label: 'Customers',
              onTap: openCustomers,
            ),
            bottomNavigationItem(
              icon: Icons.shopping_bag_rounded,
              label: 'Orders',
              onTap: openOrders,
            ),
            bottomNavigationItem(
              icon: Icons.qr_code_scanner_rounded,
              label: 'Scanner',
              onTap: openBarcodeScanner,
            ),
            bottomNavigationItem(
              icon: Icons.analytics_rounded,
              label: 'Reports',
              onTap: openReports,
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // DASHBOARD BUILD
  // ==========================================

  @override
  Widget build(BuildContext context) {
    final name = widget.user['name']?.toString() ?? 'User';
    final role = widget.user['role']?.toString() ?? 'staff';

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: const Row(
          children: [
            Icon(
              Icons.inventory_2_rounded,
              color: lime,
              size: 23,
            ),
            SizedBox(width: 10),
            Text(
              'Smart Inventory',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
       actions: [
  IconButton(
    tooltip: 'Profile',
    onPressed: openProfile,
    icon: const Icon(Icons.account_circle_outlined),
  ),
  IconButton(
    tooltip: 'Settings',
    onPressed: openSettings,
    icon: const Icon(Icons.settings_outlined),
  ),
  IconButton(
    tooltip: 'Refresh',
    onPressed: isLoading ? null : fetchDashboard,
    icon: const Icon(Icons.refresh_rounded),
  ),
  IconButton(
    tooltip: 'Logout',
    onPressed: logout,
    icon: const Icon(Icons.logout_rounded),
  ),
  const SizedBox(width: 7),
],
      ),
      body: RefreshIndicator(
        color: lime,
        backgroundColor: surface,
        onRefresh: fetchDashboard,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 15, 20, 25),
          children: [
            Container(
              padding: const EdgeInsets.all(21),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(25),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF344C2A),
                    Color(0xFF17251A),
                    Color(0xFF101A12),
                  ],
                ),
                border: Border.all(
                  color: lime.withValues(alpha: 0.13),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        height: 40,
                        width: 40,
                        decoration: BoxDecoration(
                          color: lime.withValues(alpha: 0.17),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.person_rounded,
                          color: lime,
                        ),
                      ),
                      const SizedBox(width: 11),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'SYSTEM ${role.toUpperCase()}',
                              style: const TextStyle(
                                color: lime,
                                fontSize: 10,
                                letterSpacing: 1.2,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(
                        Icons.verified_user_outlined,
                        color: lime,
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),
                  const Text(
                    'OWN YOUR\nINVENTORY.',
                    style: TextStyle(
                      fontSize: 30,
                      height: 1.12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.8,
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Your business operations, all in one place.',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 29),
            sectionTitle(
              'Business Overview',
              subtitle: 'Your live inventory performance',
            ),
            const SizedBox(height: 16),
            if (isLoading)
              const Padding(
                padding: EdgeInsets.all(45),
                child: Center(
                  child: CircularProgressIndicator(color: lime),
                ),
              )
            else if (errorMessage != null)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.redAccent),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.error_outline,
                      color: Colors.redAccent,
                      size: 35,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      errorMessage!,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: fetchDashboard,
                      child: const Text('Try Again'),
                    ),
                  ],
                ),
              )
            else
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 13,
                mainAxisSpacing: 13,
                childAspectRatio: 1.12,
                children: [
                  statCard(
                    'Total Products',
                    '${stats['totalProducts'] ?? 0}',
                    Icons.inventory_2_rounded,
                    lime,
                  ),
                  statCard(
                    'Total Customers',
                    '${stats['totalCustomers'] ?? 0}',
                    Icons.people_alt_rounded,
                    const Color(0xFF8DD9A2),
                  ),
                  statCard(
                    'Total Orders',
                    '${stats['totalOrders'] ?? 0}',
                    Icons.shopping_bag_rounded,
                    const Color(0xFFB6D76D),
                  ),
                  statCard(
                    'Low Stock Items',
                    '${stats['lowStockProducts'] ?? 0}',
                    Icons.warning_amber_rounded,
                    const Color(0xFFFFB45C),
                  ),
                  statCard(
                    'Total Users',
                    '${stats['totalUsers'] ?? 0}',
                    Icons.groups_rounded,
                    const Color(0xFF80CFA0),
                  ),
                  statCard(
                    'Total Sales',
                    '₹${stats['totalSales'] ?? 0}',
                    Icons.currency_rupee_rounded,
                    limeBright,
                  ),
                ],
              ),
            const SizedBox(height: 35),
            Center(
              child: Column(
                children: [
                  const Icon(
                    Icons.eco_rounded,
                    color: lime,
                    size: 23,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'SMART INVENTORY MANAGEMENT',
                    style: TextStyle(
                      color: muted,
                      fontSize: 10,
                      letterSpacing: 1.5,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 5),
                  const Text(
                    'Manage smarter. Grow faster.',
                    style: TextStyle(
                      color: muted,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: buildBottomNavigationBar(),
    );
  }
}
