import { getDashboardData } from './dashboardService';
import { getCustomers } from './customerService';
import { getProducts } from './productService';
import { getInstallmentPlans } from './installmentService';
import { getExpenses, getFinanceIncomes, getBankAccounts } from './financeService';
import {
  getOutstandingBalanceReport,
  getDefaultersReport,
  getDueTodayReport,
  getUpcomingDueReport,
  getInstallmentCollectionReport,
  getInstallmentProfitLoss,
  getSalesReport,
  getProductSalesReport,
  getInventoryReport,
} from './reportService';

// ── Types ──

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  loading?: boolean;
}

interface ToolDefinition {
  name: string;
  description: string;
  keywords: string[];
  execute: () => Promise<string>;
}

// ── System prompt describing this POS System ──

const SYSTEM_PROMPT = `You are an AI assistant for Asyntex POS (Point of Sale) system. You have access to live data from the system through function calls.

This POS system manages:
- **Customers**: Customer records with name, phone, CNIC, email, address, city, misc balance
- **Products**: Product catalog with pricing, stock levels, categories, brands
- **Installment Plans**: Financing/installment-based sales with EMI, down payments, interest, guarantors
- **Sales & Invoices**: POS orders, online orders, invoices, quotations, sales returns
- **Purchases**: Purchase orders, purchase returns
- **Finance**: Expenses, incomes, bank accounts, balance sheets, trial balances, cash flow
- **Reports**: Dashboard KPIs, collection reports, outstanding balances, profit/loss, defaulters, due today, upcoming dues, product sales, inventory reports
- **HRM**: Employees, departments, attendance, leaves, payslips
- **Inventory**: Stock management, adjustments, transfers, warehouses, stores

When users ask about data/stats, you WILL receive actual data fetched from the system APIs. Analyze it and respond with helpful insights.

Keep responses concise, helpful, and formatted with bullet points or numbers when presenting data. Use currency formatting for monetary values where appropriate.`;

// ── Tool definitions for fetching data ──

function buildTools(): ToolDefinition[] {
  return [
    {
      name: 'get_dashboard',
      description: 'Get dashboard KPIs: total plans, customers, revenue, collections, overdue amounts, trends',
      keywords: ['dashboard', 'overview', 'summary', 'kpi', 'stats', 'statistics', 'how is business', 'business', 'total', 'overall'],
      execute: async () => {
        const d = await getDashboardData();
        return JSON.stringify({
          totalPlans: d.totalPlans,
          activePlans: d.activePlans,
          completedPlans: d.completedPlans,
          totalCustomers: d.totalCustomers,
          customersThisMonth: d.customersThisMonth,
          totalFinancedAmount: d.totalFinancedAmount,
          totalCollected: d.totalCollected,
          totalOutstanding: d.totalOutstanding,
          overdueAmount: d.overdueAmount,
          overdueCount: d.overdueCount,
          dueCount: d.dueCount,
          collectionsThisMonth: d.collectionsThisMonth,
          collectionsPctChange: d.collectionsPctChange,
          statusDistribution: d.statusDistribution,
        });
      },
    },
    {
      name: 'get_customers',
      description: 'Get list of all customers with details',
      keywords: ['customer', 'customers', 'buyer', 'buyers', 'client', 'clients', 'how many customers', 'customer list'],
      execute: async () => {
        const customers = await getCustomers();
        return JSON.stringify({
          totalCustomers: customers.length,
          activeCustomers: customers.filter(c => c.status === 'active').length,
          inactiveCustomers: customers.filter(c => c.status === 'inactive').length,
          customers: customers.slice(0, 20).map(c => ({
            name: c.name, phone: c.phone, city: c.city, status: c.status, miscBalance: c.miscBalance || 0,
          })),
        });
      },
    },
    {
      name: 'get_products',
      description: 'Get product catalog with pricing and stock info',
      keywords: ['product', 'products', 'item', 'items', 'inventory', 'stock', 'catalog', 'what products', 'product list'],
      execute: async () => {
        const products = await getProducts();
        return JSON.stringify({
          totalProducts: products.length,
          products: products.slice(0, 20).map(p => ({
            name: p.productName, sku: p.sku, price: p.price, quantity: p.quantity,
            category: p.category, brand: p.brand,
          })),
        });
      },
    },
    {
      name: 'get_installment_plans',
      description: 'Get all installment/financing plans with status, EMI, customer names',
      keywords: ['installment', 'installments', 'plan', 'plans', 'emi', 'financing', 'financed', 'loan', 'loans'],
      execute: async () => {
        const plans = await getInstallmentPlans();
        return JSON.stringify({
          totalPlans: plans.length,
          active: plans.filter(p => p.status === 'active').length,
          completed: plans.filter(p => p.status === 'completed').length,
          defaulted: plans.filter(p => p.status === 'defaulted').length,
          cancelled: plans.filter(p => p.status === 'cancelled').length,
          plans: plans.slice(0, 15).map(p => ({
            id: p.id, customer: p.customerName, product: p.productName,
            financedAmount: p.financedAmount, emiAmount: p.emiAmount,
            status: p.status, paidInstallments: p.paidInstallments,
            remainingInstallments: p.remainingInstallments,
          })),
        });
      },
    },
    {
      name: 'get_outstanding',
      description: 'Get outstanding balances, overdue amounts, aging buckets',
      keywords: ['outstanding', 'overdue', 'pending', 'balance', 'aging', 'owed', 'receivable', 'unpaid'],
      execute: async () => {
        const data = await getOutstandingBalanceReport();
        return JSON.stringify({
          totalOutstanding: data.totalOutstanding,
          totalOverdue: data.totalOverdue,
          totalCustomers: data.totalCustomers,
          aging: data.aging,
          topCustomers: data.customers.slice(0, 10).map(c => ({
            name: c.customerName, phone: c.phone, remaining: c.remainingBalance,
            overdue: c.overdueAmount, daysOverdue: c.maxDaysOverdue,
          })),
        });
      },
    },
    {
      name: 'get_defaulters',
      description: 'Get list of defaulters with missed installments and overdue amounts',
      keywords: ['defaulter', 'defaulters', 'default', 'missed', 'late payment', 'delinquent'],
      execute: async () => {
        const data = await getDefaultersReport();
        return JSON.stringify({
          totalDefaulters: data.totalDefaulters,
          totalDefaultedAmount: data.totalDefaultedAmount,
          defaulters: data.defaulters.slice(0, 15).map(d => ({
            customer: d.customerName, phone: d.phone, product: d.productName,
            missed: d.missedInstallments, overdueAmount: d.overdueAmount,
            daysOverdue: d.maxDaysOverdue,
          })),
        });
      },
    },
    {
      name: 'get_due_today',
      description: 'Get installments due today',
      keywords: ['due today', 'today due', 'today\'s due', 'payments today', 'collection today'],
      execute: async () => {
        const data = await getDueTodayReport();
        return JSON.stringify({
          totalDueToday: data.totalDueToday,
          totalAmountDue: data.totalAmountDue,
          items: data.items.slice(0, 15).map(i => ({
            customer: i.customerName, phone: i.phone, product: i.productName,
            installmentNo: i.installmentNo, amount: i.amountDue, status: i.status,
          })),
        });
      },
    },
    {
      name: 'get_upcoming_dues',
      description: 'Get upcoming installment dues for next 7 days',
      keywords: ['upcoming', 'upcoming due', 'next week', 'coming due', 'future payments', 'schedule'],
      execute: async () => {
        const data = await getUpcomingDueReport(7);
        return JSON.stringify({
          totalUpcoming: data.totalUpcoming,
          totalAmountDue: data.totalAmountDue,
          items: data.items.slice(0, 15).map(i => ({
            customer: i.customerName, phone: i.phone, product: i.productName,
            installmentNo: i.installmentNo, amount: i.amountDue, dueDate: i.dueDate,
          })),
        });
      },
    },
    {
      name: 'get_collection_report',
      description: 'Get installment collection report (paid vs pending)',
      keywords: ['collection', 'collections', 'collected', 'paid', 'payment', 'recover'],
      execute: async () => {
        const data = await getInstallmentCollectionReport();
        return JSON.stringify({
          totalDue: data.totalInstallmentsDue,
          totalCollected: data.totalCollected,
          pendingCount: data.pendingCount,
          latePayments: data.latePayments,
          amountDue: data.totalAmountDue,
          amountCollected: data.totalAmountCollected,
          pendingAmount: data.pendingAmount,
        });
      },
    },
    {
      name: 'get_profit_loss',
      description: 'Get profit and loss summary from installment business',
      keywords: ['profit', 'loss', 'revenue', 'income', 'earning', 'net profit', 'gross', 'p&l'],
      execute: async () => {
        const data = await getInstallmentProfitLoss();
        return JSON.stringify({
          totalSales: data.totalSales,
          totalDownPayments: data.totalDownPayments,
          interestEarned: data.interestEarned,
          totalCollected: data.totalCollected,
          badDebts: data.badDebts,
          totalExpenses: data.totalExpenses,
          netProfit: data.netProfit,
          grossRevenue: data.grossRevenue,
        });
      },
    },
    {
      name: 'get_expenses',
      description: 'Get expense records',
      keywords: ['expense', 'expenses', 'spending', 'cost', 'costs', 'expenditure'],
      execute: async () => {
        const res = await getExpenses();
        const expenses = res.data;
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        return JSON.stringify({
          totalExpenses: expenses.length,
          totalAmount: total,
          recent: expenses.slice(0, 10).map(e => ({
            name: e.expenseName, category: e.categoryName, amount: e.amount, date: e.date,
          })),
        });
      },
    },
    {
      name: 'get_incomes',
      description: 'Get income records',
      keywords: ['income', 'incomes', 'earnings', 'revenue stream'],
      execute: async () => {
        const res = await getFinanceIncomes();
        const incomes = res.data;
        const total = incomes.reduce((sum, i) => sum + i.amount, 0);
        return JSON.stringify({
          totalIncomes: incomes.length,
          totalAmount: total,
          recent: incomes.slice(0, 10).map(i => ({
            category: i.categoryName, amount: i.amount, date: i.date, notes: i.notes,
          })),
        });
      },
    },
    {
      name: 'get_bank_accounts',
      description: 'Get bank account details and balances',
      keywords: ['bank', 'account', 'accounts', 'bank account', 'balance sheet', 'bank balance'],
      execute: async () => {
        const res = await getBankAccounts();
        const accounts = res.data;
        return JSON.stringify({
          totalAccounts: accounts.length,
          accounts: accounts.map(a => ({
            holder: a.holderName, bank: a.bankName, accountNo: a.accountNumber,
            balance: a.openingBalance, type: a.accountTypeName, status: a.status,
          })),
        });
      },
    },
    {
      name: 'get_sales_report',
      description: 'Get sales report with totals and item breakdown',
      keywords: ['sales', 'sale', 'sold', 'selling', 'sales report', 'revenue', 'how much sold'],
      execute: async () => {
        const data = await getSalesReport();
        return JSON.stringify({
          totalAmount: data.totalAmount,
          totalPaid: data.totalPaid,
          totalUnpaid: data.totalUnpaid,
          overdue: data.overdue,
          topItems: data.items.slice(0, 10).map(i => ({
            product: i.productName, brand: i.brand, category: i.category,
            soldQty: i.soldQty, soldAmount: i.soldAmount, inStock: i.inStockQty,
          })),
        });
      },
    },
    {
      name: 'get_product_sales',
      description: 'Get product-wise sales performance',
      keywords: ['product sales', 'best seller', 'top product', 'which product', 'product performance'],
      execute: async () => {
        const data = await getProductSalesReport();
        return JSON.stringify({
          totalProducts: data.totalProducts,
          totalUnitsSold: data.totalUnitsSold,
          totalRevenue: data.totalRevenue,
          products: data.products.slice(0, 10).map(p => ({
            product: p.productName, unitsSold: p.unitsSold, revenue: p.totalRevenue,
            avgPrice: p.averagePrice,
          })),
        });
      },
    },
    {
      name: 'get_inventory',
      description: 'Get inventory/stock levels for all products',
      keywords: ['inventory', 'stock level', 'warehouse', 'in stock', 'out of stock', 'stock count', 'low stock'],
      execute: async () => {
        const items = await getInventoryReport();
        return JSON.stringify({
          totalItems: items.length,
          items: items.slice(0, 20).map(i => ({
            product: i.productName, sku: i.sku, category: i.category,
            unit: i.unit, inStock: i.inStock,
          })),
        });
      },
    },
  ];
}

// ── Intent detection (keyword-based fallback) ──

function detectTools(query: string, tools: ToolDefinition[]): ToolDefinition[] {
  const q = query.toLowerCase();
  const scored = tools
    .map(tool => {
      let score = 0;
      for (const kw of tool.keywords) {
        if (q.includes(kw)) {
          score += kw.split(' ').length; // multi-word keywords score higher
        }
      }
      return { tool, score };
    })
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.slice(0, 3).map(s => s.tool);
  }

  // Broad fallback: if it sounds like a question about numbers/data
  if (/how many|how much|total|count|number of|list|show|tell me|what is|give me/i.test(q)) {
    return [tools.find(t => t.name === 'get_dashboard')!];
  }

  return [];
}

// ── OpenAI function calling definitions ──

const OPENAI_TOOLS = buildTools().map(t => ({
  type: 'function' as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: { type: 'object', properties: {}, required: [] },
  },
}));

// ── Chat with OpenAI (primary path) ──

async function chatWithOpenAI(
  messages: { role: string; content: string }[],
  tools: ToolDefinition[],
  apiKey: string,
): Promise<string> {
  const openaiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ];

  // First call: let the model decide which tools to call
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      tools: OPENAI_TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];

  if (!choice) throw new Error('No response from OpenAI');

  // If no tools called, return the text response
  if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
    return choice.message.content || 'I could not generate a response.';
  }

  // Execute the function calls
  const toolResults: { role: string; tool_call_id: string; content: string }[] = [];
  for (const call of choice.message.tool_calls) {
    const toolDef = tools.find(t => t.name === call.function.name);
    if (toolDef) {
      try {
        const result = await toolDef.execute();
        toolResults.push({
          role: 'tool',
          tool_call_id: call.id,
          content: result,
        });
      } catch (err: any) {
        toolResults.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: err.message || 'Failed to fetch data' }),
        });
      }
    }
  }

  // Second call: send the tool results back for a natural language response
  const finalRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        ...openaiMessages,
        choice.message,
        ...toolResults,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!finalRes.ok) throw new Error(`OpenAI API error: ${finalRes.status}`);

  const finalData = await finalRes.json();
  return finalData.choices?.[0]?.message?.content || 'I could not generate a response.';
}

// ── Local fallback (no API key) ──

async function chatLocally(
  query: string,
  tools: ToolDefinition[],
): Promise<string> {
  const matchedTools = detectTools(query, tools);

  if (matchedTools.length === 0) {
    return `I'm your POS assistant! I can help you with:\n\n` +
      `• **Dashboard & Stats** — business overview, KPIs\n` +
      `• **Customers** — customer list, count, details\n` +
      `• **Products** — catalog, pricing, stock levels\n` +
      `• **Installments** — plans, EMI, financing details\n` +
      `• **Outstanding & Overdue** — pending balances, aging\n` +
      `• **Defaulters** — missed payments, delinquent accounts\n` +
      `• **Due Today / Upcoming** — today's and upcoming collections\n` +
      `• **Collections** — payment collection performance\n` +
      `• **Profit & Loss** — revenue, expenses, net profit\n` +
      `• **Sales** — sales reports, product performance\n` +
      `• **Expenses & Income** — financial records\n` +
      `• **Bank Accounts** — account balances\n` +
      `• **Inventory** — stock levels, warehouse data\n\n` +
      `Try asking something like "How many customers do we have?" or "Show me today's dues"`;
  }

  const results: string[] = [];

  for (const tool of matchedTools) {
    try {
      const rawData = await tool.execute();
      const data = JSON.parse(rawData);
      results.push(formatToolResult(tool.name, data));
    } catch (err: any) {
      results.push(`⚠️ Could not fetch ${tool.description}: ${err.message}`);
    }
  }

  return results.join('\n\n---\n\n');
}

function formatToolResult(toolName: string, data: any): string {
  const fmt = (n: number) => n?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) ?? '0';
  const fmtCur = (n: number) => `$${fmt(n)}`;

  switch (toolName) {
    case 'get_dashboard':
      return `📊 **Business Dashboard**\n\n` +
        `| Metric | Value |\n|---|---|\n` +
        `| Total Plans | ${fmt(data.totalPlans)} |\n` +
        `| Active Plans | ${fmt(data.activePlans)} |\n` +
        `| Completed Plans | ${fmt(data.completedPlans)} |\n` +
        `| Total Customers | ${fmt(data.totalCustomers)} |\n` +
        `| New This Month | ${fmt(data.customersThisMonth)} |\n` +
        `| Total Financed | ${fmtCur(data.totalFinancedAmount)} |\n` +
        `| Total Collected | ${fmtCur(data.totalCollected)} |\n` +
        `| Outstanding | ${fmtCur(data.totalOutstanding)} |\n` +
        `| Overdue Amount | ${fmtCur(data.overdueAmount)} |\n` +
        `| Overdue Count | ${fmt(data.overdueCount)} |\n` +
        `| Collections This Month | ${fmtCur(data.collectionsThisMonth)} |`;

    case 'get_customers': {
      let msg = `👥 **Customers Summary**\n\n` +
        `• **Total**: ${fmt(data.totalCustomers)}\n` +
        `• **Active**: ${fmt(data.activeCustomers)}\n` +
        `• **Inactive**: ${fmt(data.inactiveCustomers)}\n`;
      if (data.customers?.length) {
        msg += `\n| Name | Phone | City | Status | Misc Balance |\n|---|---|---|---|---|\n`;
        for (const c of data.customers) {
          msg += `| ${c.name} | ${c.phone || '-'} | ${c.city || '-'} | ${c.status} | ${fmtCur(c.miscBalance)} |\n`;
        }
      }
      return msg;
    }

    case 'get_products': {
      let msg = `📦 **Products** (${fmt(data.totalProducts)} total)\n\n`;
      if (data.products?.length) {
        msg += `| Product | SKU | Price | Qty | Category |\n|---|---|---|---|---|\n`;
        for (const p of data.products) {
          msg += `| ${p.name} | ${p.sku} | ${fmtCur(p.price)} | ${fmt(p.quantity)} | ${p.category || '-'} |\n`;
        }
      }
      return msg;
    }

    case 'get_installment_plans':
      return `📋 **Installment Plans** (${fmt(data.totalPlans)} total)\n\n` +
        `• **Active**: ${fmt(data.active)}\n` +
        `• **Completed**: ${fmt(data.completed)}\n` +
        `• **Defaulted**: ${fmt(data.defaulted)}\n` +
        `• **Cancelled**: ${fmt(data.cancelled)}\n` +
        (data.plans?.length ? `\n| Customer | Product | EMI | Status | Paid/Remaining |\n|---|---|---|---|---|\n` +
          data.plans.map((p: any) => `| ${p.customer} | ${p.product} | ${fmtCur(p.emiAmount)} | ${p.status} | ${p.paidInstallments}/${p.remainingInstallments + p.paidInstallments} |`).join('\n') : '');

    case 'get_outstanding':
      return `💰 **Outstanding Balances**\n\n` +
        `• **Total Outstanding**: ${fmtCur(data.totalOutstanding)}\n` +
        `• **Total Overdue**: ${fmtCur(data.totalOverdue)}\n` +
        `• **Affected Customers**: ${fmt(data.totalCustomers)}\n\n` +
        `**Aging Buckets**:\n` +
        `• 0-30 days: ${fmtCur(data.aging?.days0To30 || 0)} (${fmt(data.aging?.count0To30 || 0)} entries)\n` +
        `• 31-60 days: ${fmtCur(data.aging?.days31To60 || 0)} (${fmt(data.aging?.count31To60 || 0)} entries)\n` +
        `• 61-90 days: ${fmtCur(data.aging?.days61To90 || 0)} (${fmt(data.aging?.count61To90 || 0)} entries)\n` +
        `• 90+ days: ${fmtCur(data.aging?.days90Plus || 0)} (${fmt(data.aging?.count90Plus || 0)} entries)`;

    case 'get_defaulters':
      return `⚠️ **Defaulters Report**\n\n` +
        `• **Total Defaulters**: ${fmt(data.totalDefaulters)}\n` +
        `• **Total Defaulted Amount**: ${fmtCur(data.totalDefaultedAmount)}\n` +
        (data.defaulters?.length ? `\n| Customer | Phone | Product | Missed | Overdue | Days |\n|---|---|---|---|---|---|\n` +
          data.defaulters.map((d: any) => `| ${d.customer} | ${d.phone || '-'} | ${d.product} | ${d.missed} | ${fmtCur(d.overdueAmount)} | ${d.daysOverdue} |`).join('\n') : '');

    case 'get_due_today':
      return `📅 **Due Today**\n\n` +
        `• **Total Due**: ${fmt(data.totalDueToday)}\n` +
        `• **Total Amount**: ${fmtCur(data.totalAmountDue)}\n` +
        (data.items?.length ? `\n| Customer | Product | Inst# | Amount | Status |\n|---|---|---|---|---|\n` +
          data.items.map((i: any) => `| ${i.customer} | ${i.product} | #${i.installmentNo} | ${fmtCur(i.amount)} | ${i.status} |`).join('\n') : '\nNo dues today! 🎉');

    case 'get_upcoming_dues':
      return `📆 **Upcoming Dues (Next 7 Days)**\n\n` +
        `• **Total Upcoming**: ${fmt(data.totalUpcoming)}\n` +
        `• **Total Amount**: ${fmtCur(data.totalAmountDue)}\n` +
        (data.items?.length ? `\n| Customer | Product | Due Date | Amount |\n|---|---|---|---|\n` +
          data.items.map((i: any) => `| ${i.customer} | ${i.product} | ${i.dueDate} | ${fmtCur(i.amount)} |`).join('\n') : '');

    case 'get_collection_report':
      return `💵 **Collection Report**\n\n` +
        `| Metric | Value |\n|---|---|\n` +
        `| Installments Due | ${fmt(data.totalDue)} |\n` +
        `| Collected | ${fmt(data.totalCollected)} |\n` +
        `| Pending | ${fmt(data.pendingCount)} |\n` +
        `| Late Payments | ${fmt(data.latePayments)} |\n` +
        `| Amount Due | ${fmtCur(data.amountDue)} |\n` +
        `| Collected Amount | ${fmtCur(data.amountCollected)} |\n` +
        `| Pending Amount | ${fmtCur(data.pendingAmount)} |`;

    case 'get_profit_loss':
      return `📈 **Profit & Loss**\n\n` +
        `| Metric | Amount |\n|---|---|\n` +
        `| Gross Revenue | ${fmtCur(data.grossRevenue)} |\n` +
        `| Total Sales | ${fmtCur(data.totalSales)} |\n` +
        `| Down Payments | ${fmtCur(data.totalDownPayments)} |\n` +
        `| Interest Earned | ${fmtCur(data.interestEarned)} |\n` +
        `| Total Collected | ${fmtCur(data.totalCollected)} |\n` +
        `| Expenses | ${fmtCur(data.totalExpenses)} |\n` +
        `| Bad Debts | ${fmtCur(data.badDebts)} |\n` +
        `| **Net Profit** | **${fmtCur(data.netProfit)}** |`;

    case 'get_expenses': {
      let msg = `💸 **Expenses** (${fmt(data.totalExpenses)} records, Total: ${fmtCur(data.totalAmount)})\n\n`;
      if (data.recent?.length) {
        msg += `| Name | Category | Amount | Date |\n|---|---|---|---|\n`;
        for (const e of data.recent) {
          msg += `| ${e.name} | ${e.category} | ${fmtCur(e.amount)} | ${e.date} |\n`;
        }
      }
      return msg;
    }

    case 'get_incomes': {
      let msg = `💰 **Incomes** (${fmt(data.totalIncomes)} records, Total: ${fmtCur(data.totalAmount)})\n\n`;
      if (data.recent?.length) {
        msg += `| Category | Amount | Date | Notes |\n|---|---|---|---|\n`;
        for (const i of data.recent) {
          msg += `| ${i.category} | ${fmtCur(i.amount)} | ${i.date} | ${i.notes || '-'} |\n`;
        }
      }
      return msg;
    }

    case 'get_bank_accounts': {
      let msg = `🏦 **Bank Accounts** (${fmt(data.totalAccounts)} accounts)\n\n`;
      if (data.accounts?.length) {
        msg += `| Holder | Bank | Account# | Balance | Status |\n|---|---|---|---|---|\n`;
        for (const a of data.accounts) {
          msg += `| ${a.holder} | ${a.bank} | ${a.accountNo} | ${fmtCur(a.balance)} | ${a.status} |\n`;
        }
      }
      return msg;
    }

    case 'get_sales_report':
      return `🛒 **Sales Report**\n\n` +
        `• **Total Sales**: ${fmtCur(data.totalAmount)}\n` +
        `• **Paid**: ${fmtCur(data.totalPaid)}\n` +
        `• **Unpaid**: ${fmtCur(data.totalUnpaid)}\n` +
        `• **Overdue**: ${fmtCur(data.overdue)}\n` +
        (data.topItems?.length ? `\n| Product | Sold Qty | Amount | In Stock |\n|---|---|---|---|\n` +
          data.topItems.map((i: any) => `| ${i.product} | ${i.soldQty} | ${fmtCur(i.soldAmount)} | ${i.inStock} |`).join('\n') : '');

    case 'get_product_sales':
      return `📊 **Product Sales Performance**\n\n` +
        `• **Products Sold**: ${fmt(data.totalProducts)}\n` +
        `• **Total Units Sold**: ${fmt(data.totalUnitsSold)}\n` +
        `• **Total Revenue**: ${fmtCur(data.totalRevenue)}\n` +
        (data.products?.length ? `\n| Product | Units Sold | Revenue | Avg Price |\n|---|---|---|---|\n` +
          data.products.map((p: any) => `| ${p.product} | ${p.unitsSold} | ${fmtCur(p.revenue)} | ${fmtCur(p.avgPrice)} |`).join('\n') : '');

    case 'get_inventory': {
      let msg = `📦 **Inventory Levels** (${fmt(data.totalItems)} items)\n\n`;
      if (data.items?.length) {
        msg += `| Product | SKU | Category | In Stock |\n|---|---|---|---|\n`;
        for (const i of data.items) {
          msg += `| ${i.product} | ${i.sku} | ${i.category || '-'} | ${fmt(i.inStock)} |\n`;
        }
      }
      return msg;
    }

    default:
      return `Data: ${JSON.stringify(data, null, 2)}`;
  }
}

// ── Main chat function ──

export async function sendBotMessage(
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
): Promise<string> {
  const tools = buildTools();
  const apiKey = localStorage.getItem('openai_api_key') || import.meta.env.VITE_OPENAI_API_KEY || '';

  const messages = [
    ...conversationHistory.slice(-10), // keep last 10 messages for context
    { role: 'user', content: userMessage },
  ];

  if (apiKey) {
    try {
      return await chatWithOpenAI(messages, tools, apiKey);
    } catch (err: any) {
      console.warn('OpenAI call failed, falling back to local mode:', err.message);
      // Fall through to local mode
    }
  }

  // Local keyword-based mode
  return chatLocally(userMessage, tools);
}

// ── Quick actions for common queries ──

export const QUICK_ACTIONS = [
  { label: 'Dashboard Stats', query: 'Show me the dashboard overview and business stats' },
  { label: 'Due Today', query: 'What installments are due today?' },
  { label: 'Defaulters', query: 'Show me the list of defaulters' },
  { label: 'Profit & Loss', query: 'Show me the profit and loss summary' },
  { label: 'Outstanding', query: 'What is the total outstanding balance?' },
  { label: 'Customers', query: 'How many customers do we have?' },
];
