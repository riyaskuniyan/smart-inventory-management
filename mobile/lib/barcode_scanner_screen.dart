
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import 'main.dart';

class BarcodeScannerScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final FlutterSecureStorage storage;

  const BarcodeScannerScreen({
    super.key,
    required this.user,
    required this.storage,
  });

  @override
  State<BarcodeScannerScreen> createState() =>
      _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen> {
  late final MobileScannerController scannerController;
  late final Dio dio;

  bool isSearching = false;
  String? scannedCode;
  String? errorMessage;
  Map<String, dynamic>? product;

  @override
  void initState() {
    super.initState();

    scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      returnImage: false,
    );

    dio = Dio(
      BaseOptions(
        baseUrl: apiUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
      ),
    );
  }

  Future<void> onBarcodeDetected(BarcodeCapture capture) async {
    if (isSearching || product != null || errorMessage != null) {
      return;
    }

    String? code;

    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue?.trim();

      if (value != null && value.isNotEmpty) {
        code = value;
        break;
      }
    }

    if (code == null) return;

    setState(() {
      isSearching = true;
      scannedCode = code;
    });

    await scannerController.stop();

    await findProduct(code);
  }

  Future<void> findProduct(String code) async {
    try {
      final token = await widget.storage.read(key: 'auth_token');

      if (token == null || token.isEmpty) {
        throw Exception('Session expired. Please log in again.');
      }

      final response = await dio.get(
        '/products',
        queryParameters: {'barcode': code},
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      final data = response.data;

      if (data is! Map || data['success'] != true) {
        throw Exception('Invalid response from server.');
      }

      final products = data['products'];

      if (products is! List || products.isEmpty) {
        if (!mounted) return;

        setState(() {
          errorMessage = 'No product found for this barcode.';
          isSearching = false;
        });

        return;
      }

      final foundProduct = Map<String, dynamic>.from(products.first);

      if (!mounted) return;

      setState(() {
        product = foundProduct;
        isSearching = false;
      });
    } on DioException catch (error) {
      if (!mounted) return;

      setState(() {
        errorMessage = error.response?.data is Map
            ? error.response?.data['message']?.toString() ??
                'Unable to search product.'
            : 'Cannot connect to the inventory server.';
        isSearching = false;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        errorMessage = error.toString().replaceFirst('Exception: ', '');
        isSearching = false;
      });
    }
  }

  Future<void> scanAgain() async {
    setState(() {
      product = null;
      errorMessage = null;
      scannedCode = null;
      isSearching = false;
    });

    await scannerController.start();
  }

  @override
  void dispose() {
    scannerController.dispose();
    super.dispose();
  }

  Widget detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(color: muted, fontSize: 14),
          ),
          const SizedBox(width: 15),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget resultCard() {
    if (product == null) return const SizedBox.shrink();

    final quantity = product!['quantity'] ?? 0;
    final price = product!['price'] ?? 0;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(21),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: lime.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.check_circle, color: lime, size: 23),
              SizedBox(width: 9),
              Text(
                'PRODUCT FOUND',
                style: TextStyle(
                  color: lime,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            product!['name']?.toString() ?? 'Unnamed product',
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          detailRow('SKU', product!['sku']?.toString() ?? '-'),
          detailRow('Barcode', product!['barcode']?.toString() ?? '-'),
          detailRow('Category', product!['category']?.toString() ?? '-'),
          detailRow('Price', '₹$price'),
          detailRow('Available quantity', '$quantity'),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: scanAgain,
              icon: const Icon(Icons.qr_code_scanner_rounded),
              label: const Text('SCAN ANOTHER PRODUCT'),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Barcode Scanner',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text(
              'SCAN PRODUCT BARCODE',
              style: TextStyle(
                color: lime,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Point your camera at a product barcode to find it in your inventory.',
              style: TextStyle(color: muted, fontSize: 14),
            ),
            const SizedBox(height: 22),

            if (product == null && errorMessage == null) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(22),
                child: SizedBox(
                  height: 330,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      MobileScanner(
                        controller: scannerController,
                        onDetect: onBarcodeDetected,
                      ),
                      IgnorePointer(
                        child: Center(
                          child: Container(
                            width: 250,
                            height: 150,
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: lime,
                                width: 3,
                              ),
                              borderRadius: BorderRadius.circular(18),
                            ),
                          ),
                        ),
                      ),
                      if (isSearching)
                        Container(
                          color: Colors.black.withValues(alpha: 0.7),
                          child: const Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                CircularProgressIndicator(color: lime),
                                SizedBox(height: 15),
                                Text('Searching inventory...'),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (scannedCode != null)
                Text(
                  'Scanned: $scannedCode',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: muted),
                ),
            ],

            if (errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: Colors.redAccent.withValues(alpha: 0.5),
                  ),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.error_outline_rounded,
                      color: Colors.redAccent,
                      size: 42,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      errorMessage!,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 18),
                    ElevatedButton(
                      onPressed: scanAgain,
                      child: const Text('TRY AGAIN'),
                    ),
                  ],
                ),
              ),
            ],

            if (product != null) resultCard(),
          ],
        ),
      ),
    );
  }
}
