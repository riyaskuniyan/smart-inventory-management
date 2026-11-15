
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import 'main.dart';

class OrdersScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final FlutterSecureStorage storage;

  const OrdersScreen({
    super.key,
    required this.user,
    required this.storage,
  });

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  late final Dio dio;

  List<Map<String, dynamic>> orders = [];
  List<Map<String, dynamic>> customers = [];
  List<Map<String, dynamic>> products = [];

  bool isLoading = true;
  bool isCreating = false;
  String? errorMessage;

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

    fetchOrders();
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  Future<Options> authOptions() async {
    final token = await widget.storage.read(
      key: 'auth_token',
    );

    if (token == null || token.isEmpty) {
      throw Exception('Session expired. Please log in again.');
    }

    return Options(
      headers: {
        'Authorization': 'Bearer $token',
      },
    );
  }

  // ==========================================
  // HELPERS
  // ==========================================

  List<Map<String, dynamic>> parseList(dynamic value) {
    if (value is! List) return [];

    return value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  double numberValue(dynamic value) {
    if (value is num) {
      return value.toDouble();
    }

    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  String money(dynamic value) {
    return '₹${numberValue(value).toStringAsFixed(2)}';
  }

  String customerName(dynamic customer) {
    if (customer is Map) {
      return customer['name']?.toString() ?? 'Unknown customer';
    }

    return 'Unknown customer';
  }

  String productName(dynamic product) {
    if (product is Map) {
      return product['name']?.toString() ?? 'Unknown product';
    }

    return 'Unknown product';
  }

  // ==========================================
  // FETCH ORDERS
  // ==========================================

  Future<void> fetchOrders() async {
    if (!mounted) return;

    setState(() {
      isLoading = true;
      errorMessage = null;
    });

    try {
      final options = await authOptions();

      final response = await dio.get(
        '/orders',
        options: options,
      );

      final data = response.data;

      if (data is! Map || data['success'] != true) {
        throw Exception('Unable to load orders.');
      }

      if (!mounted) return;

      setState(() {
        orders = parseList(data['orders']);
      });
    } on DioException catch (error) {
      if (!mounted) return;

      setState(() {
        errorMessage = error.response?.data is Map
            ? error.response?.data['message']?.toString()
            : 'Unable to connect to the server.';
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        errorMessage = error
            .toString()
            .replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }

  // ==========================================
  // LOAD CUSTOMERS AND PRODUCTS
  // ==========================================

  Future<void> loadFormData() async {
    final options = await authOptions();

    final responses = await Future.wait([
      dio.get('/customers', options: options),
      dio.get('/products', options: options),
    ]);

    final customerData = responses[0].data;
    final productData = responses[1].data;

    if (customerData is! Map || productData is! Map) {
      throw Exception('Invalid server response.');
    }

    if (customerData['success'] != true ||
        productData['success'] != true) {
      throw Exception('Unable to load customers or products.');
    }

    customers = parseList(customerData['customers']);
    products = parseList(productData['products']);

    customers.removeWhere(
      (customer) => customer['_id'] == null,
    );

    products.removeWhere(
      (product) => product['_id'] == null,
    );
  }

  // ==========================================
  // CREATE NEW ORDER
  // ==========================================

  Future<void> createOrder() async {
    if (customers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please add customers first.'),
        ),
      );
      return;
    }

    if (products.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please add products first.'),
        ),
      );
      return;
    }

    String? selectedCustomerId;
    String? selectedProductId;

    final List<Map<String, dynamic>> cart = [];

    bool submitting = false;
    String? formError;

    final quantityController = TextEditingController(text: '1');

    try {
      final result = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) {
          return StatefulBuilder(
            builder: (context, setDialogState) {
              double total = 0;

              for (final item in cart) {
                total += numberValue(item['price']) *
                    (item['quantity'] as int);
              }

              final availableProducts = products.where((product) {
                return !cart.any(
                  (item) =>
                      item['product'] == product['_id'].toString(),
                );
              }).toList();

              return AlertDialog(
                backgroundColor: surface,
                title: const Text(
                  'Create New Order',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                content: SizedBox(
                  width: 450,
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'SELECT CUSTOMER',
                          style: TextStyle(
                            color: lime,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(height: 10),
                        DropdownButtonFormField<String>(
                          initialValue: selectedCustomerId,
                          isExpanded: true,
                          decoration: const InputDecoration(
                            hintText: 'Choose customer',
                            prefixIcon: Icon(Icons.person_outline),
                          ),
                          items: customers.map((customer) {
                            final id = customer['_id'].toString();

                            return DropdownMenuItem<String>(
                              value: id,
                              child: Text(
                                customer['name']?.toString() ??
                                    'Customer',
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          }).toList(),
                          onChanged: (value) {
                            setDialogState(() {
                              selectedCustomerId = value;
                              formError = null;
                            });
                          },
                        ),
                        const SizedBox(height: 25),
                        const Text(
                          'SELECT PRODUCT',
                          style: TextStyle(
                            color: lime,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(height: 10),
                        DropdownButtonFormField<String>(
                          initialValue: selectedProductId,
                          isExpanded: true,
                          decoration: const InputDecoration(
                            hintText: 'Choose product',
                            prefixIcon: Icon(
                              Icons.inventory_2_outlined,
                            ),
                          ),
                          items: availableProducts.map((product) {
                            final id = product['_id'].toString();

                            final stock = int.tryParse(
                                  product['quantity'].toString(),
                                ) ??
                                0;

                            return DropdownMenuItem<String>(
                              value: id,
                              child: Text(
                                '${productName(product)} '
                                '(Stock: $stock)',
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          }).toList(),
                          onChanged: (value) {
                            setDialogState(() {
                              selectedProductId = value;
                              formError = null;
                            });
                          },
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: quantityController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            hintText: 'Enter quantity',
                            prefixIcon: Icon(Icons.numbers),
                          ),
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: () {
                            final selected = products.where(
                              (product) =>
                                  product['_id'].toString() ==
                                  selectedProductId,
                            );

                            if (selectedProductId == null ||
                                selected.isEmpty) {
                              setDialogState(() {
                                formError = 'Select a product first.';
                              });
                              return;
                            }

                            final product = selected.first;

                            final stock = int.tryParse(
                                  product['quantity'].toString(),
                                ) ??
                                0;

                            final enteredQuantity = int.tryParse(
                              quantityController.text.trim(),
                            );

                            if (enteredQuantity == null ||
                                enteredQuantity <= 0) {
                              setDialogState(() {
                                formError = 'Enter a valid quantity.';
                              });
                              return;
                            }

                            if (enteredQuantity > stock) {
                              setDialogState(() {
                                formError =
                                    'Only $stock units available.';
                              });
                              return;
                            }

                            setDialogState(() {
                              cart.add({
                                'product': selectedProductId,
                                'name': productName(product),
                                'price': numberValue(product['price']),
                                'quantity': enteredQuantity,
                              });

                              selectedProductId = null;
                              quantityController.text = '1';
                              formError = null;
                            });
                          },
                          icon: const Icon(Icons.add),
                          label: const Text('Add Product'),
                        ),
                        if (formError != null) ...[
                          const SizedBox(height: 12),
                          Text(
                            formError!,
                            style: const TextStyle(
                              color: Colors.redAccent,
                              fontSize: 12,
                            ),
                          ),
                        ],
                        const SizedBox(height: 22),
                        const Text(
                          'ORDER ITEMS',
                          style: TextStyle(
                            color: lime,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(height: 10),
                        if (cart.isEmpty)
                          const Padding(
                            padding: EdgeInsets.all(15),
                            child: Text(
                              'No products added yet.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: muted),
                            ),
                          ),
                        ...cart.asMap().entries.map((entry) {
                          final index = entry.key;
                          final item = entry.value;

                          final itemTotal =
                              numberValue(item['price']) *
                                  (item['quantity'] as int);

                          return Container(
                            margin: const EdgeInsets.only(bottom: 9),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: surfaceLight,
                              borderRadius: BorderRadius.circular(13),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item['name'].toString(),
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 5),
                                      Text(
                                        '${item['quantity']} × '
                                        '${money(item['price'])}',
                                        style: const TextStyle(
                                          color: muted,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  money(itemTotal),
                                  style: const TextStyle(
                                    color: lime,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                IconButton(
                                  tooltip: 'Remove product',
                                  onPressed: () {
                                    setDialogState(() {
                                      cart.removeAt(index);
                                    });
                                  },
                                  icon: const Icon(
                                    Icons.delete_outline,
                                    color: Colors.redAccent,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: lime.withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            mainAxisAlignment:
                                MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'TOTAL AMOUNT',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                money(total),
                                style: const TextStyle(
                                  color: lime,
                                  fontSize: 19,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: submitting
                        ? null
                        : () {
                            Navigator.pop(dialogContext, false);
                          },
                    child: const Text('Cancel'),
                  ),
                  ElevatedButton(
                    onPressed: submitting
                        ? null
                        : () async {
                            if (selectedCustomerId == null) {
                              setDialogState(() {
                                formError = 'Select a customer.';
                              });
                              return;
                            }

                            if (cart.isEmpty) {
                              setDialogState(() {
                                formError =
                                    'Add at least one product.';
                              });
                              return;
                            }

                            setDialogState(() {
                              submitting = true;
                              formError = null;
                            });

                            try {
                              final options = await authOptions();

                              final response = await dio.post(
                                '/orders',
                                data: {
                                  'customer': selectedCustomerId,
                                  'items': cart.map((item) {
                                    return {
                                      'product': item['product'],
                                      'quantity': item['quantity'],
                                    };
                                  }).toList(),
                                },
                                options: options,
                              );

                              final data = response.data;

                              if (data is! Map ||
                                  data['success'] != true) {
                                throw Exception(
                                  data is Map
                                      ? data['message']?.toString() ??
                                          'Order creation failed.'
                                      : 'Invalid server response.',
                                );
                              }

                              if (dialogContext.mounted) {
                                Navigator.pop(dialogContext, true);
                              }
                            } catch (error) {
                              if (!dialogContext.mounted) return;

                              setDialogState(() {
                                submitting = false;
                                formError = error
                                    .toString()
                                    .replaceFirst('Exception: ', '');
                              });
                            }
                          },
                    child: submitting
                        ? const SizedBox(
                            height: 19,
                            width: 19,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.black,
                            ),
                          )
                        : const Text('Place Order'),
                  ),
                ],
              );
            },
          );
        },
      );

      if (result == true && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Order placed successfully. Stock updated.',
            ),
          ),
        );

        await fetchOrders();
      }
    } catch (error) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error.toString().replaceFirst('Exception: ', ''),
          ),
        ),
      );
    } finally {
      quantityController.dispose();
    }
  }

  // ==========================================
  // OPEN INVOICE
  // ==========================================

  void openInvoice(Map<String, dynamic> order) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => InvoicePreviewScreen(order: order),
      ),
    );
  }

  // ==========================================
  // ORDER CARD
  // ==========================================

  Widget orderCard(Map<String, dynamic> order) {
    final items = parseList(order['items']);
    final customer = customerName(order['customer']);

    final orderNumber =
        order['orderNumber']?.toString() ?? 'Order';

    final total = order['totalAmount'] ?? 0;

    final createdAt = DateTime.tryParse(
      order['createdAt']?.toString() ?? '',
    );

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.06),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                height: 43,
                width: 43,
                decoration: BoxDecoration(
                  color: lime.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: const Icon(
                  Icons.shopping_bag_outlined,
                  color: lime,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      orderNumber,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      customer,
                      style: const TextStyle(
                        color: muted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                money(total),
                style: const TextStyle(
                  color: lime,
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 15),
          const Divider(color: Colors.white12),
          const SizedBox(height: 8),
          ...items.map((item) {
            final name = productName(item['product']);
            final quantity = item['quantity'] ?? 0;

            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      name,
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                  Text(
                    'Qty: $quantity',
                    style: const TextStyle(
                      color: muted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            );
          }),
          if (createdAt != null) ...[
            const SizedBox(height: 12),
            Text(
              '${createdAt.day.toString().padLeft(2, '0')}/'
              '${createdAt.month.toString().padLeft(2, '0')}/'
              '${createdAt.year}',
              style: const TextStyle(
                color: muted,
                fontSize: 11,
              ),
            ),
          ],
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => openInvoice(order),
              icon: const Icon(Icons.receipt_long),
              label: const Text('View Bill'),
              style: OutlinedButton.styleFrom(
                foregroundColor: lime,
                side: BorderSide(
                  color: lime.withValues(alpha: 0.5),
                ),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // BUILD SCREEN
  // ==========================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Orders',
          style: TextStyle(
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh orders',
            onPressed: isLoading ? null : fetchOrders,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: isCreating
            ? null
            : () async {
                setState(() {
                  isCreating = true;
                });

                try {
                  await loadFormData();

                  if (!mounted) return;

                  await createOrder();
                } catch (error) {
                  if (!mounted) return;

                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        error.toString().replaceFirst(
                              'Exception: ',
                              '',
                            ),
                      ),
                    ),
                  );
                } finally {
                  if (mounted) {
                    setState(() {
                      isCreating = false;
                    });
                  }
                }
              },
        backgroundColor: lime,
        foregroundColor: Colors.black,
        icon: isCreating
            ? const SizedBox(
                height: 19,
                width: 19,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.black,
                ),
              )
            : const Icon(Icons.add_shopping_cart),
        label: Text(
          isCreating ? 'Loading...' : 'New Order',
          style: const TextStyle(
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: RefreshIndicator(
        color: lime,
        onRefresh: fetchOrders,
        child: isLoading
            ? const Center(
                child: CircularProgressIndicator(color: lime),
              )
            : errorMessage != null
                ? ListView(
                    padding: const EdgeInsets.all(25),
                    children: [
                      const SizedBox(height: 80),
                      const Icon(
                        Icons.error_outline,
                        color: Colors.redAccent,
                        size: 50,
                      ),
                      const SizedBox(height: 15),
                      Text(
                        errorMessage!,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: fetchOrders,
                        child: const Text('Try Again'),
                      ),
                    ],
                  )
                : orders.isEmpty
                    ? ListView(
                        padding: const EdgeInsets.all(30),
                        children: const [
                          SizedBox(height: 75),
                          Icon(
                            Icons.shopping_bag_outlined,
                            size: 70,
                            color: muted,
                          ),
                          SizedBox(height: 20),
                          Text(
                            'No Orders Yet',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 21,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(height: 9),
                          Text(
                            'Tap New Order to create your first order.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: muted),
                          ),
                        ],
                      )
                    : ListView(
                        padding: const EdgeInsets.fromLTRB(
                          17,
                          17,
                          17,
                          100,
                        ),
                        children: [
                          Text(
                            '${orders.length} orders found',
                            style: const TextStyle(
                              color: muted,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 15),
                          ...orders.map(orderCard),
                        ],
                      ),
      ),
    );
  }
}

// =====================================================
// INVOICE PDF PREVIEW SCREEN
// =====================================================

class InvoicePreviewScreen extends StatelessWidget {
  final Map<String, dynamic> order;

  const InvoicePreviewScreen({
    super.key,
    required this.order,
  });

  @override
  Widget build(BuildContext context) {
    final orderNumber =
        order['orderNumber']?.toString() ?? 'Invoice';

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Invoice',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: PdfPreview(
        build: (format) => generateInvoicePdf(order, format),
        allowPrinting: true,
        allowSharing: true,
        canChangeOrientation: false,
        canChangePageFormat: false,
        pdfFileName: 'Invoice_$orderNumber.pdf',
        loadingWidget: const Center(
          child: CircularProgressIndicator(color: lime),
        ),
      ),
    );
  }
}

// =====================================================
// GENERATE INVOICE PDF
// =====================================================

Future<Uint8List> generateInvoicePdf(
  Map<String, dynamic> order,
  PdfPageFormat format,
) async {
  final pdf = pw.Document();

  final customer = order['customer'];

  final customerData = customer is Map
      ? Map<String, dynamic>.from(customer)
      : <String, dynamic>{};

  final items = order['items'] is List
      ? (order['items'] as List)
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList()
      : <Map<String, dynamic>>[];

  final orderNumber =
      order['orderNumber']?.toString() ?? 'Order';

  final customerFullName =
      customerData['name']?.toString() ?? 'Walk-in Customer';

  final customerPhone =
      customerData['phone']?.toString() ?? '';

  final customerEmail =
      customerData['email']?.toString() ?? '';

  final totalAmount = _invoiceNumber(order['totalAmount']);

  final createdAt = DateTime.tryParse(
    order['createdAt']?.toString() ?? '',
  )?.toLocal();

  final dateText = createdAt == null
      ? 'Date not available'
      : '${createdAt.day.toString().padLeft(2, '0')}/'
          '${createdAt.month.toString().padLeft(2, '0')}/'
          '${createdAt.year}';

  final timeText = createdAt == null
      ? ''
      : '${createdAt.hour.toString().padLeft(2, '0')}:'
          '${createdAt.minute.toString().padLeft(2, '0')}';

  final tableRows = <pw.TableRow>[
    pw.TableRow(
      decoration: const pw.BoxDecoration(
        color: PdfColor.fromInt(0xFF17251A),
      ),
      children: [
        _invoiceHeaderCell('Product'),
        _invoiceHeaderCell('Qty'),
        _invoiceHeaderCell('Price'),
        _invoiceHeaderCell('Amount'),
      ],
    ),
  ];

  for (final item in items) {
    final product = item['product'];

    final name = product is Map
        ? product['name']?.toString() ?? 'Product'
        : 'Product';

    final quantity = _invoiceNumber(item['quantity']);

    final price = _invoiceNumber(item['price']);

    final subtotal = item['subtotal'] != null
        ? _invoiceNumber(item['subtotal'])
        : price * quantity;

    tableRows.add(
      pw.TableRow(
        children: [
          _invoiceCell(name),
          _invoiceCell(quantity.toStringAsFixed(0)),
          _invoiceCell(_invoiceMoney(price)),
          _invoiceCell(_invoiceMoney(subtotal)),
        ],
      ),
    );
  }

  pdf.addPage(
    pw.MultiPage(
      pageFormat: format,
      margin: const pw.EdgeInsets.all(35),
      footer: (context) {
        return pw.Container(
          alignment: pw.Alignment.center,
          margin: const pw.EdgeInsets.only(top: 15),
          child: pw.Text(
            'Thank you for your business!',
            style: const pw.TextStyle(
              fontSize: 9,
              color: PdfColors.grey600,
            ),
          ),
        );
      },
      build: (context) => [
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text(
                  'INVOICE',
                  style: pw.TextStyle(
                    fontSize: 27,
                    fontWeight: pw.FontWeight.bold,
                    color: const PdfColor.fromInt(0xFF365B29),
                  ),
                ),
                pw.SizedBox(height: 5),
                pw.Text(
                  'ORDER MANAGEMENT SYSTEM',
                  style: const pw.TextStyle(
                    fontSize: 9,
                    color: PdfColors.grey700,
                  ),
                ),
              ],
            ),
            pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.end,
              children: [
                pw.Text(
                  'INVOICE NO.',
                  style: pw.TextStyle(
                    fontSize: 9,
                    fontWeight: pw.FontWeight.bold,
                    color: PdfColors.grey700,
                  ),
                ),
                pw.SizedBox(height: 4),
                pw.Text(
                  orderNumber,
                  style: pw.TextStyle(
                    fontSize: 12,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 6),
                pw.Text(
                  dateText,
                  style: const pw.TextStyle(fontSize: 10),
                ),
                if (timeText.isNotEmpty)
                  pw.Text(
                    timeText,
                    style: const pw.TextStyle(fontSize: 9),
                  ),
              ],
            ),
          ],
        ),
        pw.SizedBox(height: 22),
        pw.Divider(
          color: const PdfColor.fromInt(0xFF365B29),
          thickness: 2,
        ),
        pw.SizedBox(height: 15),
        pw.Text(
          'BILL TO',
          style: pw.TextStyle(
            fontSize: 10,
            fontWeight: pw.FontWeight.bold,
            color: const PdfColor.fromInt(0xFF365B29),
          ),
        ),
        pw.SizedBox(height: 8),
        pw.Text(
          customerFullName,
          style: pw.TextStyle(
            fontSize: 14,
            fontWeight: pw.FontWeight.bold,
          ),
        ),
        if (customerPhone.isNotEmpty)
          pw.Padding(
            padding: const pw.EdgeInsets.only(top: 4),
            child: pw.Text(
              'Phone: $customerPhone',
              style: const pw.TextStyle(fontSize: 10),
            ),
          ),
        if (customerEmail.isNotEmpty)
          pw.Padding(
            padding: const pw.EdgeInsets.only(top: 4),
            child: pw.Text(
              'Email: $customerEmail',
              style: const pw.TextStyle(fontSize: 10),
            ),
          ),
        pw.SizedBox(height: 25),
        pw.Text(
          'ORDER DETAILS',
          style: pw.TextStyle(
            fontSize: 11,
            fontWeight: pw.FontWeight.bold,
          ),
        ),
        pw.SizedBox(height: 10),
        pw.Table(
          border: pw.TableBorder.all(
            color: PdfColors.grey300,
            width: 0.6,
          ),
          columnWidths: {
            0: const pw.FlexColumnWidth(3.5),
            1: const pw.FlexColumnWidth(0.8),
            2: const pw.FlexColumnWidth(1.5),
            3: const pw.FlexColumnWidth(1.7),
          },
          children: tableRows,
        ),
        pw.SizedBox(height: 20),
        pw.Align(
          alignment: pw.Alignment.centerRight,
          child: pw.Container(
            width: 220,
            padding: const pw.EdgeInsets.all(14),
            decoration: pw.BoxDecoration(
              color: const PdfColor.fromInt(0xFFF0F5ED),
              borderRadius: pw.BorderRadius.circular(6),
            ),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.stretch,
              children: [
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'Grand Total',
                      style: pw.TextStyle(
                        fontSize: 12,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.Text(
                      _invoiceMoney(totalAmount),
                      style: pw.TextStyle(
                        fontSize: 15,
                        fontWeight: pw.FontWeight.bold,
                        color: const PdfColor.fromInt(0xFF365B29),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        pw.SizedBox(height: 30),
        pw.Divider(color: PdfColors.grey300),
        pw.SizedBox(height: 8),
        pw.Text(
          'Payment and order information',
          style: pw.TextStyle(
            fontSize: 10,
            fontWeight: pw.FontWeight.bold,
          ),
        ),
        pw.SizedBox(height: 5),
        pw.Text(
          'This invoice was generated from the recorded order details.',
          style: const pw.TextStyle(
            fontSize: 9,
            color: PdfColors.grey700,
          ),
        ),
      ],
    ),
  );

  return pdf.save();
}

// =====================================================
// PDF HELPERS
// =====================================================

double _invoiceNumber(dynamic value) {
  if (value is num) return value.toDouble();

  return double.tryParse(value?.toString() ?? '') ?? 0;
}

String _invoiceMoney(dynamic value) {
  return 'Rs. ${_invoiceNumber(value).toStringAsFixed(2)}';
}

pw.Widget _invoiceHeaderCell(String value) {
  return pw.Padding(
    padding: const pw.EdgeInsets.all(9),
    child: pw.Text(
      value,
      style: pw.TextStyle(
        color: PdfColors.white,
        fontSize: 9,
        fontWeight: pw.FontWeight.bold,
      ),
    ),
  );
}

pw.Widget _invoiceCell(String value) {
  return pw.Padding(
    padding: const pw.EdgeInsets.all(9),
    child: pw.Text(
      value,
      style: const pw.TextStyle(
        fontSize: 9,
      ),
    ),
  );
}
