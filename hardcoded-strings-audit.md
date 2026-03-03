# Hardcoded English Strings Audit — All 27 Files

---

## 1. `src/pages/AdminDashboard.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, DashboardStats } from '../services/dashboardService';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~15 | `"Welcome, Admin"` | Page title heading |
| ~16 | `"Orders, Today"` | Page subtitle |
| ~25 | `"Total Sales"` | KPI card title |
| ~30 | `"Total Purchase"` | KPI card title |
| ~35 | `"Total Return"` | KPI card title |
| ~40 | `"Total Expense"` | KPI card title |
| ~28 | `"vs last month"` | KPI card comparison text |
| ~50 | `"Sales & Purchase"` | Chart section title |
| ~60 | `"Best Seller"` | Table section title |
| ~62 | `"View All"` | Link text |
| ~70 | `"Recent Orders"` | Table section title |
| ~75 | `"Order ID"` | Table header |
| ~76 | `"Customer"` | Table header |
| ~77 | `"Product"` | Table header |
| ~78 | `"Amount"` | Table header |
| ~79 | `"Date"` | Table header |
| ~80 | `"Status"` | Table header |
| ~90 | `"Completed"` | Status badge text |
| ~91 | `"Processing"` | Status badge text |
| ~92 | `"Pending"` | Status badge text |
| ~93 | `"Cancelled"` | Status badge text |

---

## 2. `src/pages/inventory/ProductList.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { mediaUrl } from '../../services/api';
import { getProducts, deleteProduct, getCategories, getBrands, ... } from '../../services/productService';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~35 | `"Product List"` | Page title |
| ~36 | `"Manage your products"` | Page subtitle |
| ~40 | `"Pdf"` | Tooltip title |
| ~41 | `"Excel"` | Tooltip title |
| ~42 | `"Refresh"` | Tooltip title |
| ~48 | `"Add Product"` | Button text |
| ~55 | `"Search"` | Input placeholder |
| ~60 | `"Category"` | Dropdown label |
| ~65 | `"Brand"` | Dropdown label |
| ~62 | `"All"` | Dropdown option |
| ~80 | `"Loading..."` | Loading text |
| ~90 | `"SKU"` | Table header |
| ~91 | `"Product Name"` | Table header |
| ~92 | `"Price"` | Table header |
| ~93 | `"Unit"` | Table header |
| ~94 | `"Qty"` | Table header |
| ~95 | `"Actions"` | Table header |
| ~120 | `"No products found."` | Empty state |
| ~130 | `"Delete Product"` | Modal title |
| ~132 | `"Are you sure you want to delete this product?"` | Confirm message |
| ~140 | `"Cancel"` | Button text |
| ~142 | `"Delete"` | Button text |
| ~155 | `"Failed to delete product."` | Error message |

---

## 3. `src/pages/inventory/CategoryList.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~40 | `"Category"` | Page title |
| ~41 | `"Manage your categories"` | Page subtitle |
| ~50 | `"Pdf"` | Tooltip |
| ~51 | `"Excel"` | Tooltip |
| ~52 | `"Refresh"` | Tooltip |
| ~58 | `"Add Category"` | Button text |
| ~70 | `"Search"` | Placeholder |
| ~80 | `"Category"` | Table header |
| ~81 | `"Category Slug"` | Table header |
| ~82 | `"Status"` | Table header |
| ~83 | `"Created On"` | Table header |
| ~100 | `"Active"` | Status text |
| ~101 | `"Inactive"` | Status text |
| ~120 | `"Edit Category"` | Modal title |
| ~130 | `"Delete Category"` | Modal title |
| ~132 | `"Are you sure you want to delete this category?"` | Confirm message |
| ~140 | `"Save Changes"` | Button text |
| ~142 | `"Cancel"` | Button text |
| ~145 | `"Delete"` | Button text |
| ~160 | `"Failed to delete category."` | Error message |

---

## 4. `src/pages/inventory/BrandList.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect } from 'react';
import api, { mediaUrl } from '../../services/api';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~45 | `"Brand"` | Page title |
| ~46 | `"Manage your brands"` | Page subtitle |
| ~55 | `"Pdf"` | Tooltip |
| ~56 | `"Excel"` | Tooltip |
| ~57 | `"Refresh"` | Tooltip |
| ~60 | `"Add Brand"` | Button text |
| ~70 | `"Search"` | Placeholder |
| ~75 | `"Sort By :"` | Sort label |
| ~76 | `"Latest"` | Sort option |
| ~77 | `"Ascending"` | Sort option |
| ~78 | `"Descending"` | Sort option |
| ~90 | `"Brand"` | Table header |
| ~91 | `"Created Date"` | Table header |
| ~92 | `"Status"` | Table header |
| ~100 | `"Active"` | Status text |
| ~101 | `"Inactive"` | Status text |
| ~120 | `"Edit Brand"` | Modal title |
| ~130 | `"Upload Image"` | Button text |
| ~131 | `"Change Image"` | Button text |
| ~132 | `"JPEG, PNG up to 2 MB"` | Help text |
| ~133 | `"Add Image"` | Button text |
| ~140 | `"Delete Brand"` | Modal title |
| ~142 | `"Are you sure you want to delete brand?"` | Confirm message |
| ~150 | `"Yes Delete"` | Button text |
| ~152 | `"Save Changes"` | Button text |
| ~154 | `"Cancel"` | Button text |

---

## 5. `src/pages/inventory/Units.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~40 | `"Units"` | Page title |
| ~41 | `"Manage your units"` | Page subtitle |
| ~50 | `"Add Unit"` | Button text |
| ~60 | `"Search"` | Placeholder |
| ~70 | `"Unit"` | Table header |
| ~71 | `"Short Name"` | Table header |
| ~72 | `"No of Products"` | Table header |
| ~73 | `"Status"` | Table header |
| ~90 | `"Active"` | Status text |
| ~91 | `"Inactive"` | Status text |
| ~110 | `"Edit Unit"` | Modal title |
| ~120 | `"Delete Unit"` | Modal title |
| ~122 | `"Are you sure you want to delete unit?"` | Confirm message |
| ~130 | `"Yes Delete"` | Button text |
| ~132 | `"Cancel"` | Button text |
| ~134 | `"Save Changes"` | Button text |

---

## 6. `src/pages/inventory/SubCategories.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect } from 'react';
import api, { mediaUrl } from '../../services/api';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~45 | `"Sub Category"` | Page title |
| ~46 | `"Manage your sub categories"` | Page subtitle |
| ~55 | `"Add Sub Category"` | Button text |
| ~65 | `"Search"` | Placeholder |
| ~70 | `"Category"` | Filter dropdown label |
| ~72 | `"All"` | Filter option |
| ~75 | `"Status"` | Filter dropdown label |
| ~80 | `"Image"` | Table header |
| ~81 | `"Sub Category"` | Table header |
| ~82 | `"Category Code"` | Table header |
| ~83 | `"Description"` | Table header |
| ~84 | `"Status"` | Table header |
| ~100 | `"Active"` | Status text |
| ~101 | `"Inactive"` | Status text |
| ~110 | `"Edit Sub Category"` | Modal title |
| ~120 | `"Delete Sub Category"` | Modal title |
| ~122 | `"Are you sure you want to delete sub category?"` | Confirm message |
| ~125 | `"Select"` | Default select option |
| ~130 | `"Cancel"` | Button text |
| ~132 | `"Save Changes"` | Button text |
| ~135 | `"Yes Delete"` | Button text |

---

## 7. `src/pages/inventory/ExpiredProducts.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect } from 'react';
import api, { mediaUrl } from '../../services/api';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~40 | `"Expired Products"` | Page title |
| ~41 | `"Manage your expired products"` | Page subtitle |
| ~50 | `"Pdf"` | Tooltip |
| ~51 | `"Excel"` | Tooltip |
| ~52 | `"Refresh"` | Tooltip |
| ~60 | `"Search"` | Placeholder |
| ~65 | `"Sort By :"` | Sort label |
| ~66 | `"Recently Added"` | Sort option |
| ~67 | `"Last Month"` | Sort option |
| ~68 | `"Last 7 Days"` | Sort option |
| ~80 | `"Product"` | Table header |
| ~81 | `"Product Name"` | Table header |
| ~82 | `"Manufactured Date"` | Table header |
| ~83 | `"Expired Date"` | Table header |
| ~110 | `"Edit Expired Product"` | Modal title |
| ~112 | `"Manufacturer Date"` | Form label |
| ~113 | `"Expiry Date"` | Form label |
| ~120 | `"Delete Product"` | Modal title |
| ~122 | `"Are you sure you want to delete this expired product?"` | Confirm message |
| ~130 | `"Cancel"` | Button text |
| ~132 | `"Save Changes"` | Button text |
| ~135 | `"Yes Delete"` | Button text |

---

## 8. `src/pages/inventory/LowStocks.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import api, { mediaUrl } from '../../services/api';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~45 | `"Low Stocks"` | Page title |
| ~46 | `"Manage your low stocks"` | Page subtitle |
| ~55 | `"Pdf"` | Tooltip |
| ~56 | `"Excel"` | Tooltip |
| ~57 | `"Refresh"` | Tooltip |
| ~70 | `"Search"` | Placeholder |
| ~80 | `"Low Stocks"` | Tab label |
| ~81 | `"Out of Stocks"` | Tab label |
| ~90 | `"Product"` | Table header |
| ~91 | `"SKU"` | Table header |
| ~92 | `"Warehouse"` | Table header |
| ~93 | `"Store"` | Table header |
| ~94 | `"Qty"` | Table header |
| ~95 | `"Qty Alert"` | Table header |
| ~100 | `"Notify"` | Button text |
| ~102 | `"Send Email"` | Button tooltip/text |
| ~120 | `"Edit Low Stocks"` | Modal title |
| ~130 | `"Delete Product"` | Modal title |
| ~132 | `"Are you sure you want to delete product from low stock?"` | Confirm message |
| ~140 | `"Yes Delete"` | Button text |
| ~142 | `"Cancel"` | Button text |
| ~144 | `"Save Changes"` | Button text |
| ~510 | `"Success"` | Modal title |
| ~512 | `"Email Sent Successfully"` | Success message |
| ~520 | `"Close"` | Button text |

---

## 9. `src/pages/sales/OnlineOrders.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import api, { mediaUrl } from '../../services/api';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~50 | `"Sales"` | Page title |
| ~51 | `"Manage Your Sales"` | Page subtitle |
| ~60 | `"Pdf"` | Tooltip |
| ~61 | `"Excel"` | Tooltip |
| ~62 | `"Refresh"` | Tooltip |
| ~68 | `"Add Sales"` | Button text |
| ~75 | `"Search"` | Placeholder |
| ~80 | `"Status"` | Filter dropdown label |
| ~82 | `"Payment Status"` | Filter dropdown label |
| ~85 | `"All"` | Filter option |
| ~88 | `"Sort By:"` | Sort label |
| ~89 | `"Recent"` | Sort option |
| ~90 | `"Amount Asc"` | Sort option |
| ~91 | `"Amount Desc"` | Sort option |
| ~100 | `"Customer"` | Table header |
| ~101 | `"Reference"` | Table header |
| ~102 | `"Date"` | Table header |
| ~103 | `"Grand Total"` | Table header |
| ~104 | `"Paid"` | Table header |
| ~105 | `"Due"` | Table header |
| ~106 | `"Biller"` | Table header |
| ~107 | `"Status"` | Table header |
| ~108 | `"Payment Status"` | Table header |
| ~110 | `"Actions"` | Table header |
| ~140 | `"No sales found"` | Empty state |
| ~160 | `"Sale Detail"` | Dropdown item |
| ~161 | `"Edit Sale"` | Dropdown item |
| ~162 | `"Show Payments"` | Dropdown item |
| ~163 | `"Create Payment"` | Dropdown item |
| ~164 | `"Delete Sale"` | Dropdown item |
| ~200 | `"Sales Detail"` | Detail modal title |
| ~202 | `"Back to Sales"` | Button text |
| ~210 | `"Customer Info"` | Section title |
| ~220 | `"Invoice Info"` | Section title |
| ~240 | `"Order Summary"` | Section title |
| ~250 | `"Product"` | Table header |
| ~251 | `"Qty"` | Table header |
| ~252 | `"Price($)"` | Table header |
| ~253 | `"Discount"` | Table header |
| ~260 | `"Order Tax"` | Summary label |
| ~262 | `"Discount"` | Summary label |
| ~264 | `"Shipping"` | Summary label |
| ~266 | `"Grand Total"` | Summary label |
| ~280 | `"Show Payments -"` | Section title with payment count |
| ~285 | `"No payments recorded"` | Empty state |
| ~290 | `"Paid By"` | Table header |
| ~291 | `"Amount"` | Table header |
| ~292 | `"Date"` | Table header |
| ~295 | `"Edit Payment"` | Action link |
| ~310 | `"Create Payment"` | Modal title |
| ~320 | `"Received Amount"` | Form label |
| ~322 | `"Paying Amount"` | Form label |
| ~324 | `"Payment Type"` | Form label |
| ~326 | `"Maximum 60 Characters"` | Help text |
| ~340 | `"Delete Sale"` | Delete modal title |
| ~342 | `"Are you sure you want to delete this sale?"` | Confirm message |
| ~345 | `"No, Cancel"` | Button text |
| ~347 | `"Yes, Delete"` | Button text |
| ~360 | `"Submit"` | Button text |
| ~362 | `"Save Changes"` | Button text |
| ~364 | `"Cancel"` | Button text |
| ~380 | `"Please type product code and select"` | Placeholder |
| ~385 | `"Search customer..."` | Placeholder |
| ~390 | `"Customer Name"` | Form label |
| ~392 | `"Notes"` | Form label |
| ~400 | `"Edit Sales"` | Edit modal title |

---

## 10. `src/pages/sales/POSOrders.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import api, { mediaUrl } from '../../services/api';
```

**Hardcoded Strings:**
Same as OnlineOrders.tsx with the following differences:
| Line | String | Context |
|------|--------|---------|
| ~50 | `"POS Orders"` | Page title |
| ~51 | `"Manage Your POS Orders"` | Page subtitle |
| ~140 | `"No POS orders found"` | Empty state |
| ~202 | `"Back to POS Orders"` | Button text |

All other strings match OnlineOrders.tsx identically.

---

## 11. `src/pages/sales/Invoice.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~40 | `"Invoices"` | Page title |
| ~41 | `"Manage your stock invoices"` | Page subtitle |
| ~50 | `"Pdf"` | Tooltip |
| ~51 | `"Excel"` | Tooltip |
| ~52 | `"Refresh"` | Tooltip |
| ~60 | `"Search"` | Placeholder |
| ~65 | `"Sort By :"` | Sort label |
| ~66 | `"Recently Added"` | Sort option |
| ~70 | `"Invoice No"` | Table header |
| ~71 | `"Customer"` | Table header |
| ~72 | `"Due Date"` | Table header |
| ~73 | `"Amount"` | Table header |
| ~74 | `"Amount Due"` | Table header |
| ~75 | `"Status"` | Table header |
| ~100 | `"No invoices found"` | Empty state |
| ~120 | `"Delete Invoice"` | Modal title |
| ~122 | `"Are you sure you want to delete this invoice?"` | Confirm message |
| ~130 | `"No, Cancel"` | Button text |
| ~132 | `"Yes, Delete"` | Button text |

---

## 12. `src/pages/sales/SalesReturns.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import api, { mediaUrl } from '../../services/api';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~45 | `"Sales Returns"` | Page title |
| ~46 | `"Manage Your Sales Returns"` | Page subtitle |
| ~55 | `"Pdf"` | Tooltip |
| ~56 | `"Excel"` | Tooltip |
| ~57 | `"Refresh"` | Tooltip |
| ~63 | `"Add Sales Return"` | Button text |
| ~70 | `"Search"` | Placeholder |
| ~80 | `"Customer"` | Table header |
| ~81 | `"Reference"` | Table header |
| ~82 | `"Date"` | Table header |
| ~83 | `"Grand Total"` | Table header |
| ~84 | `"Status"` | Table header |
| ~105 | `"No sales returns found"` | Empty state |
| ~120 | `"Edit Sales Return"` | Modal title |
| ~122 | `"Add Sales Return"` | Modal title (add) |
| ~130 | `"Product Name"` | Table header |
| ~131 | `"Net Unit Price($)"` | Table header |
| ~132 | `"Stock"` | Table header |
| ~133 | `"QTY"` | Table header |
| ~134 | `"Subtotal ($)"` | Table header |
| ~140 | `"Search product by name or SKU..."` | Placeholder |
| ~145 | `"Enter reference"` | Placeholder |
| ~150 | `"N/A"` | Default value text |
| ~160 | `"Update"` | Button text |
| ~162 | `"Submit"` | Button text |
| ~164 | `"Cancel"` | Button text |
| ~170 | `"Delete Sales Return"` | Modal title |
| ~172 | `"Are you sure you want to delete this sales return?"` | Confirm message |
| ~175 | `"No, Cancel"` | Button text |
| ~177 | `"Yes, Delete"` | Button text |

---

## 13. `src/pages/sales/QuotationList.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import api, { mediaUrl } from '../../services/api';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~45 | `"Quotation List"` | Page title |
| ~46 | `"Manage Your Quotation"` | Page subtitle |
| ~55 | `"Pdf"` | Tooltip |
| ~56 | `"Excel"` | Tooltip |
| ~57 | `"Refresh"` | Tooltip |
| ~63 | `"Add Quotation"` | Button text |
| ~70 | `"Search"` | Placeholder |
| ~80 | `"Customer Name"` | Table header |
| ~81 | `"Reference"` | Table header |
| ~82 | `"Date"` | Table header |
| ~83 | `"Grand Total"` | Table header |
| ~84 | `"Status"` | Table header |
| ~105 | `"No quotations found"` | Empty state |
| ~120 | `"Edit Quotation"` | Modal title |
| ~122 | `"Add Quotation"` | Modal title (add) |
| ~130 | `"Product Name"` | Table header |
| ~140 | `"Quotation Detail"` | Detail modal title |
| ~145 | `"Enter reference"` | Placeholder |
| ~150 | `"N/A"` | Default value text |
| ~155 | `"Grand Total:"` | Summary label |
| ~160 | `"Update"` | Button text |
| ~162 | `"Submit"` | Button text |
| ~170 | `"Delete Quotation"` | Modal title |
| ~172 | `"Are you sure you want to delete quotation?"` | Confirm message |
| ~175 | `"No, Cancel"` | Button text |
| ~177 | `"Yes, Delete"` | Button text |

---

## 14. `src/pages/purchases/PurchaseList.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api, { mediaUrl } from '../../services/api';
import { purchaseService } from '../../services/purchaseService';
import { showConfirm, showSuccess, showError } from '../../utils/alertUtils';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~50 | `"Purchases"` | Page title |
| ~51 | `"Manage Your Purchases"` | Page subtitle |
| ~60 | `"Pdf"` | Tooltip |
| ~61 | `"Excel"` | Tooltip |
| ~62 | `"Refresh"` | Tooltip |
| ~68 | `"Add Purchase"` | Button text |
| ~75 | `"Search"` | Placeholder |
| ~80 | `"Status"` | Filter dropdown |
| ~82 | `"Payment Status"` | Filter dropdown |
| ~85 | `"All"` | Filter option |
| ~88 | `"Sort By:"` | Sort label |
| ~89 | `"Recent"` | Sort option |
| ~100 | `"Supplier Name"` | Table header |
| ~101 | `"Reference"` | Table header |
| ~102 | `"Date"` | Table header |
| ~103 | `"Total"` | Table header |
| ~104 | `"Paid"` | Table header |
| ~105 | `"Due"` | Table header |
| ~106 | `"Payment Status"` | Table header |
| ~108 | `"Status"` | Table header |
| ~140 | `"No purchases found"` | Empty state |
| ~150 | `"Previous"` | Pagination button |
| ~152 | `"Next"` | Pagination button |
| ~170 | `"Failed to load purchases"` | Error message |
| ~180 | `"Failed to delete purchase"` | Error message |
| ~182 | `"Purchase deleted successfully"` | Success message |
| ~190 | `"Purchase updated successfully"` | Success message |
| ~192 | `"Purchase created successfully"` | Success message |
| ~195 | `"Failed to save purchase"` | Error message |
| ~200 | `"Please fill in supplier name and reference"` | Validation message |
| ~205 | `"Please select a product"` | Validation message |
| ~220 | `"Add Purchase"` | Modal title |
| ~240 | `"Supplier Name"` | Form label |
| ~242 | `"Date"` | Form label |
| ~244 | `"Reference"` | Form label |
| ~250 | `"Product"` | Form label |
| ~252 | `"Search Product by name or SKU..."` | Placeholder |
| ~260 | `"No products found"` | Dropdown empty state |
| ~265 | `"Select"` | Default select option |
| ~270 | `"Qty"` | Placeholder |
| ~272 | `"Price($)"` | Placeholder |
| ~274 | `"Discount($)"` | Placeholder |
| ~276 | `"Tax(%)"` | Placeholder |
| ~280 | `"Add Item"` | Button text |
| ~290 | `"Product"` | Table header |
| ~291 | `"Qty"` | Table header |
| ~292 | `"Price($)"` | Table header |
| ~293 | `"Discount($)"` | Table header |
| ~294 | `"Tax(%)"` | Table header |
| ~295 | `"Tax Amt($)"` | Table header |
| ~296 | `"Unit Cost($)"` | Table header |
| ~297 | `"Total($)"` | Table header |
| ~298 | `"Act"` | Table header |
| ~300 | `"X"` | Remove button text |
| ~310 | `"Order Tax"` | Form label |
| ~312 | `"Discount"` | Form label |
| ~314 | `"Shipping"` | Form label |
| ~316 | `"Status"` | Form label |
| ~320 | `"Description"` | Form label |
| ~322 | `"Add purchase notes..."` | Placeholder |
| ~324 | `"Maximum 500 characters"` | Help text |
| ~330 | `"Total Amount:"` | Alert text |
| ~340 | `"Cancel"` | Button text |
| ~342 | `"Submit"` | Button text |
| ~360 | `"Edit Purchase"` | Modal title |
| ~380 | `"Delete Purchase"` | Modal title (implied) |

---

## 15. `src/pages/finance/ExpenseList.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { getExpenses, createExpense, updateExpense, deleteExpense, ... } from '../../services/financeService';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~40 | `"Expense List"` | Page title |
| ~41 | `"Manage your expenses"` | Page subtitle |
| ~50 | `"Pdf"` | Tooltip |
| ~51 | `"Excel"` | Tooltip |
| ~52 | `"Refresh"` | Tooltip |
| ~58 | `"Add Expense"` | Button text |
| ~65 | `"Search"` | Placeholder |
| ~70 | `"Category"` | Filter dropdown |
| ~72 | `"All"` | Filter option |
| ~80 | `"Expense Name"` | Table header |
| ~81 | `"Category"` | Table header |
| ~82 | `"Description"` | Table header |
| ~83 | `"Date"` | Table header |
| ~84 | `"Amount"` | Table header |
| ~85 | `"Reference"` | Table header |
| ~100 | `"Edit Expense"` | Modal title |
| ~102 | `"Add Expense"` | Modal title (add) |
| ~110 | `"Select Category"` | Default select option |
| ~130 | `"Delete Expense"` | Modal title |
| ~132 | `"Are you sure you want to delete this expense?"` | Confirm message |
| ~140 | `"Cancel"` | Button text |
| ~142 | `"Save Changes"` | Button text |
| ~144 | `"Submit"` | Button text |
| ~146 | `"Delete"` | Button text |
| ~155 | `"Failed to delete."` | Error message |

---

## 16. `src/pages/finance/Income.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { getIncomes, createIncome, updateIncome, deleteIncome, ... } from '../../services/financeService';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~40 | `"Income"` | Page title |
| ~41 | `"Manage your income records"` | Page subtitle |
| ~50 | `"Pdf"` | Tooltip |
| ~51 | `"Excel"` | Tooltip |
| ~52 | `"Refresh"` | Tooltip |
| ~58 | `"Add Income"` | Button text |
| ~65 | `"Search"` | Placeholder |
| ~80 | `"Income Name"` | Table header |
| ~81 | `"Category"` | Table header |
| ~82 | `"Date"` | Table header |
| ~83 | `"Amount"` | Table header |
| ~84 | `"Store"` | Table header |
| ~85 | `"Notes"` | Table header |
| ~86 | `"Account"` | Table header |
| ~100 | `"Edit Income"` | Modal title |
| ~102 | `"Add Income"` | Modal title (add) |
| ~110 | `"Select Category"` | Default select option |
| ~112 | `"Select Store"` | Default select option |
| ~114 | `"Select Account"` | Default select option |
| ~130 | `"Delete Income"` | Modal title |
| ~132 | `"Are you sure you want to delete this income record?"` | Confirm message |
| ~140 | `"Cancel"` | Button text |
| ~142 | `"Save Changes"` | Button text |
| ~144 | `"Submit"` | Button text |
| ~146 | `"Delete"` | Button text |
| ~155 | `"Failed to delete."` | Error message |

---

## 17. `src/pages/finance/AccountList.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount, getAccountTypes, createAccountType, updateAccountType, deleteAccountType, BankAccount, AccountType } from '../../services/financeService';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~85 | `"Account List"` | Page title (h4) |
| ~85 | `"Manage your bank accounts and account types"` | Page subtitle (h6) |
| ~87 | `"Pdf"` | Tooltip title |
| ~88 | `"Excel"` | Tooltip title |
| ~89 | `"Refresh"` | Tooltip title |
| ~92 | `"Add Account"` | Button text (dynamic) |
| ~92 | `"Add Type"` | Button text (dynamic) |
| ~97 | `"Bank Accounts"` | Nav tab label |
| ~98 | `"Account Type"` | Nav tab label |
| ~101 | `"Search"` | Input placeholder |
| ~105 | `"Loading..."` | visually-hidden text |
| ~110 | `"Account Holder"` | Table header |
| ~111 | `"Account No"` | Table header |
| ~112 | `"Bank Name"` | Table header |
| ~113 | `"Type"` | Table header |
| ~114 | `"Opening Balance"` | Table header |
| ~115 | `"Notes"` | Table header |
| ~116 | `"Status"` | Table header |
| ~120 | `"Active"` | Badge text |
| ~121 | `"Inactive"` | Badge text |
| ~122 | `"Default"` | Badge text |
| ~135 | `"Type"` | Table header (types tab) |
| ~136 | `"Created Date"` | Table header (types tab) |
| ~137 | `"Status"` | Table header (types tab) |
| ~150 | `"Add Bank Account"` | Modal title |
| ~152 | `"Account Holder Name"` | Form label |
| ~153 | `"Account Number"` | Form label |
| ~154 | `"Bank Name"` | Form label |
| ~155 | `"Branch"` | Form label |
| ~156 | `"IFSC"` | Form label |
| ~157 | `"Account Type"` | Form label |
| ~158 | `"Select Type"` | Default select option |
| ~159 | `"Opening Balance"` | Form label |
| ~160 | `"Notes"` | Form label |
| ~162 | `"Status"` | Toggle label |
| ~163 | `"Default"` | Toggle label |
| ~165 | `"Cancel"` | Button text |
| ~166 | `"Add Account"` | Button text |
| ~175 | `"Edit Bank Account"` | Modal title |
| ~185 | `"Save Changes"` | Button text |
| ~190 | `"Add Account Type"` | Modal title |
| ~192 | `"Type Name"` | Form label |
| ~195 | `"Add Type"` | Button text |
| ~200 | `"Edit Account Type"` | Modal title |
| ~210 | `"Delete Bank Account"` | Modal title (dynamic) |
| ~211 | `"Delete Account Type"` | Modal title (dynamic) |
| ~212 | `"Are you sure you want to delete this bank account?"` | Confirm message |
| ~213 | `"Are you sure you want to delete this account type?"` | Confirm message |
| ~215 | `"Failed to delete."` | Error message |
| ~218 | `"Cancel"` | Button text |
| ~219 | `"Delete"` | Button text |

---

## 18. `src/pages/people/Customers.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { MEDIA_BASE_URL } from '../../services/api';
import { Customer, getCustomers, createCustomer, updateCustomer, deleteCustomer, uploadCustomerPicture } from '../../services/customerService';
import { useFieldVisibility } from '../../utils/useFieldVisibility';
import WhatsAppSendModal from '../../components/WhatsAppSendModal';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~170 | `"Customers"` | Page title (h4) |
| ~171 | `"Manage your customer list"` | Page subtitle (h6) |
| ~175 | `"Delete ({count})"` | Bulk delete button |
| ~178 | `"Add Customer"` | Button text |
| ~185 | `"Search customers..."` | Input placeholder |
| ~190 | `"All Status"` | Select default option |
| ~191 | `"Active"` | Select option |
| ~192 | `"Inactive"` | Select option |
| ~193 | `"customer"` / `"customers"` | Count badge text |
| ~200 | `"Customer"` | Table header |
| ~201 | `"CNIC"` | Table header |
| ~202 | `"Phone"` | Table header |
| ~203 | `"City"` | Table header |
| ~204 | `"Misc Balance"` | Table header |
| ~205 | `"Status"` | Table header |
| ~206 | `"Actions"` | Table header |
| ~220 | `"No customers match your filters."` | Filtered empty state |
| ~221 | `"No customers yet. Add your first customer!"` | Empty state |
| ~140 | `"Full Name"` | Form label |
| ~141 | `"Customer name"` | Placeholder |
| ~143 | `"S/O (Father's Name)"` | Form label |
| ~144 | `"Son/Daughter of"` | Placeholder |
| ~146 | `"CNIC"` | Form label |
| ~147 | `"CNIC number"` | Placeholder |
| ~149 | `"Phone"` | Form label |
| ~150 | `"Phone number"` | Placeholder |
| ~152 | `"Email"` | Form label |
| ~153 | `"Email address"` | Placeholder |
| ~155 | `"City"` | Form label / Placeholder |
| ~157 | `"Status"` | Form label |
| ~160 | `"Photo"` | Form label |
| ~165 | `"Address"` | Form label |
| ~166 | `"Full address"` | Placeholder |
| ~240 | `"Add Customer"` | Modal title |
| ~245 | `"Cancel"` | Button text |
| ~247 | `"Saving..."` | Loading button text |
| ~248 | `"Add Customer"` | Submit button text |
| ~260 | `"Edit Customer"` | Modal title |
| ~265 | `"Updating..."` | Loading button text |
| ~266 | `"Update Customer"` | Submit button text |
| ~280 | `"Delete Customer?"` | Modal title |
| ~282 | `"This action cannot be undone."` | Warning text |
| ~285 | `"Cancel"` | Button text |
| ~287 | `"Delete"` | Button text |
| ~300 | `"Customer Details"` | View modal title |
| ~310 | `"S/O"` | Detail label |
| ~312 | `"CNIC"` | Detail label |
| ~314 | `"Misc Balance"` | Detail label |
| ~316 | `"Phone"` | Detail label |
| ~318 | `"Email"` | Detail label |
| ~320 | `"City"` | Detail label |
| ~322 | `"Address"` | Detail label |
| ~330 | `"WhatsApp"` | Button text |
| ~332 | `"Close"` | Button text |
| ~334 | `"Edit"` | Button text |
| ~340 | `"Message Customer"` | WhatsApp modal title |
| ~342 | `"Hello {name},\n\nThis is a message from Asyentyx.\n\nRegards"` | Default WhatsApp message |
| ~227 | `"View"` | Button title |
| ~228 | `"Edit"` | Button title |
| ~229 | `"WhatsApp"` | Button title |
| ~230 | `"Delete"` | Button title |

---

## 19. `src/pages/people/Suppliers.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect } from 'react';
import { getParties, createParty, updateParty, deleteParty, Party, CreatePartyPayload } from '../../services/partyService';
import { showSuccess, showError } from '../../utils/alertUtils';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~80 | `"Suppliers"` | Page title (h4) |
| ~80 | `"Manage your suppliers"` | Page subtitle (h6) |
| ~84 | `"Add Supplier"` | Button text |
| ~90 | `"Search"` | Input placeholder |
| ~95 | `"Country"` | Filter dropdown label |
| ~97 | `"All"` | Filter option |
| ~100 | `"Status"` | Filter dropdown label |
| ~102 | `"Active"` | Filter option/Status text |
| ~103 | `"Inactive"` | Filter option/Status text |
| ~106 | `"Sort By: "` | Sort label prefix |
| ~107 | `"Ascending"` | Sort option |
| ~108 | `"Descending"` | Sort option |
| ~109 | `"Recently Added"` | Sort option |
| ~120 | `"Code"` | Table header |
| ~121 | `"Supplier"` | Table header |
| ~122 | `"Email"` | Table header |
| ~123 | `"Phone"` | Table header |
| ~124 | `"Country"` | Table header |
| ~125 | `"Status"` | Table header |
| ~126 | `"Actions"` | Table header |
| ~135 | `"No suppliers found"` | Empty state |
| ~145 | `"Edit"` | Dropdown item |
| ~147 | `"Delete"` | Dropdown item |
| ~155 | `"Edit Supplier"` | Modal title |
| ~156 | `"Add Supplier"` | Modal title |
| ~160 | `"First Name"` | Form label |
| ~162 | `"Last Name"` | Form label |
| ~164 | `"Email"` | Form label |
| ~166 | `"Phone"` | Form label |
| ~168 | `"Address"` | Form label |
| ~170 | `"City"` | Form label |
| ~172 | `"State"` | Form label |
| ~174 | `"Country"` | Form label |
| ~176 | `"Postal Code"` | Form label |
| ~178 | `"Status"` | Form label |
| ~185 | `"Cancel"` | Button text |
| ~186 | `"Save Changes"` | Button text |
| ~187 | `"Submit"` | Button text |
| ~195 | `"Delete Supplier"` | Modal title |
| ~197 | `"Are you sure you want to delete this supplier?"` | Confirm message |
| ~200 | `"Cancel"` | Button text |
| ~202 | `"Delete"` | Button text |
| ~55 | `"Failed to load suppliers"` | Error message (showError) |
| ~65 | `"First Name is required"` | Validation (showError) |
| ~68 | `"Supplier updated"` | Success message |
| ~69 | `"Supplier created"` | Success message |
| ~70 | `"Failed to save supplier"` | Error message |
| ~76 | `"Supplier deleted"` | Success message |
| ~77 | `"Failed to delete"` | Error message |

---

## 20. `src/pages/people/Billers.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useRef } from 'react';
import { getParties, createParty, updateParty, deleteParty, uploadPartyPicture, Party, CreatePartyPayload } from '../../services/partyService';
import { showSuccess, showError } from '../../utils/alertUtils';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~80 | `"Billers"` | Page title (h4) |
| ~80 | `"Manage your Billers"` | Page subtitle (h6) |
| ~84 | `"Add Biller"` | Button text |
| ~90 | `"Search"` | Placeholder |
| ~95 | `"Country"` | Filter dropdown |
| ~97 | `"All"` | Filter option |
| ~106 | `"Sort By: "` | Sort label |
| ~107 | `"Ascending"` | Sort option |
| ~108 | `"Descending"` | Sort option |
| ~109 | `"Recently Added"` | Sort option |
| ~120 | `"Code"` | Table header |
| ~121 | `"Biller"` | Table header |
| ~122 | `"Company Name"` | Table header |
| ~123 | `"Email"` | Table header |
| ~124 | `"Phone"` | Table header |
| ~125 | `"Country"` | Table header |
| ~126 | `"Actions"` | Table header |
| ~135 | `"No billers found"` | Empty state |
| ~145 | `"Edit"` | Dropdown item |
| ~147 | `"Delete"` | Dropdown item |
| ~155 | `"Edit Biller"` | Modal title |
| ~156 | `"Add Biller"` | Modal title |
| ~160 | `"Upload Image"` | Link text |
| ~162 | `"First Name"` | Form label |
| ~164 | `"Last Name"` | Form label |
| ~166 | `"Company Name"` | Form label |
| ~168 | `"Email"` | Form label |
| ~170 | `"Phone"` | Form label |
| ~172 | `"Address"` | Form label |
| ~174 | `"City"` | Form label |
| ~176 | `"State"` | Form label |
| ~178 | `"Country"` | Form label |
| ~180 | `"Postal Code"` | Form label |
| ~182 | `"Status"` | Form label |
| ~185 | `"Cancel"` | Button text |
| ~186 | `"Save Changes"` | Button text |
| ~187 | `"Submit"` | Button text |
| ~195 | `"Delete Biller"` | Modal title |
| ~197 | `"Are you sure you want to delete this biller?"` | Confirm message |
| ~200 | `"Cancel"` | Button text |
| ~202 | `"Delete"` | Button text |
| ~55 | `"Failed to load billers"` | Error message |
| ~65 | `"First Name is required"` | Validation message |
| ~68 | `"Biller updated"` | Success message |
| ~69 | `"Biller created"` | Success message |
| ~70 | `"Failed to save biller"` | Error message |
| ~76 | `"Biller deleted"` | Success message |
| ~77 | `"Failed to delete"` | Error message |

---

## 21. `src/pages/installments/InstallmentPlans.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { InstallmentPlan, getInstallmentPlans, cancelInstallment } from '../../services/installmentService';
import { mediaUrl, MEDIA_BASE_URL } from '../../services/api';
import WhatsAppSendModal from '../../components/WhatsAppSendModal';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~110 | `"Installment Plans"` | Page title (h4) |
| ~111 | `"Manage product installment plans & repayments"` | Page subtitle (h6) |
| ~114 | `"Pdf"` | Tooltip |
| ~115 | `"Excel"` | Tooltip |
| ~116 | `"Refresh"` | Tooltip |
| ~120 | `"Create Installment Plan"` | Button text (Link) |
| ~125 | `"Total Plans"` | Summary card label |
| ~130 | `"Active Plans"` | Summary card label |
| ~135 | `"Total Financed"` | Summary card label |
| ~140 | `"Total Interest"` | Summary card label |
| ~150 | `"Search"` | Input placeholder |
| ~155 | `"Status"` | Filter dropdown label |
| ~157 | `"All"` | Filter option |
| ~158 | `"Active"` | Filter option |
| ~159 | `"Completed"` | Filter option |
| ~160 | `"Defaulted"` | Filter option |
| ~161 | `"Cancelled"` | Filter option |
| ~165 | `"Loading..."` | visually-hidden |
| ~170 | `"Customer"` | Table header |
| ~171 | `"Product"` | Table header |
| ~172 | `"Price"` | Table header |
| ~173 | `"Down Payment"` | Table header |
| ~174 | `"EMI"` | Table header |
| ~175 | `"Tenure"` | Table header |
| ~176 | `"Interest"` | Table header |
| ~177 | `"Total Payable"` | Table header |
| ~178 | `"Paid"` | Table header |
| ~179 | `"Status"` | Table header |
| ~200 | `"mo"` | Month abbreviation |
| ~210 | `"View Details"` | Action link title |
| ~212 | `"Send WhatsApp"` | Action link title |
| ~214 | `"Cancel Plan"` | Action link title |
| ~225 | `"Cancel Installment Plan"` | Modal title |
| ~227 | `"Are you sure you want to cancel this installment plan?"` | Confirm message |
| ~230 | `"No, Keep It"` | Button text |
| ~232 | `"Yes, Cancel Plan"` | Button text |
| ~240 | `"Send Installment Reminder"` | WhatsApp modal title |

---

## 22. `src/pages/installments/CreateInstallment.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { mediaUrl, MEDIA_BASE_URL } from '../../services/api';
import { CreateInstallmentPayload, createInstallment, addGuarantor, RepaymentEntry, previewInstallment, ... } from '../../services/installmentService';
import { getProducts, createProduct, ProductResponse } from '../../services/productService';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~300 | `"Create Installment Plan"` | Page title (h4) |
| ~301 | `"Set up a new product installment with repayment schedule"` | Page subtitle (h6) |
| ~305 | `"Back to Plans"` | Button text |
| ~310 | `"Customer Information"` | Card section title |
| ~315 | `"New Customer"` | Button text |
| ~320 | `"Search Customer"` | Form label |
| ~322 | `"Type customer name, phone, email or city..."` | Placeholder |
| ~330 | `"Loading customers..."` | Loading text |
| ~332 | `"No customers found"` | Empty state |
| ~350 | `"S/O:"` | Detail label |
| ~351 | `"CNIC:"` | Detail label |
| ~352 | `"Phone:"` | Detail label |
| ~353 | `"Email:"` | Detail label |
| ~354 | `"City:"` | Detail label |
| ~360 | `"Customer Name"` | Form label |
| ~362 | `"Select a customer from search above"` | Placeholder |
| ~364 | `"Phone Number"` | Form label |
| ~366 | `"Auto-filled from customer"` | Placeholder |
| ~370 | `"Address"` | Form label |
| ~375 | `"Next"` | Button text |
| ~380 | `"Guarantors"` | Section title |
| ~382 | `"Add Guarantor"` | Button text |
| ~385 | `"No guarantors added. Click \"Add Guarantor\" to add one."` | Empty state |
| ~390 | `"Guarantor {n}"` | Tab label |
| ~395 | `"Remove"` | Button text |
| ~400 | `"Search Existing Person"` | Form label |
| ~402 | `"Type name, phone, or CNIC to search..."` | Placeholder |
| ~410 | `"Searching..."` | Loading text |
| ~412 | `"No results found. Fill in details below to create new."` | Empty result text |
| ~415 | `"Select an existing person or fill in details below to create new"` | Help text |
| ~425 | `"Full Name"` | Form label |
| ~426 | `"Guarantor name"` | Placeholder |
| ~428 | `"S/O (Father's Name)"` | Form label |
| ~429 | `"Son/Daughter of"` | Placeholder |
| ~431 | `"Phone"` | Form label |
| ~432 | `"Phone number"` | Placeholder |
| ~434 | `"CNIC / ID Number"` | Form label |
| ~435 | `"CNIC or ID number"` | Placeholder |
| ~437 | `"Relationship"` | Form label |
| ~438 | `"Select Relationship"` | Default select option |
| ~439 | `"Father"` | Select option |
| ~440 | `"Brother"` | Select option |
| ~441 | `"Uncle"` | Select option |
| ~442 | `"Friend"` | Select option |
| ~443 | `"Colleague"` | Select option |
| ~444 | `"Employer"` | Select option |
| ~445 | `"Neighbor"` | Select option |
| ~446 | `"Other"` | Select option |
| ~450 | `"Address"` | Form label |
| ~451 | `"Full address"` | Placeholder |
| ~455 | `"Photo / ID Picture"` | Form label |
| ~460 | `"Back"` | Button text |
| ~465 | `"Product Information"` | Section title |
| ~467 | `"New Product"` | Button text |
| ~470 | `"Search Product from Inventory"` | Form label |
| ~472 | `"Type product name, SKU, category or brand..."` | Placeholder |
| ~480 | `"Loading products..."` | Loading text |
| ~482 | `"No products found"` | Empty state |
| ~500 | `"SKU:"` | Detail label |
| ~501 | `"Category:"` | Detail label |
| ~502 | `"Brand:"` | Detail label |
| ~503 | `"Price:"` | Detail label |
| ~510 | `"Product Name"` | Form label |
| ~512 | `"Select a product from search above"` | Placeholder |
| ~514 | `"Product Price (Rs)"` | Form label |
| ~516 | `"Auto-filled from product"` | Placeholder |
| ~520 | `"Finance Amount (Rs)"` | Form label |
| ~522 | `"Leave blank to use product price"` | Placeholder |
| ~524 | `"Custom finance amount (defaults to product price if blank)"` | Help text |
| ~540 | `"Financial Details & Settings"` | Section title |
| ~545 | `"Down Payment (Rs)"` | Form label |
| ~550 | `"Interest Rate (% per annum)"` | Form label |
| ~552 | `"Set 0 for interest-free plan"` | Help text |
| ~555 | `"Tenure (Months)"` | Form label |
| ~557 | `"Months"` | Select option suffix |
| ~560 | `"Start Date"` | Form label |
| ~570 | `"Plan Summary & Schedule"` | Section title |
| ~575 | `"Product Price"` | Summary label |
| ~577 | `"Finance Amount"` | Summary label |
| ~579 | `"Down Payment"` | Summary label |
| ~581 | `"Financed Amount"` | Summary label |
| ~583 | `"Interest Rate"` | Summary label |
| ~585 | `"Tenure"` | Summary label |
| ~587 | `"Monthly EMI"` | Summary label |
| ~589 | `"Total Interest"` | Summary label |
| ~591 | `"Total Payable"` | Summary label |
| ~600 | `"Repayment Schedule"` | Sub-header |
| ~602 | `"installments"` | Badge text |
| ~610 | `"#"` | Table header |
| ~611 | `"Due Date"` | Table header |
| ~612 | `"EMI"` | Table header |
| ~613 | `"Balance"` | Table header |
| ~620 | `"Total"` | Footer label |
| ~635 | `"Creating..."` | Loading text |
| ~636 | `"Create Installment Plan"` | Submit button text |
| ~640 | `"Cancel"` | Button text |
| ~255 | `"Failed to create installment plan. Please try again."` | Error message |
| ~240 | `"Failed to create customer."` | Error message |
| ~270 | `"Failed to create product."` | Error message |
| ~660 | `"Add New Product"` | New product modal title |
| ~662 | `"Product Name"` | Form label |
| ~663 | `"Product name"` | Placeholder |
| ~665 | `"Price (Rs)"` | Form label |
| ~667 | `"SKU"` | Form label |
| ~668 | `"Auto-generated if blank"` | Placeholder |
| ~670 | `"Quantity"` | Form label |
| ~672 | `"Category"` | Form label |
| ~673 | `"e.g. Electronics"` | Placeholder |
| ~675 | `"Brand"` | Form label |
| ~676 | `"e.g. Samsung"` | Placeholder |
| ~680 | `"Description"` | Form label |
| ~681 | `"Brief product description"` | Placeholder |
| ~685 | `"Product Image"` | Form label |
| ~690 | `"Saving..."` | Loading text |
| ~692 | `"Add Product"` | Button text |
| ~700 | `"Add New Customer"` | New customer modal title |
| ~702 | `"Full Name"` | Form label |
| ~703 | `"Customer name"` | Placeholder |
| ~705 | `"S/O (Father's Name)"` | Form label |
| ~706 | `"Son/Daughter of"` | Placeholder |
| ~708 | `"CNIC"` | Form label |
| ~709 | `"CNIC number"` | Placeholder |
| ~711 | `"Phone"` | Form label |
| ~712 | `"Phone number"` | Placeholder |
| ~714 | `"Email"` | Form label |
| ~715 | `"Email address"` | Placeholder |
| ~717 | `"City"` | Form label / Placeholder |
| ~720 | `"Address"` | Form label |
| ~721 | `"Full address"` | Placeholder |
| ~725 | `"Photo"` | Form label |
| ~730 | `"Add Customer"` | Button text |

---

## 23. `src/pages/installments/InstallmentDetails.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mediaUrl, MEDIA_BASE_URL } from '../../services/api';
import { InstallmentPlan, RepaymentEntry, GuarantorDto, getInstallmentById, payInstallment, deleteGuarantor } from '../../services/installmentService';
import { getCustomerMiscBalance } from '../../services/miscService';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~108 | `"Partial payment recorded. Remaining amount: Rs ..."` | Alert message |
| ~110 | `"Payment successful! Overpayment of Rs ... has been added to the customer's misc account."` | Alert message |
| ~120 | `"Payment failed. Please try again."` | Alert message |
| ~125 | `"Paid"` | Status label |
| ~126 | `"Partial"` | Status label |
| ~127 | `"Due Now"` | Status label |
| ~128 | `"Overdue"` | Status label |
| ~129 | `"Upcoming"` | Status label |
| ~135 | `"Loading..."` | visually-hidden |
| ~140 | `"Plan not found"` | Error heading |
| ~142 | `"Back to Plans"` | Button text |
| ~150 | `"Installment Details"` | Page title (h4) |
| ~158 | `"Back"` | Button text |
| ~160 | `"Print Plan"` | Button text |
| ~162 | `"WhatsApp"` | Button text |
| ~175 | `"Finance Amount"` | Summary card label |
| ~180 | `"Monthly EMI"` | Summary card label |
| ~185 | `"Total Paid"` | Summary card label |
| ~190 | `"Remaining"` | Summary card label |
| ~200 | `"Customer"` | Card header |
| ~210 | `"No address"` | Default address text |
| ~220 | `"Product"` | Card header |
| ~230 | `"Plan Details"` | Card header |
| ~232 | `"Finance Amount"` | Detail label |
| ~234 | `"Down Payment"` | Detail label |
| ~236 | `"Financed Amount"` | Detail label |
| ~238 | `"Interest Rate"` | Detail label |
| ~239 | `"p.a."` | Rate suffix |
| ~240 | `"Tenure"` | Detail label |
| ~241 | `"months"` | Duration suffix |
| ~242 | `"Monthly EMI"` | Detail label |
| ~244 | `"Total Interest"` | Detail label |
| ~246 | `"Total Payable"` | Detail label |
| ~248 | `"Start Date"` | Detail label |
| ~250 | `"Status"` | Detail label |
| ~260 | `"Repayment Progress"` | Label |
| ~265 | `"Next due:"` | Text |
| ~270 | `"Guarantors"` | Card header |
| ~280 | `"S/O:"` | Detail label |
| ~290 | `"Remove guarantor {name}?"` | Confirm message (window.confirm) |
| ~300 | `"Repayment Schedule"` | Card header |
| ~302 | `"Paid:"` | Badge label |
| ~303 | `"Remaining:"` | Badge label |
| ~310 | `"#"` | Table header |
| ~311 | `"Due Date"` | Table header |
| ~312 | `"EMI Amount"` | Table header |
| ~313 | `"Paid"` | Table header |
| ~314 | `"Balance"` | Table header |
| ~315 | `"Status"` | Table header |
| ~316 | `"Paid Date"` | Table header |
| ~320 | `"Down Payment"` | Badge text (in row) |
| ~335 | `"Misc only"` | Small text |
| ~337 | `"from Misc"` | Text suffix for misc adjustment |
| ~345 | `"Complete"` | Button text (for partial) |
| ~347 | `"Pay"` | Button text |
| ~350 | `"Share"` | Button text |
| ~353 | `"Slip"` | Button text |
| ~360 | `"Total"` | Table footer label |
| ~370 | `"Pay Installment #{n}"` | Modal title |
| ~375 | `"EMI Amount"` | Form label |
| ~380 | `"Remaining Amount"` / `"Payment Amount"` | Dynamic form label |
| ~381 | `"Cash:"` | Part of dynamic label |
| ~382 | `"Misc:"` | Part of dynamic label |
| ~385 | `"Enter payment amount"` | Placeholder |
| ~390 | `"Payment Method"` | Form label |
| ~391 | `"Cash"` | Select option |
| ~392 | `"Card"` | Select option |
| ~393 | `"Bank Transfer"` | Select option |
| ~394 | `"Check"` | Select option |
| ~400 | `"Customer Misc Balance"` | Form label |
| ~405 | `"Use misc balance for future installments"` | Checkbox label |
| ~410 | `"Notes"` | Form label |
| ~411 | `"Optional payment notes"` | Placeholder |
| ~420 | `"Overpayment:"` | Alert text |
| ~422 | `"will be added to the customer's misc account."` | Alert continuation |
| ~425 | `"Underpayment:"` | Alert text |
| ~427 | `"This installment will be marked as Partial."` | Alert continuation |
| ~428 | `"Remaining after payment:"` | Alert text |
| ~435 | `"Cancel"` | Button text |
| ~437 | `"Processing..."` | Loading button text |
| ~438 | `"Process Payment"` | Submit button text |
| ~450 | `"Customer Details"` | Customer modal title |
| ~455 | `"Customer"` | Label under name |
| ~460 | `"S/O (Father's Name)"` | Detail label |
| ~462 | `"CNIC"` | Detail label |
| ~465 | `"Phone"` | Detail label |
| ~466 | `"N/A"` | Default value |
| ~468 | `"Address"` | Detail label |
| ~475 | `"Close"` | Button text |
| ~480 | `"Guarantor Details"` | Guarantor modal title |
| ~485 | `"S/O:"` | Detail label |
| ~490 | `"Phone"` | Detail label |
| ~491 | `"N/A"` | Default value |
| ~493 | `"CNIC / ID Number"` | Detail label |
| ~495 | `"Address"` | Detail label |
| ~497 | `"Relationship"` | Detail label |
| ~505 | `"WhatsApp"` | Button text (guarantor) |
| ~507 | `"Close"` | Button text |
| ~510 | `"Send WhatsApp Message"` | WhatsApp modal title |

---

## 24. `src/pages/users/Users.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { userService, UserDto, CreateUserPayload, UpdateUserPayload } from '../../services/userService';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~3 | `'Admin', 'Manager', 'Salesman', 'Supervisor', 'Store Keeper', 'Delivery Biker', 'Maintenance', 'Quality Analyst', 'Accountant', 'Purchase', 'User'` | ROLES array values |
| ~110 | `"Users"` | Page title (h4) |
| ~111 | `"Manage your users"` | Page subtitle (h6) |
| ~114 | `"Refresh"` | Tooltip |
| ~118 | `"Add User"` | Button text |
| ~125 | `"Search"` | Input placeholder |
| ~130 | `"Status"` | Filter dropdown |
| ~132 | `"All"` | Filter option |
| ~133 | `"Active"` | Filter option |
| ~134 | `"Inactive"` | Filter option |
| ~140 | `"Loading..."` | visually-hidden |
| ~145 | `"#"` | Table header |
| ~146 | `"User Name"` | Table header |
| ~147 | `"Phone"` | Table header |
| ~148 | `"Email"` | Table header |
| ~149 | `"Role"` | Table header |
| ~150 | `"Status"` | Table header |
| ~155 | `"No users match your filters."` | Filtered empty state |
| ~156 | `"No users found."` | Empty state |
| ~165 | `"Active"` | Status badge |
| ~167 | `"Inactive"` | Status badge |
| ~180 | `"Add User"` | Modal title |
| ~185 | `"Full Name"` | Form label |
| ~187 | `"Role"` | Form label |
| ~189 | `"Email"` | Form label |
| ~191 | `"Phone"` | Form label |
| ~193 | `"Password"` | Form label |
| ~195 | `"Confirm Password"` | Form label |
| ~197 | `"Status"` | Toggle label |
| ~200 | `"Cancel"` | Button text |
| ~201 | `"Adding..."` | Loading button |
| ~202 | `"Add User"` | Submit button |
| ~210 | `"Edit User"` | Modal title |
| ~215 | `"Password"` | Form label |
| ~216 | `"(leave blank to keep current)"` | Help text |
| ~218 | `"Confirm Password"` | Form label |
| ~220 | `"Saving..."` | Loading button |
| ~221 | `"Save Changes"` | Submit button |
| ~230 | `"Delete User"` | Modal title |
| ~232 | `"Are you sure you want to delete {name}?"` | Confirm message |
| ~235 | `"Cancel"` | Button text |
| ~236 | `"Deleting..."` | Loading button |
| ~237 | `"Yes Delete"` | Submit button |
| ~50 | `"Failed to load users."` | Error message |
| ~60 | `"Name, email and password are required."` | Validation message |
| ~62 | `"Password must be at least 6 characters."` | Validation message |
| ~64 | `"Passwords do not match."` | Validation message |
| ~70 | `"Failed to add user."` | Error fallback |
| ~85 | `"Name and email are required."` | Validation message |
| ~95 | `"Failed to update user."` | Error fallback |
| ~105 | `"Failed to delete user."` | Error message |

---

## 25. `src/pages/stock/ManageStocks.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { mediaUrl } from '../../services/api';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~175 | `"Manage Stock"` | Page title (h4) |
| ~176 | `"Manage your stock"` | Page subtitle (h6) |
| ~178 | `"Pdf"` | Tooltip |
| ~179 | `"Excel"` | Tooltip |
| ~180 | `"Refresh"` | Tooltip |
| ~181 | `"Collapse"` | Tooltip |
| ~185 | `"Add Stock"` | Button text |
| ~190 | `"Search"` | Placeholder |
| ~195 | `"Warehouse"` | Filter dropdown label |
| ~197 | `"All"` | Filter option |
| ~200 | `"Store"` | Filter dropdown label |
| ~205 | `"Product"` | Filter dropdown label |
| ~210 | `"Loading..."` | visually-hidden |
| ~215 | `"Warehouse"` | Table header |
| ~216 | `"Store"` | Table header |
| ~217 | `"Product"` | Table header |
| ~218 | `"Date"` | Table header |
| ~219 | `"Person"` | Table header |
| ~220 | `"Qty"` | Table header |
| ~250 | `"Add Stock"` | Modal title |
| ~255 | `"Warehouse"` | Form label |
| ~256 | `"Select"` | Default select option |
| ~258 | `"Store"` | Form label |
| ~260 | `"Responsible Person"` | Form label |
| ~261 | `"Enter person name"` | Placeholder |
| ~265 | `"Product"` | Form label (in renderProductSearch) |
| ~267 | `"Search Product"` | Placeholder |
| ~280 | `"SKU"` | Table header (preview) |
| ~281 | `"Category"` | Table header (preview) |
| ~282 | `"Qty"` | Table header (preview) |
| ~300 | `"Cancel"` | Button text |
| ~302 | `"Add Stock"` | Submit button |
| ~310 | `"Edit Stock"` | Modal title |
| ~320 | `"Save Changes"` | Submit button |
| ~330 | `"Delete Stock"` | Modal title |
| ~332 | `"Are you sure you want to delete product from stock?"` | Confirm message |
| ~335 | `"No, Cancel"` | Button text |
| ~337 | `"Yes, Delete"` | Button text |

---

## 26. `src/pages/stock/StockAdjustment.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { mediaUrl } from '../../services/api';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~175 | `"Stock Adjustment"` | Page title (h4) |
| ~176 | `"Manage your stock adjustment"` | Page subtitle (h6) |
| ~178 | `"Pdf"` | Tooltip |
| ~179 | `"Excel"` | Tooltip |
| ~180 | `"Refresh"` | Tooltip |
| ~181 | `"Collapse"` | Tooltip |
| ~185 | `"Add Adjustment"` | Button text |
| ~190 | `"Search"` | Placeholder |
| ~195 | `"Warehouse"` | Filter dropdown |
| ~197 | `"All"` | Filter option |
| ~200 | `"Sort By :"` | Sort label |
| ~201 | `"Recently Added"` | Sort option |
| ~202 | `"Ascending"` | Sort option |
| ~203 | `"Descending"` | Sort option |
| ~210 | `"Loading..."` | visually-hidden |
| ~215 | `"Warehouse"` | Table header |
| ~216 | `"Store"` | Table header |
| ~217 | `"Product"` | Table header |
| ~218 | `"Date"` | Table header |
| ~219 | `"Person"` | Table header |
| ~220 | `"Qty"` | Table header |
| ~250 | `"Add Adjustment"` | Modal title |
| ~252 | `"Product"` | Form label |
| ~253 | `"Search Product"` | Placeholder |
| ~258 | `"Warehouse"` | Form label |
| ~259 | `"Select"` | Default select option |
| ~261 | `"Reference Number"` | Form label |
| ~263 | `"Store"` | Form label |
| ~265 | `"Responsible Person"` | Form label |
| ~266 | `"Enter person name"` | Placeholder |
| ~268 | `"Notes"` | Form label |
| ~275 | `"Cancel"` | Button text |
| ~277 | `"Create Adjustment"` | Submit button |
| ~285 | `"Edit Adjustment"` | Modal title |
| ~290 | `"SKU"` | Table header (preview) |
| ~291 | `"Category"` | Table header (preview) |
| ~292 | `"Qty"` | Table header (preview) |
| ~310 | `"Save Changes"` | Submit button |
| ~320 | `"Notes"` | View notes modal title |
| ~322 | `"No notes available."` | Default notes text |
| ~330 | `"Delete Stock Adjustment"` | Modal title |
| ~332 | `"Are you sure you want to delete stock adjustment?"` | Confirm message |
| ~335 | `"No, Cancel"` | Button text |
| ~337 | `"Yes, Delete"` | Button text |

---

## 27. `src/pages/stock/StockTransfer.tsx`

**Imports (first 5 lines):**
```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { mediaUrl } from '../../services/api';
```

**Hardcoded Strings:**
| Line | String | Context |
|------|--------|---------|
| ~175 | `"Stock Transfer"` | Page title (h4) |
| ~176 | `"Manage your stock transfer"` | Page subtitle (h6) |
| ~178 | `"Pdf"` | Tooltip |
| ~179 | `"Excel"` | Tooltip |
| ~180 | `"Refresh"` | Tooltip |
| ~181 | `"Collapse"` | Tooltip |
| ~185 | `"Add New"` | Button text |
| ~190 | `"Search"` | Placeholder |
| ~195 | `"From Warehouse"` | Filter dropdown label |
| ~197 | `"All"` | Filter option |
| ~200 | `"To Warehouse"` | Filter dropdown label |
| ~205 | `"Sort By :"` | Sort label |
| ~206 | `"Recently Added"` | Sort option |
| ~207 | `"Ascending"` | Sort option |
| ~208 | `"Descending"` | Sort option |
| ~210 | `"Loading..."` | visually-hidden |
| ~215 | `"From Warehouse"` | Table header |
| ~216 | `"To Warehouse"` | Table header |
| ~217 | `"No of Products"` | Table header |
| ~218 | `"Quantity Transferred"` | Table header |
| ~219 | `"Ref Number"` | Table header |
| ~220 | `"Date"` | Table header |
| ~240 | `"Add Transfer"` | Modal title |
| ~242 | `"Warehouse From"` | Form label |
| ~243 | `"Select"` | Default select option |
| ~245 | `"Warehouse To"` | Form label |
| ~247 | `"Reference Number"` | Form label |
| ~250 | `"Product"` | Form label |
| ~251 | `"Search Product"` | Placeholder |
| ~255 | `"SKU"` | Table header (items table) |
| ~256 | `"Category"` | Table header (items table) |
| ~257 | `"Qty"` | Table header (items table) |
| ~258 | `"Action"` | Table header (items table) |
| ~265 | `"Notes"` | Form label |
| ~270 | `"Cancel"` | Button text |
| ~272 | `"Create"` | Submit button |
| ~280 | `"Edit Transfer"` | Modal title |
| ~285 | `"Reference No"` | Form label |
| ~290 | `"Save Changes"` | Submit button |
| ~300 | `"Delete Stock Transfer"` | Modal title |
| ~302 | `"Are you sure you want to delete stock transfer?"` | Confirm message |
| ~305 | `"No, Cancel"` | Button text |
| ~307 | `"Yes, Delete"` | Button text |

---

## Summary Statistics

| Category | Count (approx.) |
|----------|-----------------|
| Page Titles | 27 |
| Page Subtitles | 27 |
| Table Headers | ~180+ |
| Button Labels | ~120+ |
| Form Labels | ~150+ |
| Placeholders | ~60+ |
| Modal Titles | ~70+ |
| Confirm/Alert Messages | ~40+ |
| Status Text (Active/Inactive/etc.) | ~30+ |
| Empty States | ~20+ |
| Error Messages | ~25+ |
| Success Messages | ~10+ |
| Tooltip Titles (Pdf/Excel/Refresh) | ~40+ |
| Select Default Options | ~15+ |
| **Total Hardcoded Strings** | **~800+** |
