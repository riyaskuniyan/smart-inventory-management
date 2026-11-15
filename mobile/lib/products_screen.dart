
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:pdf/pdf.dart';
import 'package:printing/printing.dart';
import 'package:barcode/barcode.dart' as barcode;

const Color bg = Color(0xFF080D0A);
const Color surface = Color(0xFF111A13);
const Color surfaceLight = Color(0xFF1A261C);
const Color lime = Color(0xFF9BE15D);
const Color limeBright = Color(0xFFB5F56B);
const Color muted = Color(0xFF91A092);

class ProductsScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final FlutterSecureStorage storage;

  const ProductsScreen({
    super.key,
    required this.user,
    required this.storage,
  });

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  late final Dio dio;

  final TextEditingController searchController =
      TextEditingController();

  List<Map<String, dynamic>> products = [];

  bool isLoading = true;
  bool _productFormOpen = false;

  String? errorMessage;
  String selectedCategory = 'All';

  String get role =>
      widget.user['role']?.toString().toLowerCase() ?? 'staff';

  bool get canManage => role == 'admin' || role == 'manager';
  bool get canDelete => role == 'admin';

  @override
  void initState() {
    super.initState();

    dio = Dio(
      BaseOptions(
        baseUrl: 'http://10.0.2.2:5000/api',
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 15),
      ),
    );

    loadProducts();
  }

  Future<Options> authOptions() async {
    final token = await widget.storage.read(key: 'auth_token');

    if (token == null || token.isEmpty) {
      throw Exception('Please log in again.');
    }

    return Options(
      headers: {'Authorization': 'Bearer $token'},
    );
  }

  Future<void> loadProducts({String? search}) async {
    if (!mounted) return;

    setState(() {
      isLoading = true;
      errorMessage = null;
    });

    try {
      final query = <String, dynamic>{};

      final term = (search ?? searchController.text).trim();

      if (term.isNotEmpty) {
        query['search'] = term;
      }

      if (selectedCategory != 'All') {
        query['category'] = selectedCategory;
      }

      final response = await dio.get(
        '/products',
        queryParameters: query,
        options: await authOptions(),
      );

      final data = response.data;

      if (data is! Map ||
          data['success'] != true ||
          data['products'] is! List) {
        throw Exception('Invalid products response.');
      }

      if (!mounted) return;

      setState(() {
        products = (data['products'] as List)
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      });
    } on DioException catch (error) {
      if (!mounted) return;

      final data = error.response?.data;

      setState(() {
        errorMessage = data is Map
            ? data['message']?.toString() ??
                'Unable to load products.'
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
        setState(() => isLoading = false);
      }
    }
  }

  List<String> get categories {
    final values = products
        .map((p) => p['category']?.toString() ?? '')
        .where((v) => v.isNotEmpty)
        .toSet()
        .toList()
      ..sort();

    return ['All', ...values];
  }

  int get totalUnits {
    return products.fold<int>(
      0,
      (sum, p) =>
          sum +
          (int.tryParse(p['quantity']?.toString() ?? '0') ?? 0),
    );
  }

  int get lowStockCount {
    return products.where((p) {
      final qty =
          int.tryParse(p['quantity']?.toString() ?? '0') ?? 0;

      final threshold =
          int.tryParse(
            p['lowStockThreshold']?.toString() ?? '5',
          ) ??
          5;

      return qty <= threshold;
    }).length;
  }

  String money(dynamic value) {
    final amount =
        num.tryParse(value?.toString() ?? '') ?? 0;

    return '₹${amount.toStringAsFixed(2)}';
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
              borderRadius: BorderRadius.circular(11),
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

  InputDecoration fieldDecoration(
    String label, {
    String? hint,
  }) {
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

  // ADD / EDIT PRODUCT FORM
  Future<void> showProductForm({
    Map<String, dynamic>? product,
  }) async {
    if (!mounted || !canManage || _productFormOpen) return;

    _productFormOpen = true;

    final editing = product != null;

    final name = TextEditingController(
      text: product?['name']?.toString() ?? '',
    );

    final sku = TextEditingController(
      text: product?['sku']?.toString() ?? '',
    );

    final description = TextEditingController(
      text: product?['description']?.toString() ?? '',
    );

    final category = TextEditingController(
      text: product?['category']?.toString() ?? '',
    );

    final price = TextEditingController(
      text: product?['price']?.toString() ?? '',
    );

    final quantity = TextEditingController(
      text: product?['quantity']?.toString() ?? '0',
    );

    final threshold = TextEditingController(
      text: product?['lowStockThreshold']?.toString() ?? '5',
    );

    final formKey = GlobalKey<FormState>();

    final messenger = ScaffoldMessenger.of(context);

    bool saving = false;
    String? formError;

    try {
      final saved = await showDialog<bool>(
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
                title: Text(
                  editing ? 'Edit Product' : 'Add New Product',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                content: SizedBox(
                  width: 430,
                  child: SingleChildScrollView(
                    child: Form(
                      key: formKey,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (formError != null) ...[
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.red.withValues(
                                  alpha: 0.12,
                                ),
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
                            const SizedBox(height: 12),
                          ],
                          TextFormField(
                            controller: name,
                            decoration:
                                fieldDecoration('Product Name'),
                            validator: (v) =>
                                v == null || v.trim().isEmpty
                                    ? 'Required'
                                    : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: sku,
                            decoration: fieldDecoration('SKU'),
                            validator: (v) =>
                                v == null || v.trim().isEmpty
                                    ? 'Required'
                                    : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: description,
                            maxLines: 2,
                            decoration:
                                fieldDecoration('Description'),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: category,
                            decoration:
                                fieldDecoration('Category'),
                            validator: (v) =>
                                v == null || v.trim().isEmpty
                                    ? 'Required'
                                    : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: price,
                            keyboardType:
                                const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: fieldDecoration('Price'),
                            validator: (v) {
                              final n = double.tryParse(v ?? '');
                              return n == null || n < 0
                                  ? 'Enter valid price'
                                  : null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: quantity,
                            keyboardType: TextInputType.number,
                            decoration:
                                fieldDecoration('Quantity'),
                            validator: (v) {
                              final n = int.tryParse(v ?? '');
                              return n == null || n < 0
                                  ? 'Enter whole quantity'
                                  : null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: threshold,
                            keyboardType: TextInputType.number,
                            decoration: fieldDecoration(
                              'Low Stock Threshold',
                            ),
                            validator: (v) {
                              final n = int.tryParse(v ?? '');
                              return n == null || n < 0
                                  ? 'Enter valid threshold'
                                  : null;
                            },
                          ),
                          if (editing &&
                              product['barcode'] != null) ...[
                            const SizedBox(height: 12),
                            SelectableText(
                              'Barcode: ${product['barcode']}',
                              style: const TextStyle(color: lime),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
                actionsPadding:
                    const EdgeInsets.fromLTRB(20, 0, 20, 18),
                actions: [
                  TextButton(
                    onPressed: saving
                        ? null
                        : () {
                            Navigator.of(dialogContext).pop(false);
                          },
                    child: const Text(
                      'Cancel',
                      style: TextStyle(color: muted),
                    ),
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: lime,
                      foregroundColor: bg,
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

                            final payload = {
                              'name': name.text.trim(),
                              'sku': sku.text.trim(),
                              'description': description.text.trim(),
                              'category': category.text.trim(),
                              'price': double.parse(price.text),
                              'quantity': int.parse(quantity.text),
                              'lowStockThreshold':
                                  int.parse(threshold.text),
                            };

                            try {
                              final options = await authOptions();

                              if (editing) {
                                await dio.put(
                                  '/products/${product['_id']}',
                                  data: payload,
                                  options: options,
                                );
                              } else {
                                await dio.post(
                                  '/products',
                                  data: payload,
                                  options: options,
                                );
                              }

                              if (!dialogContext.mounted) return;

                              Navigator.of(dialogContext).pop(true);
                            } on DioException catch (e) {
                              if (!dialogContext.mounted) return;

                              final data = e.response?.data;

                              final error = data is Map
                                  ? data['message']?.toString() ??
                                      'Could not save product.'
                                  : e.response == null
                                      ? 'Cannot connect to server.'
                                      : 'Could not save product.';

                              setDialogState(() {
                                saving = false;
                                formError = error;
                              });
                            } catch (e) {
                              if (!dialogContext.mounted) return;

                              setDialogState(() {
                                saving = false;
                                formError = e.toString().replaceFirst(
                                      'Exception: ',
                                      '',
                                    );
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
                            editing
                                ? 'Update Product'
                                : 'Save Product',
                          ),
                  ),
                ],
              );
            },
          );
        },
      );

      if (!mounted) return;

      if (saved == true) {
        if (messenger.mounted) {
          messenger.showSnackBar(
            SnackBar(
              content: Text(
                editing
                    ? 'Product updated successfully.'
                    : 'Product added successfully.',
              ),
              behavior: SnackBarBehavior.floating,
              backgroundColor: surfaceLight,
            ),
          );
        }

        await loadProducts();
      }
    } finally {
      name.dispose();
      sku.dispose();
      description.dispose();
      category.dispose();
      price.dispose();
      quantity.dispose();
      threshold.dispose();

      _productFormOpen = false;
    }
  }

  // DELETE PRODUCT
  Future<void> deleteProduct(
    Map<String, dynamic> product,
  ) async {
    if (!canDelete || !mounted) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(22),
        ),
        title: const Text('Delete Product?'),
        content: Text(
          'Delete ${product['name']}? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () =>
                Navigator.of(dialogContext).pop(false),
            child: const Text(
              'Cancel',
              style: TextStyle(color: muted),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
            ),
            onPressed: () =>
                Navigator.of(dialogContext).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      await dio.delete(
        '/products/${product['_id']}',
        options: await authOptions(),
      );

      if (!mounted) return;

      message('Product deleted successfully.');

      await loadProducts();
    } on DioException catch (e) {
      if (!mounted) return;

      final data = e.response?.data;

      message(
        data is Map
            ? data['message']?.toString() ?? 'Delete failed.'
            : 'Unable to delete product.',
      );
    } catch (e) {
      if (!mounted) return;

      message(
        e.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  // GENERATE AND PRINT BARCODE PDF
  Future<void> printProductLabels(
    List<Map<String, dynamic>> selectedProducts,
  ) async {
    final validProducts = selectedProducts.where((product) {
      final code = product['barcode']?.toString().trim() ?? '';
      return code.isNotEmpty;
    }).toList();

    if (validProducts.isEmpty) {
      message('No barcode available for selected products.');
      return;
    }

    try {
      final pdf = pw.Document();

      final labels = validProducts.map((product) {
        final name = product['name']?.toString() ?? 'Product';
        final sku = product['sku']?.toString() ?? '-';
        final code = product['barcode'].toString();
        final price = money(product['price']);

        return pw.Container(
          width: 170,
          height: 105,
          padding: const pw.EdgeInsets.all(7),
          decoration: pw.BoxDecoration(
            border: pw.Border.all(
              color: PdfColors.grey600,
              width: 0.7,
            ),
            borderRadius: pw.BorderRadius.circular(5),
          ),
          child: pw.Column(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Text(
                name,
                maxLines: 1,
                textAlign: pw.TextAlign.center,
                style: pw.TextStyle(
                  fontSize: 9,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.Text(
                'SKU: $sku  |  $price',
                maxLines: 1,
                style: const pw.TextStyle(fontSize: 7),
              ),
              pw.BarcodeWidget(
                barcode: barcode.Barcode.code128(),
                data: code,
                width: 150,
                height: 42,
                drawText: false,
              ),
              pw.Text(
                code,
                style: const pw.TextStyle(fontSize: 7),
              ),
            ],
          ),
        );
      }).toList();

      pdf.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.a4,
          margin: const pw.EdgeInsets.all(20),
          build: (context) => [
            pw.Header(
              level: 0,
              child: pw.Text(
                'PRODUCT BARCODE LABELS',
                style: pw.TextStyle(
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
            ),
            pw.Wrap(
              spacing: 10,
              runSpacing: 10,
              children: labels,
            ),
          ],
        ),
      );

      await Printing.layoutPdf(
        onLayout: (format) async => pdf.save(),
        name: 'product_barcode_labels.pdf',
      );
    } catch (e) {
      if (!mounted) return;
      message('Unable to generate barcode PDF: $e');
    }
  }

  // BULK PRINT SELECTION
  Future<void> showBulkPrintDialog() async {
    final printableProducts = products.where((product) {
      final code = product['barcode']?.toString().trim() ?? '';
      return code.isNotEmpty;
    }).toList();

    if (printableProducts.isEmpty) {
      message('No products with barcodes found.');
      return;
    }

    final selectedIds = <String>{
      for (final product in printableProducts)
        product['_id'].toString(),
    };

    final selected = await showDialog<List<Map<String, dynamic>>>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: surface,
              title: const Text('Print Barcode Labels'),
              content: SizedBox(
                width: 420,
                height: 400,
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${selectedIds.length} selected',
                            style: const TextStyle(color: lime),
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            setDialogState(() {
                              if (selectedIds.length ==
                                  printableProducts.length) {
                                selectedIds.clear();
                              } else {
                                selectedIds.addAll(
                                  printableProducts.map(
                                    (p) => p['_id'].toString(),
                                  ),
                                );
                              }
                            });
                          },
                          child: Text(
                            selectedIds.length ==
                                    printableProducts.length
                                ? 'Select None'
                                : 'Select All',
                          ),
                        ),
                      ],
                    ),
                    const Divider(color: Colors.white24),
                    Expanded(
                      child: ListView.builder(
                        itemCount: printableProducts.length,
                        itemBuilder: (context, index) {
                          final product = printableProducts[index];
                          final id = product['_id'].toString();

                          return CheckboxListTile(
                            activeColor: lime,
                            checkColor: bg,
                            value: selectedIds.contains(id),
                            title: Text(
                              product['name']?.toString() ??
                                  'Unnamed Product',
                            ),
                            subtitle: Text(
                              'SKU: ${product['sku'] ?? '-'}',
                              style: const TextStyle(color: muted),
                            ),
                            onChanged: (checked) {
                              setDialogState(() {
                                if (checked == true) {
                                  selectedIds.add(id);
                                } else {
                                  selectedIds.remove(id);
                                }
                              });
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () =>
                      Navigator.of(dialogContext).pop(),
                  child: const Text(
                    'Cancel',
                    style: TextStyle(color: muted),
                  ),
                ),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: lime,
                    foregroundColor: bg,
                  ),
                  onPressed: selectedIds.isEmpty
                      ? null
                      : () {
                          final result = printableProducts
                              .where(
                                (p) => selectedIds.contains(
                                  p['_id'].toString(),
                                ),
                              )
                              .toList();

                          Navigator.of(dialogContext).pop(result);
                        },
                  icon: const Icon(Icons.print_rounded),
                  label: const Text('Print Selected'),
                ),
              ],
            );
          },
        );
      },
    );

    if (!mounted || selected == null || selected.isEmpty) return;

    await printProductLabels(selected);
  }

  // PRODUCT CARD
  Widget productCard(Map<String, dynamic> product) {
    final qty =
        int.tryParse(product['quantity']?.toString() ?? '0') ?? 0;

    final threshold =
        int.tryParse(
          product['lowStockThreshold']?.toString() ?? '5',
        ) ??
        5;

    final low = qty <= threshold;

    final barcodeValue =
        product['barcode']?.toString().trim() ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 13),
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(21),
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
                height: 48,
                width: 48,
                decoration: BoxDecoration(
                  color: lime.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: const Icon(
                  Icons.inventory_2_rounded,
                  color: lime,
                  size: 24,
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product['name']?.toString() ??
                          'Unnamed Product',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'SKU: ${product['sku'] ?? '-'}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: muted,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              if (canManage)
                PopupMenuButton<String>(
                  color: surfaceLight,
                  onSelected: (value) {
                    if (value == 'edit') {
                      showProductForm(product: product);
                    }

                    if (value == 'delete') {
                      deleteProduct(product);
                    }
                  },
                  itemBuilder: (_) => [
                    const PopupMenuItem(
                      value: 'edit',
                      child: Text('Edit product'),
                    ),
                    if (canDelete)
                      const PopupMenuItem(
                        value: 'delete',
                        child: Text('Delete product'),
                      ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 15),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _tag(
                product['category']?.toString() ??
                    'Uncategorised',
                lime,
                lime.withValues(alpha: 0.10),
              ),
              _tag(
                low ? 'Low stock' : 'In stock',
                low ? Colors.orangeAccent : limeBright,
                low
                    ? Colors.orange.withValues(alpha: 0.12)
                    : lime.withValues(alpha: 0.10),
              ),
            ],
          ),
          const SizedBox(height: 15),
          Divider(
            color: Colors.white.withValues(alpha: 0.08),
          ),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'PRICE',
                      style: TextStyle(
                        color: muted,
                        fontSize: 10,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      money(product['price']),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: lime,
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text(
                      'AVAILABLE QUANTITY',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: muted,
                        fontSize: 10,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      '$qty units',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: low
                            ? Colors.orangeAccent
                            : Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (barcodeValue.isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(
                  Icons.qr_code_2,
                  color: muted,
                  size: 16,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Barcode: $barcodeValue',
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: muted,
                      fontSize: 11,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => printProductLabels([product]),
                icon: const Icon(
                  Icons.print_rounded,
                  size: 17,
                ),
                label: const Text('Print Barcode Label'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: lime,
                  side: const BorderSide(color: lime),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _tag(
    String text,
    Color color,
    Color background,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 6,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final categoryList = categories;

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: bg,
        titleSpacing: 20,
        title: const Row(
          children: [
            Icon(
              Icons.inventory_2_rounded,
              color: lime,
              size: 22,
            ),
            SizedBox(width: 10),
            Text(
              'Products',
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: isLoading ? null : () => loadProducts(),
            icon: const Icon(Icons.refresh_rounded),
          ),
          const SizedBox(width: 8),
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              backgroundColor: lime,
              foregroundColor: bg,
              onPressed: () => showProductForm(),
              icon: const Icon(Icons.add_rounded),
              label: const Text(
                'Add Product',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            )
          : null,
      body: RefreshIndicator(
        color: lime,
        backgroundColor: surface,
        onRefresh: loadProducts,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 100),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFF344C2A),
                    Color(0xFF17251A),
                    Color(0xFF101A12),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border.all(
                  color: lime.withValues(alpha: 0.13),
                ),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.inventory_2_rounded,
                    color: lime,
                    size: 30,
                  ),
                  SizedBox(height: 17),
                  Text(
                    'PRODUCT CONTROL',
                    style: TextStyle(
                      color: lime,
                      fontSize: 10,
                      letterSpacing: 2,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 7),
                  Text(
                    'Manage your\nproducts smarter.',
                    style: TextStyle(
                      fontSize: 25,
                      height: 1.2,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Track items, prices and available stock.',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            sectionTitle(
              'Product Overview',
              'A quick look at your inventory',
            ),
            const SizedBox(height: 14),
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
                  '$lowStockCount',
                  Icons.warning_amber_rounded,
                  Colors.orangeAccent,
                ),
                summaryCard(
                  'Categories',
                  '${categories.length - 1}',
                  Icons.category_rounded,
                  const Color(0xFFB6D76D),
                ),
              ],
            ),
            const SizedBox(height: 27),
            sectionTitle(
              'Find Products',
              'Search by name, SKU or barcode',
            ),
            const SizedBox(height: 13),
            TextField(
              controller: searchController,
              onSubmitted: (v) => loadProducts(search: v),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Search products...',
                prefixIcon: const Icon(
                  Icons.search_rounded,
                  color: lime,
                ),
                suffixIcon: IconButton(
                  onPressed: () {
                    searchController.clear();
                    loadProducts(search: '');
                  },
                  icon: const Icon(
                    Icons.close_rounded,
                    color: muted,
                  ),
                ),
                filled: true,
                fillColor: surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 15),
            SizedBox(
              height: 39,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: categoryList.length,
                separatorBuilder: (_, __) =>
                    const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final item = categoryList[index];
                  final selected = selectedCategory == item;

                  return ChoiceChip(
                    label: Text(item),
                    selected: selected,
                    onSelected: (_) {
                      setState(() {
                        selectedCategory = item;
                      });

                      loadProducts();
                    },
                    selectedColor: lime,
                    backgroundColor: surface,
                    labelStyle: TextStyle(
                      color: selected ? bg : muted,
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                    side: BorderSide(
                      color: selected ? lime : Colors.white12,
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 25),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: sectionTitle(
                    'All Products',
                    'Your product catalogue',
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${products.length} items',
                      style: const TextStyle(
                        color: muted,
                        fontSize: 11,
                      ),
                    ),
                    const SizedBox(height: 5),
                    TextButton.icon(
                      onPressed:
                          isLoading ? null : showBulkPrintDialog,
                      icon: const Icon(
                        Icons.print_rounded,
                        size: 16,
                      ),
                      label: const Text('Bulk Print'),
                      style: TextButton.styleFrom(
                        foregroundColor: lime,
                        padding: EdgeInsets.zero,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 14),
            if (isLoading)
              const Padding(
                padding: EdgeInsets.all(35),
                child: Center(
                  child: CircularProgressIndicator(color: lime),
                ),
              )
            else if (errorMessage != null)
              _messagePanel(
                errorMessage!,
                Icons.error_outline,
                Colors.redAccent,
                () => loadProducts(),
              )
            else if (products.isEmpty)
              _messagePanel(
                'No products found.',
                Icons.inventory_2_outlined,
                muted,
                () => loadProducts(),
              )
            else
              ...products.map(productCard),
          ],
        ),
      ),
    );
  }

  Widget _messagePanel(
    String text,
    IconData icon,
    Color color,
    VoidCallback retry,
  ) {
    return Container(
      padding: const EdgeInsets.all(25),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 42),
          const SizedBox(height: 12),
          Text(
            text,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: retry,
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }
}
