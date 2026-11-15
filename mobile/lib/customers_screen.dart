
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'main.dart';

class CustomersScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final FlutterSecureStorage storage;

  const CustomersScreen({
    super.key,
    required this.user,
    required this.storage,
  });

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  late final Dio dio;

  List<Map<String, dynamic>> customers = [];

  bool isLoading = true;
  String searchText = '';
  String? errorMessage;

  String get role =>
      widget.user['role']?.toString().toLowerCase() ?? 'staff';

  bool get canEdit => role == 'admin' || role == 'manager';
  bool get canDelete => role == 'admin';

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

    fetchCustomers();
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

  Future<void> fetchCustomers() async {
    if (!mounted) return;

    setState(() {
      isLoading = true;
      errorMessage = null;
    });

    try {
      final response = await dio.get(
        '/customers',
        options: await authOptions(),
      );

      final data = response.data;

      if (data is! Map || data['success'] != true) {
        throw Exception('Unable to load customers.');
      }

      final result = data['customers'];

      if (result is! List) {
        throw Exception('Invalid customer data received.');
      }

      if (!mounted) return;

      setState(() {
        customers = result
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      });
    } on DioException catch (error) {
      if (!mounted) return;

      setState(() {
        errorMessage =
            error.response?.data is Map
                ? error.response?.data['message']?.toString()
                : 'Unable to connect to the server.';
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

  Future<void> showCustomerForm([
    Map<String, dynamic>? customer,
  ]) async {
    final nameController = TextEditingController(
      text: customer?['name']?.toString() ?? '',
    );

    final phoneController = TextEditingController(
      text: customer?['phone']?.toString() ?? '',
    );

    final emailController = TextEditingController(
      text: customer?['email']?.toString() ?? '',
    );

    final addressController = TextEditingController(
      text: customer?['address']?.toString() ?? '',
    );

    final formKey = GlobalKey<FormState>();

    try {
      final result = await showDialog<Map<String, String>>(
        context: context,
        builder: (dialogContext) {
          return AlertDialog(
            backgroundColor: surface,
            title: Text(
              customer == null ? 'Add Customer' : 'Edit Customer',
            ),
            content: SingleChildScrollView(
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextFormField(
                      controller: nameController,
                      decoration: const InputDecoration(
                        labelText: 'Customer Name *',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      validator: (value) =>
                          value == null || value.trim().isEmpty
                              ? 'Name is required'
                              : null,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone Number *',
                        prefixIcon: Icon(Icons.phone_outlined),
                      ),
                      validator: (value) =>
                          value == null || value.trim().isEmpty
                              ? 'Phone is required'
                              : null,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        prefixIcon: Icon(Icons.email_outlined),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: addressController,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Address',
                        prefixIcon: Icon(Icons.location_on_outlined),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () {
                  if (!formKey.currentState!.validate()) return;

                  Navigator.pop(dialogContext, {
                    'name': nameController.text.trim(),
                    'phone': phoneController.text.trim(),
                    'email': emailController.text.trim(),
                    'address': addressController.text.trim(),
                  });
                },
                child: Text(customer == null ? 'Add' : 'Save'),
              ),
            ],
          );
        },
      );

      if (result == null) return;

      final options = await authOptions();

      if (customer == null) {
        await dio.post(
          '/customers',
          data: result,
          options: options,
        );
      } else {
        await dio.put(
          '/customers/${customer['_id']}',
          data: result,
          options: options,
        );
      }

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            customer == null
                ? 'Customer added successfully'
                : 'Customer updated successfully',
          ),
        ),
      );

      await fetchCustomers();
    } on DioException catch (error) {
      if (!mounted) return;

      final data = error.response?.data;
      final message = data is Map
          ? data['message']?.toString() ?? 'Request failed'
          : 'Unable to save customer';

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
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
      nameController.dispose();
      phoneController.dispose();
      emailController.dispose();
      addressController.dispose();
    }
  }

  Future<void> deleteCustomer(
    Map<String, dynamic> customer,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: surface,
        title: const Text('Delete Customer?'),
        content: Text(
          'Are you sure you want to delete ${customer['name']}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await dio.delete(
        '/customers/${customer['_id']}',
        options: await authOptions(),
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Customer deleted successfully')),
      );

      await fetchCustomers();
    } on DioException catch (error) {
      if (!mounted) return;

      final data = error.response?.data;
      final message = data is Map
          ? data['message']?.toString() ?? 'Delete failed'
          : 'Unable to delete customer';

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    } catch (error) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredCustomers = customers.where((customer) {
      final query = searchText.toLowerCase();

      return customer['name']
                  ?.toString()
                  .toLowerCase()
                  .contains(query) ==
              true ||
          customer['email']
                  ?.toString()
                  .toLowerCase()
                  .contains(query) ==
              true ||
          customer['phone']
                  ?.toString()
                  .toLowerCase()
                  .contains(query) ==
              true;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Customers',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            onPressed: fetchCustomers,
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showCustomerForm(),
        backgroundColor: lime,
        foregroundColor: bg,
        icon: const Icon(Icons.person_add_alt_1),
        label: const Text('Add Customer'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(18),
            child: TextField(
              onChanged: (value) {
                setState(() => searchText = value);
              },
              decoration: const InputDecoration(
                hintText: 'Search customers...',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                const Icon(Icons.people_alt_rounded, color: lime),
                const SizedBox(width: 9),
                Text(
                  '${customers.length} Customers',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: isLoading
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
                                size: 40,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                errorMessage!,
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 15),
                              ElevatedButton(
                                onPressed: fetchCustomers,
                                child: const Text('Try Again'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : filteredCustomers.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.people_outline,
                                  color: muted,
                                  size: 55,
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  searchText.isEmpty
                                      ? 'No customers yet'
                                      : 'No matching customers',
                                  style: const TextStyle(color: muted),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            color: lime,
                            onRefresh: fetchCustomers,
                            child: ListView.builder(
                              padding: const EdgeInsets.fromLTRB(
                                16, 5, 16, 90,
                              ),
                              itemCount: filteredCustomers.length,
                              itemBuilder: (context, index) {
                                final customer =
                                    filteredCustomers[index];

                                return Card(
                                  color: surface,
                                  margin: const EdgeInsets.only(bottom: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(18),
                                    side: BorderSide(
                                      color: Colors.white.withValues(
                                        alpha: 0.06,
                                      ),
                                    ),
                                  ),
                                  child: ListTile(
                                    contentPadding:
                                        const EdgeInsets.all(13),
                                    leading: CircleAvatar(
                                      backgroundColor:
                                          lime.withValues(alpha: 0.15),
                                      child: const Icon(
                                        Icons.person,
                                        color: lime,
                                      ),
                                    ),
                                    title: Text(
                                      customer['name']?.toString() ?? '',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    subtitle: Padding(
                                      padding: const EdgeInsets.only(top: 7),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            customer['phone']?.toString() ?? '',
                                          ),
                                          if ((customer['email']
                                                      ?.toString() ??
                                                  '')
                                              .isNotEmpty)
                                            Text(
                                              customer['email'].toString(),
                                            ),
                                          if ((customer['address']
                                                      ?.toString() ??
                                                  '')
                                              .isNotEmpty)
                                            Text(
                                              customer['address'].toString(),
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                        ],
                                      ),
                                    ),
                                    trailing: PopupMenuButton<String>(
                                      onSelected: (value) {
                                        if (value == 'edit') {
                                          showCustomerForm(customer);
                                        } else if (value == 'delete') {
                                          deleteCustomer(customer);
                                        }
                                      },
                                      itemBuilder: (context) => [
                                        if (canEdit)
                                          const PopupMenuItem(
                                            value: 'edit',
                                            child: Text('Edit'),
                                          ),
                                        if (canDelete)
                                          const PopupMenuItem(
                                            value: 'delete',
                                            child: Text('Delete'),
                                          ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
