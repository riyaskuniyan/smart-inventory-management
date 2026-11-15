
import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

class ReportsPdfService {
  static Future<Uint8List> generate({
    required String period,
    required double totalSales,
    required int totalOrders,
    required int unitsSold,
    required double inventoryValue,
    required int lowStock,
    required int outOfStock,
    required List<MapEntry<String, double>> dailySales,
    required List<MapEntry<String, int>> topProducts,
    required Map<String, int> statuses,
    required List<Map<String, dynamic>> stockAlerts,
  }) async {
    final pdf = pw.Document();

    final green = PdfColor.fromHex('#315C32');
    final lightGreen = PdfColor.fromHex('#EAF3E6');
    final grey = PdfColor.fromHex('#666666');

    String money(num value) => 'Rs. ${value.toStringAsFixed(2)}';

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        header: (context) => pw.Container(
          padding: const pw.EdgeInsets.only(bottom: 12),
          decoration: pw.BoxDecoration(
            border: pw.Border(
              bottom: pw.BorderSide(color: green, width: 2),
            ),
          ),
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text(
                'SMART INVENTORY',
                style: pw.TextStyle(
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                  color: green,
                ),
              ),
              pw.Text(
                'BUSINESS REPORT',
                style: pw.TextStyle(
                  fontSize: 9,
                  color: grey,
                ),
              ),
            ],
          ),
        ),
        footer: (context) => pw.Container(
          alignment: pw.Alignment.centerRight,
          margin: const pw.EdgeInsets.only(top: 12),
          child: pw.Text(
            'Page ${context.pageNumber} of ${context.pagesCount}',
            style: pw.TextStyle(fontSize: 9, color: grey),
          ),
        ),
        build: (context) => [
          pw.SizedBox(height: 22),
          pw.Text(
            'Business Performance Report',
            style: pw.TextStyle(
              fontSize: 23,
              fontWeight: pw.FontWeight.bold,
              color: green,
            ),
          ),
          pw.SizedBox(height: 6),
          pw.Text(
            'Report period: $period',
            style: pw.TextStyle(fontSize: 11, color: grey),
          ),
          pw.Text(
            'Generated: ${DateTime.now().toLocal().toString().substring(0, 16)}',
            style: pw.TextStyle(fontSize: 9, color: grey),
          ),
          pw.SizedBox(height: 22),

          // 1. Business Summary
          pw.Text(
            '1. Business Summary',
            style: pw.TextStyle(
              fontSize: 15,
              fontWeight: pw.FontWeight.bold,
              color: green,
            ),
          ),
          pw.SizedBox(height: 10),
          pw.TableHelper.fromTextArray(
            headers: ['Metric', 'Value'],
            data: [
              ['Total Sales', money(totalSales)],
              ['Total Orders', '$totalOrders'],
              ['Units Sold', '$unitsSold'],
              ['Inventory Selling Value', money(inventoryValue)],
              ['Low Stock Products', '$lowStock'],
              ['Out of Stock Products', '$outOfStock'],
            ],
            headerDecoration: pw.BoxDecoration(color: lightGreen),
            headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
            cellStyle: const pw.TextStyle(fontSize: 10),
            cellPadding: const pw.EdgeInsets.all(8),
            border: pw.TableBorder.all(
              color: PdfColors.grey300,
              width: 0.5,
            ),
          ),

          // 2. Sales Trend
          pw.SizedBox(height: 24),
          pw.Text(
            '2. Sales Trend',
            style: pw.TextStyle(
              fontSize: 15,
              fontWeight: pw.FontWeight.bold,
              color: green,
            ),
          ),
          pw.SizedBox(height: 10),
          if (dailySales.isEmpty)
            pw.Text('No sales data available.')
          else
            pw.TableHelper.fromTextArray(
              headers: ['Date', 'Sales'],
              data: dailySales.map((item) {
                return [item.key, money(item.value)];
              }).toList(),
              headerDecoration: pw.BoxDecoration(color: lightGreen),
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
              cellStyle: const pw.TextStyle(fontSize: 10),
              cellPadding: const pw.EdgeInsets.all(7),
              border: pw.TableBorder.all(
                color: PdfColors.grey300,
                width: 0.5,
              ),
            ),

          // 3. Top-Selling Products
          pw.SizedBox(height: 24),
          pw.Text(
            '3. Top-Selling Products',
            style: pw.TextStyle(
              fontSize: 15,
              fontWeight: pw.FontWeight.bold,
              color: green,
            ),
          ),
          pw.SizedBox(height: 10),
          if (topProducts.isEmpty)
            pw.Text('No product sales available.')
          else
            pw.TableHelper.fromTextArray(
              headers: ['Product', 'Units Sold'],
              data: topProducts.map((item) {
                return [item.key, '${item.value}'];
              }).toList(),
              headerDecoration: pw.BoxDecoration(color: lightGreen),
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
              cellStyle: const pw.TextStyle(fontSize: 10),
              cellPadding: const pw.EdgeInsets.all(7),
              border: pw.TableBorder.all(
                color: PdfColors.grey300,
                width: 0.5,
              ),
            ),

          // 4. Order Status Breakdown
          pw.SizedBox(height: 24),
          pw.Text(
            '4. Order Status Breakdown',
            style: pw.TextStyle(
              fontSize: 15,
              fontWeight: pw.FontWeight.bold,
              color: green,
            ),
          ),
          pw.SizedBox(height: 10),
          if (statuses.isEmpty)
            pw.Text('No order status data available.')
          else
            pw.TableHelper.fromTextArray(
              headers: ['Status', 'Number of Orders'],
              data: statuses.entries.map((item) {
                return [item.key, '${item.value}'];
              }).toList(),
              headerDecoration: pw.BoxDecoration(color: lightGreen),
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
              cellStyle: const pw.TextStyle(fontSize: 10),
              cellPadding: const pw.EdgeInsets.all(7),
              border: pw.TableBorder.all(
                color: PdfColors.grey300,
                width: 0.5,
              ),
            ),

          // 5. Inventory Alerts
          pw.SizedBox(height: 24),
          pw.Text(
            '5. Inventory Alerts',
            style: pw.TextStyle(
              fontSize: 15,
              fontWeight: pw.FontWeight.bold,
              color: green,
            ),
          ),
          pw.SizedBox(height: 10),
          if (stockAlerts.isEmpty)
            pw.Text('No stock alerts.')
          else
            pw.TableHelper.fromTextArray(
              headers: ['Product', 'Available Quantity', 'Alert'],
              data: stockAlerts.map((product) {
                final quantity =
                    product['quantity'] ?? product['stock'] ?? 0;
                final qty = int.tryParse(quantity.toString()) ?? 0;

                return [
                  product['name']?.toString() ?? 'Unknown',
                  '$qty',
                  qty <= 0 ? 'Out of Stock' : 'Low Stock',
                ];
              }).toList(),
              headerDecoration: pw.BoxDecoration(color: lightGreen),
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
              cellStyle: const pw.TextStyle(fontSize: 9),
              cellPadding: const pw.EdgeInsets.all(7),
              border: pw.TableBorder.all(
                color: PdfColors.grey300,
                width: 0.5,
              ),
            ),

          pw.SizedBox(height: 30),
          pw.Divider(color: PdfColors.grey400),
          pw.Text(
            'Generated by Smart Inventory Management System.',
            style: pw.TextStyle(fontSize: 9, color: grey),
          ),
          pw.SizedBox(height: 4),
          pw.Text(
            'Inventory value is calculated using selling price and available quantity. It is not profit.',
            style: pw.TextStyle(fontSize: 8, color: grey),
          ),
        ],
      ),
    );

    return pdf.save();
  }
}
