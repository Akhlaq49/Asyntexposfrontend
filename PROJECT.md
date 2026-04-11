# ReactPOS — How to Use

A browser-based Point of Sale & Business Management system for managing sales, inventory, installment plans, finance, and HR — all in one place.

---

## Quick Start

```bash
npm install
npm run dev        # opens http://localhost:3000
```

> **Requires:** A running backend at the URL set in `.env` → `VITE_MEDIA_BASE_URL`

---

## 1. Login

Go to `/signin`. Enter your **email** and **password**.

- The app auto-detects your **role** (`admin`, `manager`, `cashier`, etc.)
- You are redirected to the correct dashboard based on your role
- Session token is stored in the browser; you stay logged in on refresh

---

## 2. Dashboards

| Role | Dashboard | What You See |
|------|-----------|-------------|
| Admin | `/admin-dashboard` | Full KPIs, charts, all modules |
| Staff/User | `/user-dashboard` | Limited view based on permissions |
| Sales | `/sales-dashboard` | Sales-focused summary |

---

## 3. Core Workflows

### 3.1 Make a Sale (POS)

```
POS page → Search & add products to cart
        → Select customer (optional)
        → Choose payment method (Cash / Card / Credit)
        → Submit → Receipt generated automatically
```

Route: `/pos`

---

### 3.2 Manage Orders (POS Orders)

```
POS Orders page → View all orders
               → Click "Pay" on an unpaid order
               → Enter amount + payment type + reference
               → Save → Payment Receipt pops up (Print / PDF / WhatsApp)
```

Route: `/pos-orders`

The **receipt** shows: items, grand total, amount paid, balance due, and change.

---

### 3.3 Create an Installment Plan

```
Create Plan → Step 1: Find or add a customer
           → Step 2: Add guarantor(s) (optional)
           → Step 3: Select or create a product (sets purchase price + sale price)
           → Step 4: Set finance terms (down payment, interest rate %, tenure in months)
           → Step 5: Review auto-calculated EMI schedule
           → Submit
```

Route: `/create-installment`

**EMI is calculated automatically** from: Sale Price − Down Payment + Interest.

---

### 3.4 Collect an Installment Payment

```
Installment Plans → Click on a plan → View repayment schedule
                 → Click "Pay" on a due/overdue row
                 → Enter amount paid, payment method, notes
                 → Submit → Deposit Slip opens (Print / PDF / WhatsApp)
```

Route: `/installment-details/:id`

- **Overpayment** is automatically distributed to future installments
- **Misc balance** (credit on account) can be applied instead of cash
- **Down payment** also has its own slip button

---

### 3.5 Manage Inventory

```
Product List → Add Product (name, SKU, category, brand, price, qty, tax)
            → Edit / Delete
            → View low stock alerts and expired products
            → Generate Barcode or QR code per product
```

Routes: `/product-list`, `/add-product`, `/low-stocks`, `/barcode`

---

### 3.6 Record a Purchase

```
Purchase List → Add Purchase (select supplier, add items with quantity & price)
             → Track payment status (Paid / Unpaid / Partial)
             → Process purchase returns if needed
```

Route: `/purchase-list`

---

### 3.7 Finance & Accounts

```
Expenses    → Record expense with category, amount, date
Income      → Record income entries
Accounts    → Manage bank accounts, money transfers
Reports     → Balance Sheet / Trial Balance / Cash Flow / Account Statement
```

Routes: `/expense-list`, `/income`, `/account-list`, `/balance-sheet`

---

### 3.8 HR Management

```
Employees → Add employees with department, designation, shift
Attendance → Mark daily attendance (employee or admin view)
Leaves    → Apply for / approve leave requests
Payslip   → Generate monthly payslips per employee
```

Routes: `/employees-list`, `/attendance-admin`, `/leaves-admin`, `/payslip`

---

### 3.9 Reports

All reports are under the **Reports** section in the sidebar.

| Category | Key Reports |
|----------|------------|
| Sales | Sales Report, Best Seller, Invoice Report |
| Installments | Collection, Outstanding Balance, Defaulters, Due Today, Profit & Loss |
| Finance | Expense, Income, Profit & Loss, Annual Report |
| Products | Low Stock, Expiry, Product Profit |
| Customers | Customer Ledger, Customer Due, Supplier Due |

Reports support **Excel export**, **PDF export**, and **date range filters**.

---

## 4. Printing & Sharing Documents

Every receipt, deposit slip, and plan document has 4 options:

| Button | Action |
|--------|--------|
| 🖨 Print | Opens browser print dialog |
| ⬇ PDF | Downloads a PDF file |
| WhatsApp | Opens WhatsApp with PDF attached (local app) |
| Send | Sends via WhatsApp Cloud API (if configured in settings) |

---

## 5. Settings

Accessible by **admin** only via the Settings menu.

| Setting | What it does |
|---------|-------------|
| Company Settings | Name, logo, address used on all documents |
| WhatsApp Settings | Configure Meta WhatsApp Cloud API credentials |
| Tenant Menu Config | Show/hide menu items for all users |
| Roles & Permissions | Control which menu items each role can access |
| Field Visibility | Hide/show specific form fields per module |
| Language Settings | Default language (English / Urdu / Arabic) |

---

## 6. Multi-language Support

Switch language from the top-right language switcher.

| Language | Direction |
|----------|-----------|
| English | Left-to-right |
| Urdu | Right-to-left (auto RTL) |
| Arabic | Right-to-left (auto RTL) |

---

## 7. Permissions at a Glance

- **Admin** — full access to everything
- **Other roles** — see only what the admin has permitted via *Roles & Permissions*
- **Tenant hidden items** — hidden for everyone regardless of role

If you try to access a restricted page you are redirected to `/user-dashboard`.

---

## 8. Environment Setup

Create a `.env` file in the project root:

```env
VITE_MEDIA_BASE_URL=http://localhost:5193
```

Replace with your actual backend URL in production.

---

## 9. Build for Production

```bash
npm run build      # outputs to /dist
npm run preview    # preview the production build locally
```
