# StockFlow – Smart Inventory & Order Management System

A full-stack inventory and order management platform built to help businesses manage products, stock, customers, orders, billing and business reports through a web dashboard and Android mobile application.

## 🌐 Live Application

- **Web Application:** https://smart-inventory-management-1-qn22.onrender.com/
- **Backend API:** https://smart-inventory-management-ufzf.onrender.com
- **API Health Check:** https://smart-inventory-management-ufzf.onrender.com/api/health
- **GitHub Repository:** https://github.com/riyaskuniyan/smart-inventory-management

- admin login 
mail- admin@example.com
pass- 12345678

-manager login
mail- manager@example.com
pass-Manager@12345

-staff login
mail- staff@example.com
pass- Staff@12345

## 📌 Project Overview

StockFlow is designed to simplify business inventory operations by providing a centralized system for managing products, monitoring stock movements, handling customer information, processing orders and generating reports.

The project consists of three major components:

1. React-based web application.
2. Flutter-based Android mobile application.
3. Node.js and Express backend connected to MongoDB.

## ✨ Main Features

### 1. Dashboard
- Business overview.
- Inventory statistics.
- Sales and order information.
- Visual reports and charts.

### 2. Product Management
- Add and manage products.
- View product information.
- Search and manage inventory items.

### 3. Stock Management
- Stock-in and stock-out operations.
- Inventory quantity tracking.
- Barcode integration.

### 4. Customer Management
- Add and manage customers.
- Maintain customer information.
- Access customer records.

### 5. Order Management
- Create and manage orders.
- Process customer orders.
- Automatic stock deduction.
- Billing and invoice generation.

### 6. Barcode System
- Barcode scanning.
- Barcode integration with stock operations.
- Barcode label printing.

### 7. Reports
- Inventory and business reports.
- Graphical data visualization.
- PDF report generation.
- Report printing and sharing.

### 8. Audit Logs
- Maintain records of system activities.
- Track important operations.

### 9. User Profile and Settings
- User profile management.
- Application settings.

### 10. Mobile Application
- Flutter Android application.
- Secure local token storage.
- Product and stock management.
- Customer and order management.
- Barcode scanning.
- Reports and PDF sharing.

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React.js, Vite |
| UI | CSS, Framer Motion, Lucide React |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Authentication | JWT, bcryptjs |
| Mobile | Flutter, Dart |
| API Communication | Axios, Dio |
| Charts | Recharts |
| PDF | Flutter PDF and Printing packages |
| Version Control | Git and GitHub |
| Deployment | Render |

## 🏗️ Project Architecture

```text
Smart Inventory Management
│
├── frontend/
│   └── React + Vite
│
├── backend/
│   └── Node.js + Express
│       ├── Authentication
│       ├── Products
│       ├── Stock
│       ├── Customers
│       ├── Orders
│       ├── Dashboard
│       ├── Reports
│       ├── Users
│       └── Audit Logs
│
└── mobile/
    └── Flutter Android App
```

## ⚙️ Installation and Setup

### Prerequisites

- Node.js and npm
- Flutter SDK
- Android Studio or an Android device
- MongoDB Atlas account
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/riyaskuniyan/smart-inventory-management.git

cd smart-inventory-management
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

Start the backend:

```bash
npm start
```

For development:

```bash
npm run dev
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

For production build:

```bash
npm run build
```

### 4. Flutter Mobile Setup

Open another terminal:

```bash
cd mobile
flutter pub get
```

Run the Android application:

```bash
flutter run
```

Build the release APK:

```bash
flutter build apk --release
```

## 🔗 API Overview

The backend provides REST API routes for:

| Module | API Route |
|---|---|
| Health Check | `/api/health` |
| Authentication | `/api/auth` |
| Users | `/api/users` |
| Products | `/api/products` |
| Stock | `/api/stock` |
| Customers | `/api/customers` |
| Orders | `/api/orders` |
| Dashboard | `/api/dashboard` |
| Audit Logs | `/api/audit` |
| Protected Routes | `/api/protected` |

## 🚀 Deployment

The application is deployed using Render.

- React frontend: Render Static Site.
- Node.js backend: Render Web Service.
- Database: MongoDB Atlas.
- Mobile application: Android release APK.

## 🔐 Security

- JWT-based authentication.
- Password hashing using bcryptjs.
- Environment variables for sensitive configuration.
- Secure token storage in the Flutter application.
- Protected backend routes.

**Important:** Never upload `.env` files, database credentials, JWT secrets or other sensitive information to GitHub.

## 🎯 Project Objectives

- Simplify inventory management.
- Reduce manual stock management errors.
- Improve order processing.
- Maintain organized customer records.
- Generate useful business reports.
- Provide access through both web and mobile platforms.

## 👨‍💻 Developer

**Muhammed Riyas**

GitHub: https://github.com/riyaskuniyan

LinkedIn: https://www.linkedin.com/in/riyas-kuniyan-30934031b

## 📄 License

This project was developed as an academic and practical software development project.
