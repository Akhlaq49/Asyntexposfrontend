import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import DashboardRedirect from './components/SECU/DashboardRedirect'

// Dashboard
const AdminDashboard = lazy(() => import('./pages/RPRT/AdminDashboard'))
const UserDashboard = lazy(() => import('./pages/RPRT/UserDashboard'))

// Super Admin
const PurchaseTransaction = lazy(() => import('./pages/PRCH/PurchaseTransaction'))

// Inventory
const ProductList = lazy(() => import('./pages/INVT/ProductList'))
const AddProduct = lazy(() => import('./pages/INVT/AddProduct'))
const EditProduct = lazy(() => import('./pages/INVT/EditProduct'))
const ProductDetails = lazy(() => import('./pages/INVT/ProductDetails'))
const CategoryList = lazy(() => import('./pages/INVT/CategoryList'))
const BrandList = lazy(() => import('./pages/INVT/BrandList'))
const Units = lazy(() => import('./pages/INVT/Units'))
const TaxTypes = lazy(() => import('./pages/FINC/TaxTypes'))
const SolutionPackages = lazy(() => import('./pages/CATL/SolutionPackages'))
const PurchasePrices = lazy(() => import('./pages/INVT/PurchasePrices'))
const DrawingSolution = lazy(() => import('./pages/CATL/DrawingSolution'))
const Warranty = lazy(() => import('./pages/INVT/Warranty'))


// Stock
const StockHistory = lazy(() => import('./pages/INVT/StockHistory'))
const SoldStock = lazy(() => import('./pages/INVT/SoldStock'))

// Sales
const POSOrders = lazy(() => import('./pages/SALE/POSOrders'))
const SalesReturns = lazy(() => import('./pages/SALE/SalesReturns'))
const QuotationList = lazy(() => import('./pages/SALE/QuotationList'))
const StaffApprovals = lazy(() => import('./pages/SALE/StaffApprovals'))
const POS = lazy(() => import('./pages/SALE/POS'))


// Purchases
const PurchaseList = lazy(() => import('./pages/PRCH/PurchaseList'))
const PurchaseOrders = lazy(() => import('./pages/PRCH/PurchaseOrders'))
const PurchaseReturns = lazy(() => import('./pages/PRCH/PurchaseReturns'))

// Finance
const ExpenseList = lazy(() => import('./pages/FINC/ExpenseList'))
const Transactions = lazy(() => import('./pages/FINC/Transactions'))
const BalanceSheet = lazy(() => import('./pages/FINC/BalanceSheet'))
const CapitalLoans = lazy(() => import('./pages/FINC/CapitalLoans'))
// Accounting (double-entry ledger)
const ChartOfAccounts = lazy(() => import('./pages/ACCT/ChartOfAccounts'))
const Journal = lazy(() => import('./pages/ACCT/Journal'))
const JournalVouchers = lazy(() => import('./pages/ACCT/JournalVouchers'))
const AccountLedger = lazy(() => import('./pages/ACCT/AccountLedger'))
const LedgerTrialBalance = lazy(() => import('./pages/ACCT/LedgerTrialBalance'))
const LedgerProfitLoss = lazy(() => import('./pages/ACCT/LedgerProfitLoss'))
const LedgerBalanceSheet = lazy(() => import('./pages/ACCT/LedgerBalanceSheet'))
const AccountingSettings = lazy(() => import('./pages/ACCT/AccountingSettings'))
const Letterhead = lazy(() => import('./pages/SYST/Letterhead'))
const ExpenseCategory = lazy(() => import('./pages/FINC/ExpenseCategory'))

// People
const Customers = lazy(() => import('./pages/PRTY/Customers'))
const Suppliers = lazy(() => import('./pages/PRTY/Suppliers'))


// Reports
const SalesReport = lazy(() => import('./pages/RPRT/SalesReport'))
const BestSeller = lazy(() => import('./pages/RPRT/BestSeller'))
const PurchaseReport = lazy(() => import('./pages/RPRT/PurchaseReport'))
const InventoryReport = lazy(() => import('./pages/RPRT/InventoryReport'))
const SupplierReport = lazy(() => import('./pages/RPRT/SupplierReport'))
const SupplierDueReport = lazy(() => import('./pages/RPRT/SupplierDueReport'))
const CustomerReport = lazy(() => import('./pages/RPRT/CustomerReport'))
const CustomerDueReport = lazy(() => import('./pages/RPRT/CustomerDueReport'))
const ProductReport = lazy(() => import('./pages/RPRT/ProductReport'))
const ExpenseReport = lazy(() => import('./pages/RPRT/ExpenseReport'))
const TaxReports = lazy(() => import('./pages/RPRT/TaxReports'))
const ProfitAndLoss = lazy(() => import('./pages/RPRT/ProfitAndLoss'))
const AnnualReport = lazy(() => import('./pages/RPRT/AnnualReport'))


// CMS

// User Management
const Users = lazy(() => import('./pages/SECU/Users'))
const RolesPermissions = lazy(() => import('./pages/SECU/RolesPermissions'))
const TenantMenuConfig = lazy(() => import('./pages/SYST/TenantMenuConfig'))

// Settings
const GeneralSettings = lazy(() => import('./pages/SYST/GeneralSettings'))
const FieldVisibilitySettings = lazy(() => import('./pages/SYST/FieldVisibilitySettings'))
const WhatsAppSettings = lazy(() => import('./pages/MESG/WhatsAppSettings'))

// Auth
const SignIn = lazy(() => import('./pages/SECU/SignIn'))
const SignIn2 = lazy(() => import('./pages/SECU/SignIn2'))
const SignIn3 = lazy(() => import('./pages/SECU/SignIn3'))
const Register = lazy(() => import('./pages/SECU/Register'))
const Register2 = lazy(() => import('./pages/SECU/Register2'))
const Register3 = lazy(() => import('./pages/SECU/Register3'))
const ForgotPassword = lazy(() => import('./pages/SECU/ForgotPassword'))
const ForgotPassword2 = lazy(() => import('./pages/SECU/ForgotPassword2'))
const ForgotPassword3 = lazy(() => import('./pages/SECU/ForgotPassword3'))
const ResetPassword = lazy(() => import('./pages/SECU/ResetPassword'))
const ResetPassword2 = lazy(() => import('./pages/SECU/ResetPassword2'))
const ResetPassword3 = lazy(() => import('./pages/SECU/ResetPassword3'))
const EmailVerification = lazy(() => import('./pages/SECU/EmailVerification'))
const EmailVerification2 = lazy(() => import('./pages/SECU/EmailVerification2'))
const EmailVerification3 = lazy(() => import('./pages/SECU/EmailVerification3'))
const TwoStepVerification = lazy(() => import('./pages/SECU/TwoStepVerification'))
const TwoStepVerification2 = lazy(() => import('./pages/SECU/TwoStepVerification2'))
const TwoStepVerification3 = lazy(() => import('./pages/SECU/TwoStepVerification3'))
const LockScreen = lazy(() => import('./pages/SECU/LockScreen'))

// Application
const Chat = lazy(() => import('./pages/SYST/Chat'))
const EmailApp = lazy(() => import('./pages/SYST/Email'))

// Ecommerce

// Misc Pages
const Error404 = lazy(() => import('./pages/SYST/Error404'))
const Error500 = lazy(() => import('./pages/SYST/Error500'))
const ComingSoon = lazy(() => import('./pages/SYST/ComingSoon'))
const UnderMaintenance = lazy(() => import('./pages/SYST/UnderMaintenance'))
const Activities = lazy(() => import('./pages/SYST/Activities'))

// UI Elements

const Loading = () => (
  <div id="global-loader">
    <div className="whirly-loader"></div>
  </div>
)

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardRedirect />} />
          
          {/* Dashboard */}
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          {/* Admin Dashboard 2 was removed - keep old links / saved defaults working */}
          <Route path="/user-dashboard" element={<UserDashboard />} />

          {/* Super Admin */}
          <Route path="/purchase-transaction" element={<PurchaseTransaction />} />

          {/* Inventory */}
          <Route path="/product-list" element={<ProductList />} />
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/edit-product/:id" element={<EditProduct />} />
          <Route path="/product-details" element={<ProductDetails />} />
          <Route path="/category-list" element={<CategoryList />} />
          <Route path="/brand-list" element={<BrandList />} />
          <Route path="/units" element={<Units />} />
          <Route path="/tax-types" element={<TaxTypes />} />
          <Route path="/solution-packages" element={<SolutionPackages />} />
          <Route path="/purchase-prices" element={<PurchasePrices />} />
          <Route path="/warranty" element={<Warranty />} />

          {/* Stock */}
          <Route path="/stock-history" element={<StockHistory />} />
          <Route path="/sold-stock" element={<SoldStock />} />


          {/* Sales */}
          <Route path="/pos-orders" element={<POSOrders />} />
          <Route path="/sales-returns" element={<SalesReturns />} />
          <Route path="/quotation-list" element={<QuotationList />} />
          <Route path="/staff-approvals" element={<StaffApprovals />} />
          <Route path="/drawing-solution" element={<DrawingSolution />} />
          <Route path="/pos" element={<POS />} />


          {/* Purchases */}
          <Route path="/purchase-list" element={<PurchaseList />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/purchase-returns" element={<PurchaseReturns />} />

          {/* Finance */}
          <Route path="/expense-list" element={<ExpenseList />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/balance-sheet" element={<BalanceSheet />} />
          <Route path="/capital-loans" element={<CapitalLoans />} />
          <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/journal-vouchers" element={<JournalVouchers />} />
          <Route path="/account-ledger/:id" element={<AccountLedger />} />
          <Route path="/ledger-trial-balance" element={<LedgerTrialBalance />} />
          <Route path="/ledger-profit-loss" element={<LedgerProfitLoss />} />
          <Route path="/ledger-balance-sheet" element={<LedgerBalanceSheet />} />
          <Route path="/accounting-settings" element={<AccountingSettings />} />
          <Route path="/letterhead" element={<Letterhead />} />
          <Route path="/expense-category" element={<ExpenseCategory />} />

          {/* People */}
          <Route path="/customers" element={<Customers />} />
          <Route path="/suppliers" element={<Suppliers />} />


          {/* Reports */}
          <Route path="/sales-report" element={<SalesReport />} />
          <Route path="/best-seller" element={<BestSeller />} />
          <Route path="/purchase-report" element={<PurchaseReport />} />
          <Route path="/inventory-report" element={<InventoryReport />} />
          <Route path="/supplier-report" element={<SupplierReport />} />
          <Route path="/supplier-due-report" element={<SupplierDueReport />} />
          <Route path="/customer-report" element={<CustomerReport />} />
          <Route path="/customer-due-report" element={<CustomerDueReport />} />
          <Route path="/product-report" element={<ProductReport />} />
          <Route path="/expense-report" element={<ExpenseReport />} />
          <Route path="/tax-reports" element={<TaxReports />} />
          <Route path="/profit-and-loss" element={<ProfitAndLoss />} />
          <Route path="/annual-report" element={<AnnualReport />} />


          {/* CMS */}

          {/* User Management */}
          <Route path="/users" element={<Users />} />
          <Route path="/roles-permissions" element={<RolesPermissions />} />
          <Route path="/tenant-menu-config" element={<TenantMenuConfig />} />

          {/* Settings */}
          <Route path="/general-settings" element={<GeneralSettings />} />
          <Route path="/field-visibility" element={<FieldVisibilitySettings />} />
          <Route path="/whatsapp-settings" element={<WhatsAppSettings />} />

          {/* Auth */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signin-2" element={<SignIn2 />} />
          <Route path="/signin-3" element={<SignIn3 />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register-2" element={<Register2 />} />
          <Route path="/register-3" element={<Register3 />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/forgot-password-2" element={<ForgotPassword2 />} />
          <Route path="/forgot-password-3" element={<ForgotPassword3 />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password-2" element={<ResetPassword2 />} />
          <Route path="/reset-password-3" element={<ResetPassword3 />} />
          <Route path="/email-verification" element={<EmailVerification />} />
          <Route path="/email-verification-2" element={<EmailVerification2 />} />
          <Route path="/email-verification-3" element={<EmailVerification3 />} />
          <Route path="/two-step-verification" element={<TwoStepVerification />} />
          <Route path="/two-step-verification-2" element={<TwoStepVerification2 />} />
          <Route path="/two-step-verification-3" element={<TwoStepVerification3 />} />
          <Route path="/lock-screen" element={<LockScreen />} />

          {/* Application */}
          <Route path="/chat" element={<Chat />} />
          <Route path="/email" element={<EmailApp />} />

          {/* Ecommerce */}

          {/* Misc Pages */}
          <Route path="/error-404" element={<Error404 />} />
          <Route path="/error-500" element={<Error500 />} />
          <Route path="/coming-soon" element={<ComingSoon />} />
          <Route path="/under-maintenance" element={<UnderMaintenance />} />
          <Route path="/activities" element={<Activities />} />

          {/* UI Elements */}

          {/* Charts */}

          {/* Icons */}

          {/* Forms */}

          {/* Tables & Maps */}

          {/* Layout demo routes */}

          {/* 404 Catch-all */}
          <Route path="*" element={<Error404 />} />
        </Routes>
      </Layout>
    </Suspense>
  )
}

export default App