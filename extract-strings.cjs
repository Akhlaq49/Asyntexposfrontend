const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/AdminDashboard.tsx',
  'src/pages/inventory/ProductList.tsx',
  'src/pages/inventory/CategoryList.tsx',
  'src/pages/inventory/BrandList.tsx',
  'src/pages/inventory/Units.tsx',
  'src/pages/inventory/SubCategories.tsx',
  'src/pages/inventory/ExpiredProducts.tsx',
  'src/pages/inventory/LowStocks.tsx',
  'src/pages/sales/OnlineOrders.tsx',
  'src/pages/sales/POSOrders.tsx',
  'src/pages/sales/Invoice.tsx',
  'src/pages/sales/SalesReturns.tsx',
  'src/pages/sales/QuotationList.tsx',
  'src/pages/purchases/PurchaseList.tsx',
  'src/pages/finance/ExpenseList.tsx',
  'src/pages/finance/Income.tsx',
  'src/pages/finance/AccountList.tsx',
  'src/pages/people/Customers.tsx',
  'src/pages/people/Suppliers.tsx',
  'src/pages/people/Billers.tsx',
  'src/pages/installments/InstallmentPlans.tsx',
  'src/pages/installments/CreateInstallment.tsx',
  'src/pages/installments/InstallmentDetails.tsx',
  'src/pages/users/Users.tsx',
  'src/pages/stock/ManageStocks.tsx',
  'src/pages/stock/StockAdjustment.tsx',
  'src/pages/stock/StockTransfer.tsx',
];

function hasHardcodedString(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^import\s/.test(trimmed)) return false;
  if (/^\/\/|^\/\*|^\*/.test(trimmed)) return false;
  if (/^\{\/\*/.test(trimmed)) return false;

  // JSX text content between tags: >English Text<
  if (/>([^{}<]*[A-Z][a-z]{2,}[^{}<]*)<\//.test(trimmed)) return true;

  // placeholder with English
  if (/placeholder=["']([A-Za-z][^"']{2,})["']/.test(trimmed)) return true;

  // title= with English (like tooltip titles)
  if (/title=["']([A-Z][^"']+)["']/.test(trimmed)) return true;

  // Form labels: >Label Text<span
  if (/<label[^>]*>([^{}<]*[A-Z][a-z]+[^{}<]*)</.test(trimmed)) return true;

  // Text in h1-h6, p, span, th, td, button, a, option, li, small, strong:
  if (/<(h[1-6]|p|span|label|th|td|button|a|small|strong|li|option|div)[^>]*>\s*[A-Z][a-z]/.test(trimmed)) return true;

  // Standalone text children in JSX
  if (/<(h[1-6]|p|span|label|th|td|button|a|small|strong|li|option)[^>]*>[^<]*[A-Za-z]{3,}/.test(trimmed)) return true;

  // colSpan text content
  if (/colSpan=.*>[^<]*[A-Z][a-z]{2,}/.test(trimmed)) return true;

  // Alert/error messages: strings like 'Failed to...', 'Are you sure...'
  if (/>Are you sure/.test(trimmed)) return true;
  if (/>No [a-z]+ found/.test(trimmed)) return true;
  if (/>This action cannot/.test(trimmed)) return true;
  if (/>Loading/.test(trimmed)) return true;

  return false;
}

let output = '';
for (const file of files) {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) {
    output += '\n========================================\n';
    output += 'FILE: ' + file + ' — FILE NOT FOUND\n';
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');

  output += '\n========================================\n';
  output += 'FILE: ' + file + '\n';
  output += 'TOTAL LINES: ' + lines.length + '\n';
  output += '--- First 5 lines ---\n';
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    output += (i + 1) + ': ' + lines[i] + '\n';
  }
  output += '--- Hardcoded English strings ---\n';

  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (hasHardcodedString(lines[i])) {
      output += (i + 1) + ': ' + lines[i].trim() + '\n';
      count++;
    }
  }
  if (count === 0) output += '(none found)\n';
  output += 'Hardcoded string lines: ' + count + '\n';
}

fs.writeFileSync('hardcoded-strings-report.txt', output, 'utf-8');
console.log('Report written to hardcoded-strings-report.txt');
console.log('Total files: ' + files.length);
