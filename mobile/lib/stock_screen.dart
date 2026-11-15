
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

const Color bg = Color(0xFF080D0A);
const Color surface = Color(0xFF111A13);
const Color surfaceLight = Color(0xFF1A261C);
const Color lime = Color(0xFF9BE15D);
const Color limeBright = Color(0xFFB5F56B);
const Color muted = Color(0xFF91A092);

class StockScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final FlutterSecureStorage storage;

  const StockScreen({
    super.key,
    required this.user,
    required this.storage,
  });

  @override
  State<StockScreen> createState() => _StockScreenState();
}

class _StockScreenState extends State<StockScreen>
    with SingleTickerProviderStateMixin {
  late final Dio dio;
  late final TabController tabController;

  List<Map<String, dynamic>> products = [];
  List<Map<String, dynamic>> lowStockProducts = [];
  List<Map<String, dynamic>> movements = [];

  bool loading = true;
  String? errorMessage;
  bool _stockFormOpen = false;

  @override
  void initState() {
    super.initState();

    dio = Dio(BaseOptions(
      baseUrl: 'http://10.0.2.2:5000/api',
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      sendTimeout: const Duration(seconds: 15),
    ));

    tabController = TabController(length: 3, vsync: this);
    loadAll();
  }

  Future<Options> authOptions() async {
    final token = await widget.storage.read(key: 'auth_token');

    if (token == null || token.isEmpty) {
      throw Exception('Session expired. Please log in again.');
    }

    return Options(
      headers: {'Authorization': 'Bearer $token'},
    );
  }

  List<Map<String, dynamic>> parseList(dynamic value) {
    if (value is! List) return [];

    return value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Future<void> loadAll() async {
    if (!mounted) return;

    setState(() {
      loading = true;
      errorMessage = null;
    });

    try {
      final options = await authOptions();

      final responses = await Future.wait([
        dio.get('/products', options: options),
        dio.get('/stock/low-stock', options: options),
        dio.get('/stock/history', options: options),
      ]);

      if (!mounted) return;

      setState(() {
        products = parseList(
          responses[0].data is Map
              ? responses[0].data['products']
              : null,
        );

        lowStockProducts = parseList(
          responses[1].data is Map
              ? responses[1].data['products']
              : null,
        );

        movements = parseList(
          responses[2].data is Map
              ? responses[2].data['movements']
              : null,
        );
      });
    } on DioException catch (error) {
      if (!mounted) return;

      final data = error.response?.data;

      setState(() {
        errorMessage = data is Map
            ? data['message']?.toString() ??
                'Unable to load stock data.'
            : 'Cannot connect to the server.';
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        errorMessage =
            error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => loading = false);
      }
    }
  }

  void message(String text) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
        behavior: SnackBarBehavior.floating,
        backgroundColor: surfaceLight,
      ),
    );
  }

  int get totalUnits => products.fold<int>(
        0,
        (sum, p) =>
            sum + (int.tryParse(p['quantity']?.toString() ?? '0') ?? 0),
      );

  String productName(dynamic product) {
    return product is Map
        ? product['name']?.toString() ?? 'Unknown product'
        : 'Unknown product';
  }

  String productSku(dynamic product) {
    return product is Map
        ? product['sku']?.toString() ?? '-'
        : '-';
  }

  String dateText(dynamic value) {
    if (value == null) return '-';

    final date = DateTime.tryParse(value.toString());

    if (date == null) return value.toString();

    final d = date.toLocal();

    return '${d.day.toString().padLeft(2, '0')}/'
        '${d.month.toString().padLeft(2, '0')}/${d.year}  '
        '${d.hour.toString().padLeft(2, '0')}:'
        '${d.minute.toString().padLeft(2, '0')}';
  }

  Widget sectionTitle(String title, String subtitle) {
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
        const SizedBox(height: 5),
        Text(
          subtitle,
          style: const TextStyle(
            color: muted,
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget summaryCard(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1D2B20), surface],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.07),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.13),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 19),
          ),
          const SizedBox(height: 9),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: muted,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration fieldDecoration(String label, {String? hint}) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      filled: true,
      fillColor: surfaceLight,
      labelStyle: const TextStyle(color: muted),
      hintStyle: const TextStyle(color: muted),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(
          color: Colors.white.withValues(alpha: 0.07),
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: lime),
      ),
    );
  }

  // BARCODE SCANNER
  Future<String?> scanBarcode() async {
    final controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      returnImage: false,
    );

    try {
      return await showDialog<String>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) {
          return AlertDialog(
            backgroundColor: surface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            title: const Row(
              children: [
                Icon(Icons.qr_code_scanner, color: lime),
                SizedBox(width: 10),
                Text('Scan Barcode'),
              ],
            ),
            content: SizedBox(
              width: 350,
              height: 300,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(15),
                child: MobileScanner(
                  controller: controller,
                  onDetect: (capture) {
                    for (final barcode in capture.barcodes) {
                      final code = barcode.rawValue?.trim();

                      if (code != null && code.isNotEmpty) {
                        Navigator.of(dialogContext).pop(code);
                        break;
                      }
                    }
                  },
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(dialogContext).pop();
                },
                child: const Text(
                  'Cancel',
                  style: TextStyle(color: muted),
                ),
              ),
            ],
          );
        },
      );
    } finally {
      await controller.dispose();
    }
  }

  // FIND PRODUCT BY SCANNED BARCODE
  Map<String, dynamic>? findProductByBarcode(String barcode) {
    for (final p in products) {
      final productBarcode = p['barcode']?.toString().trim();

      if (productBarcode == barcode.trim()) {
        return p;
      }
    }

    return null;
  }

  // STOCK IN / STOCK OUT FORM
  Future<void> showStockForm(String type) async {
    if (_stockFormOpen) return;

    if (products.isEmpty) {
      message('No products available.');
      return;
    }

    _stockFormOpen = true;

    String? selectedProductId;
    bool saving = false;
    String? formError;

    final quantityController = TextEditingController();
    final noteController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    final messenger = ScaffoldMessenger.of(context);

    try {
      final result = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) {
          return StatefulBuilder(
            builder: (dialogContext, setDialogState) {
              return AlertDialog(
                backgroundColor: surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
                title: Row(
                  children: [
                    Icon(
                      type == 'IN'
                          ? Icons.add_circle_outline
                          : Icons.remove_circle_outline,
                      color: type == 'IN' ? lime : Colors.orangeAccent,
                    ),
                    const SizedBox(width: 10),
                    Text(type == 'IN' ? 'Stock In' : 'Stock Out'),
                  ],
                ),
                content: SizedBox(
                  width: 430,
                  child: SingleChildScrollView(
                    child: Form(
                      key: formKey,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // SCAN BARCODE BUTTON
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              icon: const Icon(
                                Icons.qr_code_scanner,
                                color: lime,
                              ),
                              label: const Text('SCAN BARCODE'),
                              onPressed: saving
                                  ? null
                                  : () async {
                                      final code = await scanBarcode();

                                      if (code == null ||
                                          !dialogContext.mounted) {
                                        return;
                                      }

                                      final matchedProduct =
                                          findProductByBarcode(code);

                                      setDialogState(() {
                                        if (matchedProduct != null) {
                                          selectedProductId =
                                              matchedProduct['_id']
                                                  ?.toString();
                                          formError = null;
                                        } else {
                                          formError =
                                              'No product found for barcode: $code';
                                        }
                                      });
                                    },
                            ),
                          ),
                          const SizedBox(height: 12),

                          // PRODUCT DROPDOWN
                          DropdownButtonFormField<String>(
                            initialValue: selectedProductId,
                            isExpanded: true,
                            dropdownColor: surfaceLight,
                            decoration: fieldDecoration('Select Product'),
                            items: products.map((p) {
                              final id = p['_id']?.toString() ?? '';

                              return DropdownMenuItem<String>(
                                value: id,
                                child: Text(
                                  '${p['name'] ?? 'Product'} (${p['sku'] ?? '-'})',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              );
                            }).toList(),
                            onChanged: saving
                                ? null
                                : (value) {
                                    setDialogState(() {
                                      selectedProductId = value;
                                      formError = null;
                                    });
                                  },
                            validator: (value) =>
                                value == null || value.isEmpty
                                    ? 'Please select a product'
                                    : null,
                          ),
                          const SizedBox(height: 14),

                          // QUANTITY
                          TextFormField(
                            controller: quantityController,
                            keyboardType: TextInputType.number,
                            decoration: fieldDecoration(
                              'Quantity',
                              hint: 'Enter whole quantity',
                            ),
                            validator: (value) {
                              final number = int.tryParse(value ?? '');

                              return number == null || number <= 0
                                  ? 'Enter a positive whole quantity'
                                  : null;
                            },
                          ),
                          const SizedBox(height: 14),

                          // NOTE
                          TextFormField(
                            controller: noteController,
                            maxLines: 3,
                            decoration: fieldDecoration(
                              'Note (optional)',
                              hint: 'Reason or description',
                            ),
                          ),

                          if (formError != null) ...[
                            const SizedBox(height: 14),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(11),
                              decoration: BoxDecoration(
                                color: Colors.red.withValues(alpha: 0.10),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                formError!,
                                style: const TextStyle(
                                  color: Colors.redAccent,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
                actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
                actions: [
                  TextButton(
                    onPressed: saving
                        ? null
                        : () => Navigator.of(dialogContext).pop(false),
                    child: const Text(
                      'Cancel',
                      style: TextStyle(color: muted),
                    ),
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          type == 'IN' ? lime : Colors.deepOrange,
                      foregroundColor:
                          type == 'IN' ? bg : Colors.white,
                    ),
                    onPressed: saving
                        ? null
                        : () async {
                            if (!formKey.currentState!.validate()) {
                              return;
                            }

                            setDialogState(() {
                              saving = true;
                              formError = null;
                            });

                            try {
                              final options = await authOptions();

                              await dio.post(
                                '/stock/$selectedProductId/${type == 'IN' ? 'in' : 'out'}',
                                data: {
                                  'quantity': int.parse(
                                    quantityController.text.trim(),
                                  ),
                                  'note': noteController.text.trim(),
                                },
                                options: options,
                              );

                              if (!dialogContext.mounted) return;

                              Navigator.of(dialogContext).pop(true);
                            } on DioException catch (e) {
                              if (!dialogContext.mounted) return;

                              final data = e.response?.data;

                              setDialogState(() {
                                saving = false;
                                formError = data is Map
                                    ? data['message']?.toString() ??
                                        'Stock operation failed.'
                                    : 'Cannot connect to server.';
                              });
                            } catch (e) {
                              if (!dialogContext.mounted) return;

                              setDialogState(() {
                                saving = false;
                                formError = e
                                    .toString()
                                    .replaceFirst('Exception: ', '');
                              });
                            }
                          },
                    child: saving
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: bg,
                            ),
                          )
                        : Text(
                            type == 'IN' ? 'Add Stock' : 'Remove Stock',
                          ),
                  ),
                ],
              );
            },
          );
        },
      );

      if (result == true && mounted) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(
              type == 'IN'
                  ? 'Stock added successfully.'
                  : 'Stock removed successfully.',
            ),
            behavior: SnackBarBehavior.floating,
            backgroundColor: surfaceLight,
          ),
        );

        await loadAll();
      }
    } finally {
      quantityController.dispose();
      noteController.dispose();
      _stockFormOpen = false;
    }
  }

  Widget lowStockCard(Map<String, dynamic> product) {
    final qty =
        int.tryParse(product['quantity']?.toString() ?? '0') ?? 0;

    final threshold =
        int.tryParse(product['lowStockThreshold']?.toString() ?? '5') ?? 5;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(19),
        border: Border.all(
          color: Colors.orange.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        children: [
          Container(
            height: 45,
            width: 45,
            decoration: BoxDecoration(
              color: Colors.orange.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.warning_amber_rounded,
              color: Colors.orangeAccent,
            ),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product['name']?.toString() ?? 'Unknown product',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'SKU: ${product['sku'] ?? '-'}',
                  style: const TextStyle(
                    color: muted,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(height: 7),
                Text(
                  'Quantity: $qty  •  Threshold: $threshold',
                  style: const TextStyle(
                    color: Colors.orangeAccent,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget movementCard(Map<String, dynamic> movement) {
    final isIn =
        movement['type']?.toString().toUpperCase() == 'IN';

    final performedBy = movement['performedBy'];

    final person = performedBy is Map
        ? performedBy['name']?.toString() ?? '-'
        : '-';

    final color = isIn ? lime : Colors.orangeAccent;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(19),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.07),
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
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isIn
                      ? Icons.south_west_rounded
                      : Icons.north_east_rounded,
                  color: color,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      productName(movement['product']),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'SKU: ${productSku(movement['product'])}',
                      style: const TextStyle(
                        color: muted,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 9,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  isIn ? 'STOCK IN' : 'STOCK OUT',
                  style: TextStyle(
                    color: color,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Divider(
            color: Colors.white.withValues(alpha: 0.08),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Quantity changed',
                style: TextStyle(color: muted, fontSize: 11),
              ),
              Text(
                '${movement['quantity'] ?? 0} units',
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 9),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Stock balance',
                style: TextStyle(color: muted, fontSize: 11),
              ),
              Text(
                '${movement['previousStock'] ?? '-'}  →  ${movement['newStock'] ?? '-'}',
                style: const TextStyle(
                  color: lime,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 9),
          Row(
            children: [
              const Icon(
                Icons.person_outline,
                color: muted,
                size: 15,
              ),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  person,
                  style: const TextStyle(
                    color: muted,
                    fontSize: 11,
                  ),
                ),
              ),
              const Icon(
                Icons.schedule,
                color: muted,
                size: 14,
              ),
              const SizedBox(width: 5),
              Text(
                dateText(movement['createdAt']),
                style: const TextStyle(
                  color: muted,
                  fontSize: 10,
                ),
              ),
            ],
          ),
          if (movement['note'] != null &&
              movement['note'].toString().isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: surfaceLight,
                borderRadius: BorderRadius.circular(11),
              ),
              child: Text(
                'Note: ${movement['note']}',
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget actionButton({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 17,
          ),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: color.withValues(alpha: 0.25),
            ),
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 27),
              const SizedBox(height: 9),
              Text(
                title,
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: muted,
                  fontSize: 9,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget overviewTab() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 35),
      children: [
        sectionTitle(
          'Stock Overview',
          'Your current inventory position',
        ),
        const SizedBox(height: 15),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          mainAxisExtent: 145,
          children: [
            summaryCard(
              'Total Products',
              '${products.length}',
              Icons.inventory_2_rounded,
              lime,
            ),
            summaryCard(
              'Available Units',
              '$totalUnits',
              Icons.warehouse_rounded,
              const Color(0xFF8DD9A2),
            ),
            summaryCard(
              'Low Stock Items',
              '${lowStockProducts.length}',
              Icons.warning_amber_rounded,
              Colors.orangeAccent,
            ),
            summaryCard(
              'Stock Movements',
              '${movements.length}',
              Icons.swap_vert_rounded,
              const Color(0xFFB6D76D),
            ),
          ],
        ),
        const SizedBox(height: 27),
        sectionTitle(
          'Stock Operations',
          'Update your inventory',
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            actionButton(
              title: 'Stock In',
              subtitle: 'Add products to stock',
              icon: Icons.add_circle_outline_rounded,
              color: lime,
              onTap: () => showStockForm('IN'),
            ),
            const SizedBox(width: 12),
            actionButton(
              title: 'Stock Out',
              subtitle: 'Remove products from stock',
              icon: Icons.remove_circle_outline_rounded,
              color: Colors.orangeAccent,
              onTap: () => showStockForm('OUT'),
            ),
          ],
        ),
        const SizedBox(height: 27),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            sectionTitle(
              'Recent Movements',
              'Latest stock activity',
            ),
            TextButton(
              onPressed: () => tabController.animateTo(2),
              child: const Text(
                'View all',
                style: TextStyle(
                  color: lime,
                  fontSize: 11,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (movements.isEmpty)
          _emptyPanel(
            'No stock movements yet.',
            Icons.swap_horiz_rounded,
          )
        else
          ...movements.take(5).map(movementCard),
      ],
    );
  }

  Widget lowStockTab() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 35),
      children: [
        Container(
          padding: const EdgeInsets.all(19),
          decoration: BoxDecoration(
            color: Colors.orange.withValues(alpha: 0.09),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: Colors.orange.withValues(alpha: 0.20),
            ),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.warning_amber_rounded,
                color: Colors.orangeAccent,
                size: 30,
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${lowStockProducts.length} items need attention',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Review these products and replenish stock.',
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
        const SizedBox(height: 22),
        sectionTitle(
          'Low Stock Products',
          'Items at or below their threshold',
        ),
        const SizedBox(height: 14),
        if (lowStockProducts.isEmpty)
          _emptyPanel(
            'Great! No low-stock products.',
            Icons.check_circle_outline_rounded,
          )
        else
          ...lowStockProducts.map(lowStockCard),
      ],
    );
  }

  Widget historyTab() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 35),
      children: [
        sectionTitle(
          'Movement History',
          'Track every stock update',
        ),
        const SizedBox(height: 8),
        Text(
          '${movements.length} recorded movements',
          style: const TextStyle(
            color: muted,
            fontSize: 11,
          ),
        ),
        const SizedBox(height: 16),
        if (movements.isEmpty)
          _emptyPanel(
            'No stock history available.',
            Icons.history_rounded,
          )
        else
          ...movements.map(movementCard),
      ],
    );
  }

  Widget _emptyPanel(String text, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(30),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.06),
        ),
      ),
      child: Column(
        children: [
          Icon(icon, color: muted, size: 43),
          const SizedBox(height: 12),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(color: muted),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: bg,
        titleSpacing: 20,
        title: const Row(
          children: [
            Icon(
              Icons.swap_vert_circle_rounded,
              color: lime,
              size: 23,
            ),
            SizedBox(width: 10),
            Text(
              'Stock Management',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: loading ? null : loadAll,
            icon: const Icon(Icons.refresh_rounded),
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(58),
          child: Container(
            margin: const EdgeInsets.fromLTRB(16, 4, 16, 9),
            decoration: BoxDecoration(
              color: surface,
              borderRadius: BorderRadius.circular(15),
            ),
            child: TabBar(
              controller: tabController,
              dividerColor: Colors.transparent,
              indicator: BoxDecoration(
                color: lime.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(13),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              labelColor: lime,
              unselectedLabelColor: muted,
              labelStyle: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
              tabs: const [
                Tab(
                  height: 45,
                  icon: Icon(
                    Icons.dashboard_outlined,
                    size: 17,
                  ),
                  text: 'Overview',
                ),
                Tab(
                  height: 45,
                  icon: Icon(
                    Icons.warning_amber_rounded,
                    size: 17,
                  ),
                  text: 'Low Stock',
                ),
                Tab(
                  height: 45,
                  icon: Icon(
                    Icons.history_rounded,
                    size: 17,
                  ),
                  text: 'History',
                ),
              ],
            ),
          ),
        ),
      ),
      body: loading
          ? const Center(
              child: CircularProgressIndicator(color: lime),
            )
          : errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(25),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.error_outline,
                          color: Colors.redAccent,
                          size: 45,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          errorMessage!,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 14),
                        ElevatedButton(
                          onPressed: loadAll,
                          child: const Text('Try Again'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  color: lime,
                  backgroundColor: surface,
                  onRefresh: loadAll,
                  child: TabBarView(
                    controller: tabController,
                    children: [
                      overviewTab(),
                      lowStockTab(),
                      historyTab(),
                    ],
                  ),
                ),
    );
  }
}
