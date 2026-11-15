
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:printing/printing.dart';

import 'main.dart';
import 'reports_pdf_service.dart';

class ReportsScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final FlutterSecureStorage storage;

  const ReportsScreen({
    super.key,
    required this.user,
    required this.storage,
  });

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  late final Dio dio;

  bool isLoading = true;
  String? errorMessage;
  String selectedPeriod = '30 Days';

  List<Map<String, dynamic>> orders = [];
  List<Map<String, dynamic>> products = [];

  @override
  void initState() {
    super.initState();

    dio = Dio(
      BaseOptions(
        baseUrl: apiUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
      ),
    );

    fetchReports();
  }

  List<Map<String, dynamic>> extractList(dynamic data, String key) {
    if (data is List) {
      return data
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
    }

    if (data is Map && data[key] is List) {
      return (data[key] as List)
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
    }

    return [];
  }

  Future<void> fetchReports() async {
    if (!mounted) return;

    setState(() {
      isLoading = true;
      errorMessage = null;
    });

    try {
      final token = await widget.storage.read(key: 'auth_token');

      if (token == null || token.isEmpty) {
        throw Exception('Session expired. Please log in again.');
      }

      final options = Options(
        headers: {'Authorization': 'Bearer $token'},
      );

      final responses = await Future.wait([
        dio.get('/orders', options: options),
        dio.get('/products', options: options),
      ]);

      final orderData = responses[0].data;
      final productData = responses[1].data;

      if (orderData is! Map || orderData['success'] != true) {
        throw Exception('Could not load order reports.');
      }

      if (productData is! Map || productData['success'] != true) {
        throw Exception('Could not load product reports.');
      }

      final loadedOrders = extractList(orderData, 'orders');
      final loadedProducts = extractList(productData, 'products');

      if (!mounted) return;

      setState(() {
        orders = loadedOrders;
        products = loadedProducts;
      });
    } on DioException catch (error) {
      debugPrint('REPORTS API ERROR: $error');

      if (!mounted) return;

      setState(() {
        errorMessage = error.response?.statusCode == 401
            ? 'Session expired. Please log in again.'
            : 'Unable to load reports. Check your backend connection.';
      });
    } catch (error) {
      debugPrint('REPORTS ERROR: $error');

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

  double number(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  DateTime? orderDate(Map<String, dynamic> order) {
    final value = order['createdAt'] ??
        order['created_at'] ??
        order['date'];

    if (value == null) return null;

    return DateTime.tryParse(value.toString())?.toLocal();
  }

  double orderTotal(Map<String, dynamic> order) {
    return number(
      order['totalAmount'] ??
          order['total'] ??
          order['amount'],
    );
  }

  List<Map<String, dynamic>> get filteredOrders {
    final now = DateTime.now();

    DateTime? start;

    switch (selectedPeriod) {
      case '7 Days':
        start = now.subtract(const Duration(days: 7));
        break;
      case '30 Days':
        start = now.subtract(const Duration(days: 30));
        break;
      case '90 Days':
        start = now.subtract(const Duration(days: 90));
        break;
      default:
        start = null;
    }

    return orders.where((order) {
      final date = orderDate(order);

      if (start == null) return true;
      if (date == null) return false;

      return !date.isBefore(start);
    }).toList();
  }

  double get totalSales {
    return filteredOrders.fold<double>(
      0,
      (sum, order) => sum + orderTotal(order),
    );
  }

  int get totalUnitsSold {
    int total = 0;

    for (final order in filteredOrders) {
      final items = order['items'];

      if (items is List) {
        for (final item in items) {
          if (item is Map) {
            total += number(item['quantity']).toInt();
          }
        }
      }
    }

    return total;
  }

  double get inventoryValue {
    return products.fold<double>(0, (sum, product) {
      final price = number(product['price']);
      final quantity = number(
        product['quantity'] ?? product['stock'],
      );

      return sum + (price * quantity);
    });
  }

  int get lowStockCount {
    return products.where((product) {
      final quantity = number(
        product['quantity'] ?? product['stock'],
      );

      final threshold = number(
        product['lowStockThreshold'] ??
            product['reorderLevel'] ??
            product['minimumStock'],
      );

      return quantity > 0 &&
          quantity <= (threshold > 0 ? threshold : 5);
    }).length;
  }

  int get outOfStockCount {
    return products.where((product) {
      return number(
        product['quantity'] ?? product['stock'],
      ) <= 0;
    }).length;
  }

  List<MapEntry<String, double>> get dailySales {
    final Map<String, double> totals = {};

    for (final order in filteredOrders) {
      final date = orderDate(order);
      if (date == null) continue;

      final key =
          '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}';

      totals[key] = (totals[key] ?? 0) + orderTotal(order);
    }

    return totals.entries.toList();
  }

  List<MapEntry<String, int>> get topProducts {
    final Map<String, int> quantities = {};

    for (final order in filteredOrders) {
      final items = order['items'];

      if (items is! List) continue;

      for (final item in items) {
        if (item is! Map) continue;

        final product = item['product'];
        String name = 'Unknown Product';

        if (product is Map) {
          name = product['name']?.toString() ?? name;
        } else if (product is String) {
          name = product;
        }

        final quantity = number(item['quantity']).toInt();

        quantities[name] = (quantities[name] ?? 0) + quantity;
      }
    }

    final entries = quantities.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return entries.take(5).toList();
  }

  Map<String, int> get orderStatuses {
    final Map<String, int> statuses = {};

    for (final order in filteredOrders) {
      final rawStatus = order['status']?.toString() ?? '';
      final status = rawStatus.trim().isEmpty
          ? 'Not specified'
          : rawStatus.trim();

      final label = status[0].toUpperCase() + status.substring(1);

      statuses[label] = (statuses[label] ?? 0) + 1;
    }

    return statuses;
  }

  List<Map<String, dynamic>> get pdfStockAlerts {
    return products.where((product) {
      final quantity = number(
        product['quantity'] ?? product['stock'],
      );

      return quantity <= 5;
    }).toList();
  }

  String money(num value) {
    return '₹${value.toStringAsFixed(2)}';
  }

  // SHARE PDF REPORT
  Future<void> shareReportPdf() async {
    try {
      final Uint8List bytes = await ReportsPdfService.generate(
        period: selectedPeriod,
        totalSales: totalSales,
        totalOrders: filteredOrders.length,
        unitsSold: totalUnitsSold,
        inventoryValue: inventoryValue,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        dailySales: dailySales,
        topProducts: topProducts,
        statuses: orderStatuses,
        stockAlerts: pdfStockAlerts,
      );

      await Printing.sharePdf(
        bytes: bytes,
        filename: 'smart_inventory_report.pdf',
      );
    } catch (error) {
      debugPrint('PDF SHARE ERROR: $error');

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('PDF sharing failed: $error')),
      );
    }
  }

  // PRINT PDF REPORT
  Future<void> printReportPdf() async {
    try {
      final Uint8List bytes = await ReportsPdfService.generate(
        period: selectedPeriod,
        totalSales: totalSales,
        totalOrders: filteredOrders.length,
        unitsSold: totalUnitsSold,
        inventoryValue: inventoryValue,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        dailySales: dailySales,
        topProducts: topProducts,
        statuses: orderStatuses,
        stockAlerts: pdfStockAlerts,
      );

      await Printing.layoutPdf(
        name: 'Smart Inventory Report',
        onLayout: (_) async => bytes,
      );
    } catch (error) {
      debugPrint('PDF PRINT ERROR: $error');

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('PDF generation failed: $error')),
      );
    }
  }

  Widget panel({
    required String title,
    required Widget child,
    String? subtitle,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
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
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 5),
            Text(
              subtitle,
              style: const TextStyle(color: muted, fontSize: 11),
            ),
          ],
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }

  Widget summaryCard(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFF1D2B20),
            Color(0xFF111A13),
          ],
        ),
        borderRadius: BorderRadius.circular(19),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.06),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 23),
          const SizedBox(height: 15),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            title,
            style: const TextStyle(
              color: muted,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }

  Widget salesChart() {
    final data = dailySales;

    if (data.isEmpty) {
      return const SizedBox(
        height: 150,
        child: Center(
          child: Text(
            'No sales data for this period',
            style: TextStyle(color: muted),
          ),
        ),
      );
    }

    final displayData = data.length > 10
        ? data.sublist(data.length - 10)
        : data;

    return SizedBox(
      height: 190,
      child: CustomPaint(
        painter: SalesChartPainter(
          values: displayData.map((e) => e.value).toList(),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            const Spacer(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                for (final item in displayData)
                  Expanded(
                    child: Text(
                      item.key,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: muted,
                        fontSize: 9,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget topProductsWidget() {
    final items = topProducts;

    if (items.isEmpty) {
      return const Text(
        'No product sales found for this period.',
        style: TextStyle(color: muted),
      );
    }

    final maximum = items.first.value;

    return Column(
      children: [
        for (int i = 0; i < items.length; i++) ...[
          Row(
            children: [
              Container(
                width: 27,
                height: 27,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: lime.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Text(
                  '${i + 1}',
                  style: const TextStyle(
                    color: lime,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      items[i].key,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 7),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: LinearProgressIndicator(
                        value: maximum == 0
                            ? 0
                            : items[i].value / maximum,
                        minHeight: 6,
                        backgroundColor: surfaceLight,
                        color: lime,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Text(
                '${items[i].value} sold',
                style: const TextStyle(
                  color: muted,
                  fontSize: 11,
                ),
              ),
            ],
          ),
          if (i != items.length - 1)
            const SizedBox(height: 17),
        ],
      ],
    );
  }

  Widget statusWidget() {
    final statuses = orderStatuses;

    if (statuses.isEmpty) {
      return const Text(
        'No orders found for this period.',
        style: TextStyle(color: muted),
      );
    }

    final colors = [
      lime,
      const Color(0xFF80CFA0),
      const Color(0xFFFFB45C),
      const Color(0xFF82B8FF),
      const Color(0xFFFF7777),
    ];

    final total = statuses.values.fold<int>(
      0,
      (sum, value) => sum + value,
    );

    return Column(
      children: [
        for (int i = 0; i < statuses.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 13),
            child: Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: colors[i % colors.length],
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    statuses.keys.elementAt(i),
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
                Text(
                  '${statuses.values.elementAt(i)}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(width: 10),
                Text(
                  '${(statuses.values.elementAt(i) / total * 100).toStringAsFixed(0)}%',
                  style: const TextStyle(
                    color: muted,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget stockAlerts() {
    final alerts = pdfStockAlerts;

    if (alerts.isEmpty) {
      return const Text(
        'No low-stock or out-of-stock products.',
        style: TextStyle(color: muted),
      );
    }

    return Column(
      children: [
        for (final product in alerts.take(8))
          Padding(
            padding: const EdgeInsets.only(bottom: 13),
            child: Row(
              children: [
                Icon(
                  number(product['quantity'] ?? product['stock']) <= 0
                      ? Icons.remove_circle_outline
                      : Icons.warning_amber_rounded,
                  color: number(
                            product['quantity'] ?? product['stock'],
                          ) <=
                          0
                      ? Colors.redAccent
                      : const Color(0xFFFFB45C),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    product['name']?.toString() ?? 'Unnamed product',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
                Text(
                  '${number(product['quantity'] ?? product['stock']).toInt()} left',
                  style: const TextStyle(
                    color: muted,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Business Reports',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            tooltip: 'Share PDF',
            onPressed: isLoading ? null : shareReportPdf,
            icon: const Icon(Icons.picture_as_pdf_rounded),
          ),
          IconButton(
            tooltip: 'Print PDF',
            onPressed: isLoading ? null : printReportPdf,
            icon: const Icon(Icons.print_rounded),
          ),
          IconButton(
            onPressed: isLoading ? null : fetchReports,
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh reports',
          ),
        ],
      ),
      body: isLoading
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
                        const SizedBox(height: 15),
                        Text(
                          errorMessage!,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 18),
                        ElevatedButton(
                          onPressed: fetchReports,
                          child: const Text('Try Again'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  color: lime,
                  backgroundColor: surface,
                  onRefresh: fetchReports,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 30),
                    children: [
                      const Text(
                        'Performance Overview',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Track your sales and inventory performance.',
                        style: TextStyle(color: muted, fontSize: 12),
                      ),
                      const SizedBox(height: 20),

                      // DATE FILTER
                      Container(
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: surface,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            for (final period in [
                              '7 Days',
                              '30 Days',
                              '90 Days',
                              'All',
                            ])
                              Expanded(
                                child: GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      selectedPeriod = period;
                                    });
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 11,
                                    ),
                                    decoration: BoxDecoration(
                                      color: selectedPeriod == period
                                          ? lime
                                          : Colors.transparent,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      period,
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: selectedPeriod == period
                                            ? bg
                                            : muted,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 18),

                      // SUMMARY CARDS
                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 1.45,
                        children: [
                          summaryCard(
                            'Total Sales',
                            money(totalSales),
                            Icons.currency_rupee_rounded,
                            lime,
                          ),
                          summaryCard(
                            'Total Orders',
                            '${filteredOrders.length}',
                            Icons.shopping_bag_rounded,
                            const Color(0xFF80CFA0),
                          ),
                          summaryCard(
                            'Units Sold',
                            '$totalUnitsSold',
                            Icons.inventory_2_rounded,
                            const Color(0xFF82B8FF),
                          ),
                          summaryCard(
                            'Inventory Value',
                            money(inventoryValue),
                            Icons.account_balance_wallet_rounded,
                            const Color(0xFFFFB45C),
                          ),
                        ],
                      ),

                      const SizedBox(height: 22),

                      panel(
                        title: 'Sales Trend',
                        subtitle: 'Sales grouped by order date',
                        child: salesChart(),
                      ),

                      const SizedBox(height: 16),

                      panel(
                        title: 'Top-Selling Products',
                        subtitle: 'Based on units sold in selected period',
                        child: topProductsWidget(),
                      ),

                      const SizedBox(height: 16),

                      panel(
                        title: 'Order Status',
                        subtitle: 'Orders grouped by their current status',
                        child: statusWidget(),
                      ),

                      const SizedBox(height: 16),

                      panel(
                        title: 'Inventory Alerts',
                        subtitle: 'Products with five or fewer units',
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: summaryCard(
                                    'Low Stock',
                                    '$lowStockCount',
                                    Icons.warning_amber_rounded,
                                    const Color(0xFFFFB45C),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: summaryCard(
                                    'Out of Stock',
                                    '$outOfStockCount',
                                    Icons.remove_shopping_cart_rounded,
                                    Colors.redAccent,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 20),
                            stockAlerts(),
                          ],
                        ),
                      ),

                      const SizedBox(height: 25),

                      const Center(
                        child: Text(
                          'SMART INVENTORY MANAGEMENT',
                          style: TextStyle(
                            color: muted,
                            fontSize: 10,
                            letterSpacing: 1.4,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}

class SalesChartPainter extends CustomPainter {
  final List<double> values;

  SalesChartPainter({required this.values});

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;

    const left = 5.0;
    const right = 5.0;
    const top = 12.0;
    const bottom = 28.0;

    final chartWidth = size.width - left - right;
    final chartHeight = size.height - top - bottom;

    final maximum = values.reduce((a, b) => a > b ? a : b);
    final safeMaximum = maximum <= 0 ? 1.0 : maximum;

    final gridPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.08)
      ..strokeWidth = 1;

    for (int i = 0; i < 4; i++) {
      final y = top + (chartHeight / 3) * i;

      canvas.drawLine(
        Offset(left, y),
        Offset(size.width - right, y),
        gridPaint,
      );
    }

    final points = <Offset>[];

    for (int i = 0; i < values.length; i++) {
      final x = values.length == 1
          ? left + chartWidth / 2
          : left + (chartWidth / (values.length - 1)) * i;

      final y = top +
          chartHeight -
          ((values[i] / safeMaximum) * chartHeight);

      points.add(Offset(x, y));
    }

    final linePath = Path();

    for (int i = 0; i < points.length; i++) {
      if (i == 0) {
        linePath.moveTo(points[i].dx, points[i].dy);
      } else {
        linePath.lineTo(points[i].dx, points[i].dy);
      }
    }

    final fillPath = Path.from(linePath)
      ..lineTo(points.last.dx, top + chartHeight)
      ..lineTo(points.first.dx, top + chartHeight)
      ..close();

    final fillPaint = Paint()
      ..shader = LinearGradient(
        colors: [
          lime.withValues(alpha: 0.25),
          lime.withValues(alpha: 0.01),
        ],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(
        Rect.fromLTWH(left, top, chartWidth, chartHeight),
      );

    canvas.drawPath(fillPath, fillPaint);

    final linePaint = Paint()
      ..color = lime
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawPath(linePath, linePaint);

    final dotPaint = Paint()
      ..color = lime
      ..style = PaintingStyle.fill;

    for (final point in points) {
      canvas.drawCircle(point, 4, dotPaint);
      canvas.drawCircle(
        point,
        7,
        Paint()
          ..color = lime.withValues(alpha: 0.15)
          ..style = PaintingStyle.fill,
      );
    }
  }

  @override
  bool shouldRepaint(covariant SalesChartPainter oldDelegate) {
    if (oldDelegate.values.length != values.length) return true;

    for (int i = 0; i < values.length; i++) {
      if (oldDelegate.values[i] != values[i]) return true;
    }

    return false;
  }
}
