/**
 * Maps menu item titles (English) to i18n translation keys.
 * This allows the sidebar to translate menu items without modifying menuData structure.
 */

const menuTitleToKey: Record<string, string> = {
  // Section headers
  'Main': 'menu.main',
  'Inventory': 'menu.inventory',
  'Stock': 'menu.stock',
  'Installments': 'menu.installments',
  'Installment Reports': 'menu.installment_reports',
  'Sales': 'menu.sales',
  'Promo': 'menu.promo',
  'Purchases': 'menu.purchases',
  'Finance & Accounts': 'menu.finance_accounts',
  'Peoples': 'menu.peoples',
  'HRM': 'menu.hrm',
  'Reports': 'menu.reports',
  'User Management': 'menu.user_management',

  // Main
  'Dashboard': 'menu.dashboard',
  'Admin Dashboard': 'menu.admin_dashboard',
  'Sales Dashboard': 'menu.sales_dashboard',

  // Inventory items
  'Products': 'menu.products',
  'Create Product': 'menu.create_product',
  'Expired Products': 'menu.expired_products',
  'Low Stocks': 'menu.low_stocks',
  'Category': 'menu.category',
  'Sub Category': 'menu.sub_category',
  'Brands': 'menu.brands',
  'Units': 'menu.units',
  'Variant Attributes': 'menu.variant_attributes',
  'Warranties': 'menu.warranties',
  'Print Barcode': 'menu.print_barcode',
  'Print QR Code': 'menu.print_qr_code',

  // Stock items
  'Manage Stock': 'menu.manage_stock',
  'Stock Adjustment': 'menu.stock_adjustment',
  'Stock Transfer': 'menu.stock_transfer',

  // Installments
  'All Plans': 'menu.all_plans',
  'Create Plan': 'menu.create_plan',

  // Installment Reports
  'Financial Reports': 'menu.financial_reports',
  'Installment Collection': 'menu.installment_collection',
  'Outstanding Balance': 'menu.outstanding_balance',
  'Daily Cash Flow': 'menu.daily_cash_flow',
  'Product Profit': 'menu.product_profit',
  'Customer Reports': 'menu.customer_reports',
  'Customer Ledger': 'menu.customer_ledger',
  'Defaulters': 'menu.defaulters',
  'Payment History': 'menu.payment_history',
  'Sales Reports': 'menu.sales_reports',
  'Sales Summary': 'menu.sales_summary',
  'Product-wise Sales': 'menu.product_wise_sales',
  'Risk & Compliance': 'menu.risk_compliance',
  'Default Rate': 'menu.default_rate',
  'Recovery Performance': 'menu.recovery_performance',
  'Operational Reports': 'menu.operational_reports',
  'Due Today': 'menu.due_today',
  'Upcoming Due (7 Days)': 'menu.upcoming_due',
  'Late Fee Report': 'menu.late_fee_report',

  // Sales
  'Online Orders': 'menu.online_orders',
  'POS Orders': 'menu.pos_orders',
  'Invoices': 'menu.invoices',
  'Sales Return': 'menu.sales_return',
  'Quotation': 'menu.quotation',
  'POS': 'menu.pos',

  // Promo
  'Coupons': 'menu.coupons',
  'Gift Cards': 'menu.gift_cards',
  'Discount': 'menu.discount',
  'Discount Plan': 'menu.discount_plan',

  // Purchases
  'Purchase Order': 'menu.purchase_order',
  'Purchase Return': 'menu.purchase_return',

  // Finance
  'Expenses': 'menu.expenses',
  'Expense Category': 'menu.expense_category',
  'Income': 'menu.income',
  'Income Category': 'menu.income_category',
  'Bank Accounts': 'menu.bank_accounts',
  'Money Transfer': 'menu.money_transfer',
  'Balance Sheet': 'menu.balance_sheet',
  'Trial Balance': 'menu.trial_balance',
  'Cash Flow': 'menu.cash_flow',
  'Account Statement': 'menu.account_statement',

  // Peoples
  'Customers': 'menu.customers',
  'Billers': 'menu.billers',
  'Suppliers': 'menu.suppliers',
  'Stores': 'menu.stores',
  'Warehouses': 'menu.warehouses',

  // HRM
  'Employees': 'menu.employees',
  'Departments': 'menu.departments',
  'Designation': 'menu.designation',
  'Shifts': 'menu.shifts',
  'Attendence': 'menu.attendence',
  'Employee': 'menu.employee',
  'Admin': 'menu.admin',
  'Leaves': 'menu.leaves',
  'Admin Leaves': 'menu.admin_leaves',
  'Employee Leaves': 'menu.employee_leaves',
  'Leave Types': 'menu.leave_types',
  'Holidays': 'menu.holidays',
  'Payroll': 'menu.payroll',
  'Employee Salary': 'menu.employee_salary',
  'Payslip': 'menu.payslip',

  // Reports
  'Sales Report': 'menu.sales_report',
  'Best Seller': 'menu.best_seller',
  'Purchase report': 'menu.purchase_report',
  'Inventory Report': 'menu.inventory_report',
  'Stock History': 'menu.stock_history',
  'Sold Stock': 'menu.sold_stock',
  'Invoice Report': 'menu.invoice_report',
  'Supplier Report': 'menu.supplier_report',
  'Supplier Due Report': 'menu.supplier_due_report',
  'Customer Report': 'menu.customer_report',
  'Customer Due Report': 'menu.customer_due_report',
  'Product Report': 'menu.product_report',
  'Product Expiry Report': 'menu.product_expiry_report',
  'Product Quantity Alert': 'menu.product_quantity_alert',
  'Expense Report': 'menu.expense_report',
  'Income Report': 'menu.income_report',
  'Tax Report': 'menu.tax_report',
  'Profit & Loss': 'menu.profit_and_loss',
  'Annual Report': 'menu.annual_report',

  // User Management
  'Users': 'menu.users',
  'Roles & Permissions': 'menu.roles_permissions',
  'Web Content': 'menu.web_content',
  'Delete Account Request': 'menu.delete_account_request',
};

/**
 * Translates a menu title using the provided t() function.
 * Falls back to the original English title if no mapping exists.
 */
export const translateMenuTitle = (title: string, t: (key: string) => string): string => {
  const key = menuTitleToKey[title];
  if (key) {
    const translated = t(key);
    // If translation returns the key itself, fall back to original title
    return translated === key ? title : translated;
  }
  return title;
};
