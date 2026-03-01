export interface SubMenuItem {
  title: string;
  path: string;
  external?: boolean;
}

export interface MenuItem {
  title: string;
  icon: string;
  iconType: 'tabler' | 'feather';
  path?: string;
  badge?: string;
  children?: (SubMenuItem | SubmenuItem)[];
}

export interface SubmenuItem {
  title: string;
  icon?: string;
  iconType?: 'tabler' | 'feather';
  path?: string;
  children?: (SubMenuItem | SubmenuItem)[];
}

export interface MenuSection {
  header: string;
  items: (MenuItem | SubmenuItem)[];
}

const menuData: MenuSection[] = [
  {
    header: 'Main',
    items: [
      {
        title: 'Dashboard',
        icon: 'ti-layout-grid',
        iconType: 'tabler',
        children: [
          // { title: 'Admin Dashboard', path: '/admin-dashboard' },
          { title: 'Admin Dashboard', path: '/admin-dashboard-2' },
          // { title: 'Sales Dashboard', path: '/sales-dashboard' },
        ],
      },
      // {
      //   title: 'Super Admin',
      //   icon: 'ti-user-edit',
      //   iconType: 'tabler',
      //   children: [
      //     { title: 'Dashboard', path: '/dashboard' },
      //     { title: 'Companies', path: '/companies' },
      //     { title: 'Subscriptions', path: '/subscription' },
      //     { title: 'Packages', path: '/packages' },
      //     { title: 'Domain', path: '/domain' },
      //     { title: 'Purchase Transaction', path: '/purchase-transaction' },
      //   ],
      // },
      // {
      //   title: 'Application',
      //   icon: 'ti-brand-apple-arcade',
      //   iconType: 'tabler',
      //   children: [
      //     { title: 'Chat', path: '/chat' },
      //     {
      //       title: 'Call',
      //       children: [
      //         { title: 'Video Call', path: '/video-call' },
      //         { title: 'Audio Call', path: '/audio-call' },
      //         { title: 'Call History', path: '/call-history' },
      //       ],
      //     },
      //     { title: 'Calendar', path: '/calendar' },
      //     { title: 'Contacts', path: '/contacts' },
      //     { title: 'Email', path: '/email' },
      //     { title: 'To Do', path: '/todo' },
      //     { title: 'Notes', path: '/notes' },
      //     { title: 'File Manager', path: '/file-manager' },
      //     { title: 'Projects', path: '/projects' },
      //     {
      //       title: 'Ecommerce',
      //       children: [
      //         { title: 'Products', path: '/ecommerce/products' },
      //         { title: 'Orders', path: '/ecommerce/orders' },
      //         { title: 'Customers', path: '/ecommerce/customers' },
      //         { title: 'Cart', path: '/ecommerce/cart' },
      //         { title: 'Checkout', path: '/ecommerce/checkout' },
      //         { title: 'Wishlist', path: '/ecommerce/wishlist' },
      //         { title: 'Reviews', path: '/ecommerce/reviews' },
      //       ],
      //     },
      //     { title: 'Social Feed', path: '/social-feed' },
      //     { title: 'Search List', path: '/search-list' },
      //   ],
      // },
      // {
      //   title: 'Layouts',
      //   icon: 'ti-layout-sidebar-right-collapse',
      //   iconType: 'tabler',
      //   children: [
      //     { title: 'Horizontal', path: '/layout-horizontal' },
      //     { title: 'Detached', path: '/layout-detached' },
      //     { title: 'Two Column', path: '/layout-two-column' },
      //     { title: 'Hovered', path: '/layout-hovered' },
      //     { title: 'Boxed', path: '/layout-boxed' },
      //     { title: 'RTL', path: '/layout-rtl' },
      //     { title: 'Dark', path: '/layout-dark' },
      //   ],
      // },
    ],
  },
  {
    header: 'Inventory',
    items: [
      { title: 'Products', icon: 'box', iconType: 'feather', path: '/product-list' },
      { title: 'Create Product', icon: 'ti-table-plus', iconType: 'tabler', path: '/add-product' },
      { title: 'Expired Products', icon: 'ti-progress-alert', iconType: 'tabler', path: '/expired-products' },
      { title: 'Low Stocks', icon: 'ti-trending-up-2', iconType: 'tabler', path: '/low-stocks' },
      { title: 'Category', icon: 'ti-list-details', iconType: 'tabler', path: '/category-list' },
      { title: 'Sub Category', icon: 'ti-carousel-vertical', iconType: 'tabler', path: '/sub-categories' },
      { title: 'Brands', icon: 'ti-triangles', iconType: 'tabler', path: '/brand-list' },
      { title: 'Units', icon: 'ti-brand-unity', iconType: 'tabler', path: '/units' },
      { title: 'Variant Attributes', icon: 'ti-checklist', iconType: 'tabler', path: '/variant-attributes' },
      { title: 'Warranties', icon: 'ti-certificate', iconType: 'tabler', path: '/warranty' },
      { title: 'Print Barcode', icon: 'ti-barcode', iconType: 'tabler', path: '/barcode' },
      { title: 'Print QR Code', icon: 'ti-qrcode', iconType: 'tabler', path: '/qrcode' },
    ],
  },
  {
    header: 'Stock',
    items: [
      { title: 'Manage Stock', icon: 'ti-stack-3', iconType: 'tabler', path: '/manage-stocks' },
      { title: 'Stock Adjustment', icon: 'ti-stairs-up', iconType: 'tabler', path: '/stock-adjustment' },
      { title: 'Stock Transfer', icon: 'ti-stack-pop', iconType: 'tabler', path: '/stock-transfer' },
    ],
  },
  {
    header: 'Installments',
    items: [
      {
        title: 'Installments',
        icon: 'ti-calendar-dollar',
        iconType: 'tabler',
        children: [
          { title: 'All Plans', path: '/installment-plans' },
          { title: 'Create Plan', path: '/create-installment' },
        ],
      },
    ],
  },
  {
    header: 'Installment Reports',
    items: [
      {
        title: 'Financial Reports',
        icon: 'ti-report-money',
        iconType: 'tabler',
        children: [
          { title: 'Installment Collection', path: '/inst-collection-report' },
          { title: 'Outstanding Balance', path: '/inst-outstanding-balance' },
          { title: 'Daily Cash Flow', path: '/inst-daily-cashflow' },
          { title: 'Profit & Loss', path: '/inst-profit-loss' },
          { title: 'Product Profit', path: '/inst-product-profit' },
        ],
      },
      {
        title: 'Customer Reports',
        icon: 'ti-users-group',
        iconType: 'tabler',
        children: [
          { title: 'Customer Ledger', path: '/inst-customer-ledger' },
          { title: 'Defaulters', path: '/inst-defaulters' },
          { title: 'Payment History', path: '/inst-payment-history' },
        ],
      },
      {
        title: 'Sales Reports',
        icon: 'ti-chart-bar',
        iconType: 'tabler',
        children: [
          { title: 'Sales Summary', path: '/inst-sales-summary' },
          { title: 'Product-wise Sales', path: '/inst-product-sales' },
        ],
      },
      {
        title: 'Risk & Compliance',
        icon: 'ti-shield-check',
        iconType: 'tabler',
        children: [
          { title: 'Default Rate', path: '/inst-default-rate' },
          { title: 'Recovery Performance', path: '/inst-recovery-performance' },
        ],
      },
      {
        title: 'Operational Reports',
        icon: 'ti-clipboard-check',
        iconType: 'tabler',
        children: [
          { title: 'Due Today', path: '/inst-due-today' },
          { title: 'Upcoming Due (7 Days)', path: '/inst-upcoming-due' },
          { title: 'Late Fee Report', path: '/inst-late-fees' },
        ],
      },
    ],
  },
  {
    header: 'Sales',
    items: [
      {
        title: 'Sales',
        icon: 'ti-layout-grid',
        iconType: 'tabler',
        children: [
          { title: 'Online Orders', path: '/online-orders' },
          { title: 'POS Orders', path: '/pos-orders' },
        ],
      },
      { title: 'Invoices', icon: 'ti-file-invoice', iconType: 'tabler', path: '/invoice' },
      { title: 'Sales Return', icon: 'ti-receipt-refund', iconType: 'tabler', path: '/sales-returns' },
      { title: 'Quotation', icon: 'ti-files', iconType: 'tabler', path: '/quotation-list' },
      { title: 'POS', icon: 'ti-device-laptop', iconType: 'tabler', path: '/pos' },
    ],
  },
  {
    header: 'Promo',
    items: [
      { title: 'Coupons', icon: 'ti-ticket', iconType: 'tabler', path: '/coupons' },
      { title: 'Gift Cards', icon: 'ti-cards', iconType: 'tabler', path: '/gift-cards' },
      {
        title: 'Discount',
        icon: 'ti-file-percent',
        iconType: 'tabler',
        children: [
          { title: 'Discount Plan', path: '/discount-plan' },
          { title: 'Discount', path: '/discount' },
        ],
      },
    ],
  },
  {
    header: 'Purchases',
    items: [
      { title: 'Purchases', icon: 'ti-shopping-bag', iconType: 'tabler', path: '/purchase-list' },
      { title: 'Purchase Order', icon: 'ti-file-unknown', iconType: 'tabler', path: '/purchase-order-report' },
      { title: 'Purchase Return', icon: 'ti-file-upload', iconType: 'tabler', path: '/purchase-returns' },
    ],
  },
  {
    header: 'Finance & Accounts',
    items: [
      {
        title: 'Expenses',
        icon: 'ti-file-stack',
        iconType: 'tabler',
        children: [
          { title: 'Expenses', path: '/expense-list' },
          { title: 'Expense Category', path: '/expense-category' },
        ],
      },
      {
        title: 'Income',
        icon: 'ti-file-pencil',
        iconType: 'tabler',
        children: [
          { title: 'Income', path: '/income' },
          { title: 'Income Category', path: '/income-category' },
        ],
      },
      { title: 'Bank Accounts', icon: 'ti-building-bank', iconType: 'tabler', path: '/account-list' },
      { title: 'Money Transfer', icon: 'ti-moneybag', iconType: 'tabler', path: '/money-transfer' },
      { title: 'Balance Sheet', icon: 'ti-report-money', iconType: 'tabler', path: '/balance-sheet' },
      { title: 'Trial Balance', icon: 'ti-alert-circle', iconType: 'tabler', path: '/trial-balance' },
      { title: 'Cash Flow', icon: 'ti-zoom-money', iconType: 'tabler', path: '/cash-flow' },
      { title: 'Account Statement', icon: 'ti-file-infinity', iconType: 'tabler', path: '/account-statement' },
    ],
  },
  {
    header: 'Peoples',
    items: [
      { title: 'Customers', icon: 'ti-users-group', iconType: 'tabler', path: '/customers' },
      { title: 'Billers', icon: 'ti-user-up', iconType: 'tabler', path: '/billers' },
      { title: 'Suppliers', icon: 'ti-user-dollar', iconType: 'tabler', path: '/suppliers' },
      { title: 'Stores', icon: 'ti-home-bolt', iconType: 'tabler', path: '/store-list' },
      { title: 'Warehouses', icon: 'ti-archive', iconType: 'tabler', path: '/warehouse' },
    ],
  },
  {
    header: 'HRM',
    items: [
      { title: 'Employees', icon: 'ti-user', iconType: 'tabler', path: '/employees-grid' },
      { title: 'Departments', icon: 'ti-compass', iconType: 'tabler', path: '/department-grid' },
      { title: 'Designation', icon: 'ti-git-merge', iconType: 'tabler', path: '/designation' },
      { title: 'Shifts', icon: 'ti-arrows-shuffle', iconType: 'tabler', path: '/shift' },
      {
        title: 'Attendence',
        icon: 'ti-user-cog',
        iconType: 'tabler',
        children: [
          { title: 'Employee', path: '/attendance-employee' },
          { title: 'Admin', path: '/attendance-admin' },
        ],
      },
      {
        title: 'Leaves',
        icon: 'ti-calendar',
        iconType: 'tabler',
        children: [
          { title: 'Admin Leaves', path: '/leaves-admin' },
          { title: 'Employee Leaves', path: '/leaves-employee' },
          { title: 'Leave Types', path: '/leave-types' },
        ],
      },
      { title: 'Holidays', icon: 'ti-calendar-share', iconType: 'tabler', path: '/holidays' },
      {
        title: 'Payroll',
        icon: 'ti-file-dollar',
        iconType: 'tabler',
        children: [
          { title: 'Employee Salary', path: '/employee-salary' },
          { title: 'Payslip', path: '/payslip' },
        ],
      },
    ],
  },
  {
    header: 'Reports',
    items: [
      {
        title: 'Sales Report',
        icon: 'ti-chart-bar',
        iconType: 'tabler',
        children: [
          { title: 'Sales Report', path: '/sales-report' },
          { title: 'Best Seller', path: '/best-seller' },
        ],
      },
      { title: 'Purchase report', icon: 'ti-chart-pie-2', iconType: 'tabler', path: '/purchase-report' },
      {
        title: 'Inventory Report',
        icon: 'ti-triangle-inverted',
        iconType: 'tabler',
        children: [
          { title: 'Inventory Report', path: '/inventory-report' },
          { title: 'Stock History', path: '/stock-history' },
          { title: 'Sold Stock', path: '/sold-stock' },
        ],
      },
      { title: 'Invoice Report', icon: 'ti-businessplan', iconType: 'tabler', path: '/invoice-report' },
      {
        title: 'Supplier Report',
        icon: 'ti-user-star',
        iconType: 'tabler',
        children: [
          { title: 'Supplier Report', path: '/supplier-report' },
          { title: 'Supplier Due Report', path: '/supplier-due-report' },
        ],
      },
      {
        title: 'Customer Report',
        icon: 'ti-report',
        iconType: 'tabler',
        children: [
          { title: 'Customer Report', path: '/customer-report' },
          { title: 'Customer Due Report', path: '/customer-due-report' },
        ],
      },
      {
        title: 'Product Report',
        icon: 'ti-report-analytics',
        iconType: 'tabler',
        children: [
          { title: 'Product Report', path: '/product-report' },
          { title: 'Product Expiry Report', path: '/product-expiry-report' },
          { title: 'Product Quantity Alert', path: '/product-quantity-alert' },
        ],
      },
      { title: 'Expense Report', icon: 'ti-file-vector', iconType: 'tabler', path: '/expense-report' },
      { title: 'Income Report', icon: 'ti-chart-ppf', iconType: 'tabler', path: '/income-report' },
      { title: 'Tax Report', icon: 'ti-chart-dots-2', iconType: 'tabler', path: '/tax-reports' },
      { title: 'Profit & Loss', icon: 'ti-chart-donut', iconType: 'tabler', path: '/profit-and-loss' },
      { title: 'Annual Report', icon: 'ti-report-search', iconType: 'tabler', path: '/annual-report' },
    ],
  },
  // {
  //   header: 'Content (CMS)',
  //   items: [
  //     {
  //       title: 'Pages',
  //       icon: 'ti-page-break',
  //       iconType: 'tabler',
  //       children: [
  //         { title: 'Pages', path: '/pages' },
  //       ],
  //     },
  //     {
  //       title: 'Blog',
  //       icon: 'ti-wallpaper',
  //       iconType: 'tabler',
  //       children: [
  //         { title: 'All Blog', path: '/all-blog' },
  //         { title: 'Blog Tags', path: '/blog-tag' },
  //         { title: 'Categories', path: '/blog-categories' },
  //         { title: 'Blog Comments', path: '/blog-comments' },
  //       ],
  //     },
  //     {
  //       title: 'Location',
  //       icon: 'ti-map-pin',
  //       iconType: 'tabler',
  //       children: [
  //         { title: 'Countries', path: '/countries' },
  //         { title: 'States', path: '/states' },
  //         { title: 'Cities', path: '/cities' },
  //       ],
  //     },
  //     { title: 'Testimonials', icon: 'ti-star', iconType: 'tabler', path: '/testimonials' },
  //     { title: 'FAQ', icon: 'ti-help-circle', iconType: 'tabler', path: '/faq' },
  //   ],
  // },
  {
    header: 'User Management',
    items: [
      { title: 'Users', icon: 'ti-shield-up', iconType: 'tabler', path: '/users' },
      { title: 'Roles & Permissions', icon: 'ti-jump-rope', iconType: 'tabler', path: '/roles-permissions' },
      { title: 'Delete Account Request', icon: 'ti-trash-x', iconType: 'tabler', path: '/delete-account' },
    ],
  },
  // {
  //   header: 'Pages',
  //   items: [
  //     { title: 'Profile', icon: 'ti-user-circle', iconType: 'tabler', path: '/profile' },
  //     {
  //       title: 'Authentication',
  //       icon: 'ti-shield',
  //       iconType: 'tabler',
  //       children: [
  //         {
  //           title: 'Login',
  //           children: [
  //             { title: 'Cover', path: '/signin' },
  //             { title: 'Illustration', path: '/signin-2' },
  //             { title: 'Basic', path: '/signin-3' },
  //           ],
  //         },
  //         {
  //           title: 'Register',
  //           children: [
  //             { title: 'Cover', path: '/register' },
  //             { title: 'Illustration', path: '/register-2' },
  //             { title: 'Basic', path: '/register-3' },
  //           ],
  //         },
  //         {
  //           title: 'Forgot Password',
  //           children: [
  //             { title: 'Cover', path: '/forgot-password' },
  //             { title: 'Illustration', path: '/forgot-password-2' },
  //             { title: 'Basic', path: '/forgot-password-3' },
  //           ],
  //         },
  //         {
  //           title: 'Reset Password',
  //           children: [
  //             { title: 'Cover', path: '/reset-password' },
  //             { title: 'Illustration', path: '/reset-password-2' },
  //             { title: 'Basic', path: '/reset-password-3' },
  //           ],
  //         },
  //         {
  //           title: 'Email Verification',
  //           children: [
  //             { title: 'Cover', path: '/email-verification' },
  //             { title: 'Illustration', path: '/email-verification-2' },
  //             { title: 'Basic', path: '/email-verification-3' },
  //           ],
  //         },
  //         {
  //           title: '2 Step Verification',
  //           children: [
  //             { title: 'Cover', path: '/two-step-verification' },
  //             { title: 'Illustration', path: '/two-step-verification-2' },
  //             { title: 'Basic', path: '/two-step-verification-3' },
  //           ],
  //         },
  //         { title: 'Lock Screen', path: '/lock-screen' },
  //       ],
  //     },
  //     {
  //       title: 'Error Pages',
  //       icon: 'ti-file-x',
  //       iconType: 'tabler',
  //       children: [
  //         { title: '404 Error', path: '/error-404' },
  //         { title: '500 Error', path: '/error-500' },
  //       ],
  //     },
  //     { title: 'Blank Page', icon: 'ti-file', iconType: 'tabler', path: '/blank-page' },
  //     { title: 'Pricing', icon: 'ti-currency-dollar', iconType: 'tabler', path: '/pricing' },
  //     { title: 'Coming Soon', icon: 'ti-send', iconType: 'tabler', path: '/coming-soon' },
  //     { title: 'Under Maintenance', icon: 'ti-alert-triangle', iconType: 'tabler', path: '/under-maintenance' },
  //   ],
  // },
  // {
  //   header: 'Settings',
  //   items: [
  //     {
  //       title: 'General Settings',
  //       icon: 'ti-settings',
  //       iconType: 'tabler',
  //       children: [
  //         { title: 'Profile', path: '/general-settings' },
  //         { title: 'Security', path: '/security-settings' },
  //         { title: 'Notifications', path: '/notification' },
  //         { title: 'Connected Apps', path: '/connected-apps' },
  //       ],
  //     },
  //     {
  //       title: 'Website Settings',
  //       icon: 'ti-world',
  //       iconType: 'tabler',
  //       children: [
  //         { title: 'System Settings', path: '/system-settings' },
  //         { title: 'Company Settings', path: '/company-settings' },
  //         { title: 'Localization', path: '/localization-settings' },
  //         { title: 'Prefixes', path: '/prefixes' },
  //         { title: 'Preference', path: '/preference' },
  //         { title: 'Appearance', path: '/appearance' },
  //         { title: 'Social Authentication', path: '/social-authentication' },
  //         { title: 'Language', path: '/language-settings' },
  //       ],
  //     },
  //     {
  //       title: 'App Settings',
  //       icon: 'ti-device-mobile',
  //       iconType: 'tabler',
  //       children: [
  //         {
  //           title: 'Invoice',
  //           children: [
  //             { title: 'Invoice Settings', path: '/invoice-settings' },
  //             { title: 'Invoice Template', path: '/invoice-templates' },
  //           ],
  //         },
  //         { title: 'Printer', path: '/printer-settings' },
  //         { title: 'POS', path: '/pos-settings' },
  //         { title: 'Custom Fields', path: '/custom-fields' },
  //         { title: 'Field Visibility', path: '/field-visibility' },
  //       ],
  //     },
  //     {
  //       title: 'System Settings',
  //       icon: 'ti-device-desktop',
  //       iconType: 'tabler',
  //       children: [
  //         {
  //           title: 'Email',
  //           children: [
  //             { title: 'Email Settings', path: '/email-settings' },
  //             { title: 'Email Template', path: '/email-templates' },
  //           ],
  //         },
  //         {
  //           title: 'SMS',
  //           children: [
  //             { title: 'SMS Settings', path: '/sms-settings' },
  //             { title: 'SMS Template', path: '/sms-templates' },
  //           ],
  //         },
  //         { title: 'WhatsApp Cloud API', path: '/whatsapp-settings' },
  //         { title: 'OTP', path: '/otp-settings' },
  //         { title: 'GDPR Cookies', path: '/gdpr-settings' },
  //       ],
  //     },
  //     {
  //       title: 'Financial Settings',
  //       icon: 'ti-settings-dollar',
  //       iconType: 'tabler',
  //       children: [
  //         { title: 'Payment Gateway', path: '/payment-gateway-settings' },
  //         { title: 'Bank Accounts', path: '/bank-settings-grid' },
  //         { title: 'Tax Rates', path: '/tax-rates' },
  //         { title: 'Currencies', path: '/currency-settings' },
  //       ],
  //     },
  //     {
  //       title: 'Other Settings',
  //       icon: 'ti-settings-2',
  //       iconType: 'tabler',
  //       children: [
  //         { title: 'Storage', path: '/storage-settings' },
  //         { title: 'Ban IP Address', path: '/ban-ip-address' },
  //       ],
  //     },
  //     { title: 'Logout', icon: 'ti-logout', iconType: 'tabler', path: '/signin' },
  //   ],
  // },
  // {
  //   header: 'UI Interface',
  //   items: [
  //     {
  //       title: 'Base UI',
  //       icon: 'ti-vector-bezier',
  //       iconType: 'tabler',
  //       children: [
  //         { title: 'Alerts', path: '/ui-alerts' },
  //         { title: 'Accordion', path: '/ui-accordion' },
  //         { title: 'Avatar', path: '/ui-avatar' },
  //         { title: 'Badges', path: '/ui-badges' },
  //         { title: 'Border', path: '/ui-borders' },
  //         { title: 'Buttons', path: '/ui-buttons' },
  //         { title: 'Button Group', path: '/ui-buttons-group' },
  //         { title: 'Breadcrumb', path: '/ui-breadcrumb' },
  //         { title: 'Card', path: '/ui-cards' },
  //         { title: 'Carousel', path: '/ui-carousel' },
  //         { title: 'Colors', path: '/ui-colors' },
  //         { title: 'Dropdowns', path: '/ui-dropdowns' },
  //         { title: 'Grid', path: '/ui-grid' },
  //         { title: 'Images', path: '/ui-images' },
  //         { title: 'Lightbox', path: '/ui-lightbox' },
  //         { title: 'Media', path: '/ui-media' },
  //         { title: 'Modals', path: '/ui-modals' },
  //         { title: 'Offcanvas', path: '/ui-offcanvas' },
  //         { title: 'Pagination', path: '/ui-pagination' },
  //         { title: 'Popovers', path: '/ui-popovers' },
  //         { title: 'Progress', path: '/ui-progress' },
  //         { title: 'Placeholders', path: '/ui-placeholders' },
  //         { title: 'Range Slider', path: '/ui-rangeslider' },
  //         { title: 'Spinner', path: '/ui-spinner' },
  //         { title: 'Sweet Alerts', path: '/ui-sweetalerts' },
  //         { title: 'Tabs', path: '/ui-nav-tabs' },
  //         { title: 'Toasts', path: '/ui-toasts' },
  //         { title: 'Tooltips', path: '/ui-tooltips' },
  //         { title: 'Typography', path: '/ui-typography' },
  //         { title: 'Video', path: '/ui-video' },
  //         { title: 'Sortable', path: '/ui-sortable' },
  //         { title: 'Swiperjs', path: '/ui-swiperjs' },
  //       ],
  //     },
  //     {
  //       title: 'Advanced UI',
  //       icon: 'layers',
  //       iconType: 'feather',
  //       children: [
  //         { title: 'Ribbon', path: '/ui-ribbon' },
  //         { title: 'Clipboard', path: '/ui-clipboard' },
  //         { title: 'Drag & Drop', path: '/ui-drag-drop' },
  //         { title: 'Range Slider', path: '/ui-rangeslider-adv' },
  //         { title: 'Rating', path: '/ui-rating' },
  //         { title: 'Text Editor', path: '/ui-text-editor' },
  //         { title: 'Counter', path: '/ui-counter' },
  //         { title: 'Scrollbar', path: '/ui-scrollbar' },
  //         { title: 'Sticky Note', path: '/ui-stickynote' },
  //         { title: 'Timeline', path: '/ui-timeline' },
  //       ],
  //     },
  //     {
  //       title: 'Charts',
  //       icon: 'ti-chart-infographic',
  //       iconType: 'tabler',
  //       children: [
  //         { title: 'Apex Charts', path: '/chart-apex' },
  //         { title: 'Chart C3', path: '/chart-c3' },
  //         { title: 'Chart Js', path: '/chart-js' },
  //         { title: 'Morris Charts', path: '/chart-morris' },
  //         { title: 'Flot Charts', path: '/chart-flot' },
  //         { title: 'Peity Charts', path: '/chart-peity' },
  //       ],
  //     },
  //     {
  //       title: 'Icons',
  //       icon: 'ti-icons',
  //       iconType: 'tabler',
  //       children: [
  //         { title: 'Fontawesome Icons', path: '/icon-fontawesome' },
  //         { title: 'Feather Icons', path: '/icon-feather' },
  //         { title: 'Ionic Icons', path: '/icon-ionic' },
  //         { title: 'Material Icons', path: '/icon-material' },
  //         { title: 'Pe7 Icons', path: '/icon-pe7' },
  //         { title: 'Simpleline Icons', path: '/icon-simpleline' },
  //         { title: 'Themify Icons', path: '/icon-themify' },
  //         { title: 'Weather Icons', path: '/icon-weather' },
  //         { title: 'Typicon Icons', path: '/icon-typicon' },
  //         { title: 'Flag Icons', path: '/icon-flag' },
  //         { title: 'Tabler Icons', path: '/icon-tabler' },
  //         { title: 'Bootstrap Icons', path: '/icon-bootstrap' },
  //         { title: 'Remix Icons', path: '/icon-remix' },
  //       ],
  //     },
  //     {
  //       title: 'Forms',
  //       icon: 'ti-input-search',
  //       iconType: 'tabler',
  //       children: [
  //         {
  //           title: 'Form Elements',
  //           children: [
  //             { title: 'Basic Inputs', path: '/form-basic-inputs' },
  //             { title: 'Checkbox & Radios', path: '/form-checkbox-radios' },
  //             { title: 'Input Groups', path: '/form-input-groups' },
  //             { title: 'Grid & Gutters', path: '/form-grid-gutters' },
  //             { title: 'Form Select', path: '/form-select' },
  //             { title: 'Input Masks', path: '/form-mask' },
  //             { title: 'File Uploads', path: '/form-fileupload' },
  //           ],
  //         },
  //         {
  //           title: 'Layouts',
  //           children: [
  //             { title: 'Horizontal Form', path: '/form-horizontal' },
  //             { title: 'Vertical Form', path: '/form-vertical' },
  //             { title: 'Floating Labels', path: '/form-floating-labels' },
  //           ],
  //         },
  //         { title: 'Form Validation', path: '/form-validation' },
  //         { title: 'Select2', path: '/form-select2' },
  //         { title: 'Form Wizard', path: '/form-wizard' },
  //         { title: 'Form Picker', path: '/form-pickers' },
  //       ],
  //     },
  //     {
  //       title: 'Tables',
  //       icon: 'ti-table',
  //       iconType: 'tabler',
  //       children: [
  //         { title: 'Basic Tables', path: '/tables-basic' },
  //         { title: 'Data Table', path: '/data-tables' },
  //       ],
  //     },
  //     {
  //       title: 'Maps',
  //       icon: 'ti-map-pin-pin',
  //       iconType: 'tabler',
  //       children: [
  //         { title: 'Vector', path: '/maps-vector' },
  //         { title: 'Leaflet', path: '/maps-leaflet' },
  //       ],
  //     },
  //   ],
  // },
  // {
  //   header: 'Help',
  //   items: [
  //     { title: 'Documentation', icon: 'ti-file-text', iconType: 'tabler', path: '#' },
  //     { title: 'Changelog', icon: 'ti-exchange', iconType: 'tabler', path: '#', badge: 'v2.2.4' },
  //     {
  //       title: 'Multi Level',
  //       icon: 'ti-menu-2',
  //       iconType: 'tabler',
  //       children: [
  //         { title: 'Level 1.1', path: '#' },
  //         {
  //           title: 'Level 1.2',
  //           children: [
  //             { title: 'Level 2.1', path: '#' },
  //             {
  //               title: 'Level 2.2',
  //               children: [
  //                 { title: 'Level 3.1', path: '#' },
  //                 { title: 'Level 3.2', path: '#' },
  //               ],
  //             },
  //           ],
  //         },
  //       ],
  //     },
  //   ],
  // },
];

export default menuData;
