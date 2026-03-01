import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'

// Dashboard
const Dashboard = lazy(() => import('./pages/Dashboard'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const SalesDashboard = lazy(() => import('./pages/misc/SalesDashboard'))

// Super Admin
const Companies = lazy(() => import('./pages/misc/Companies'))
const Subscription = lazy(() => import('./pages/misc/Subscription'))
const Packages = lazy(() => import('./pages/misc/Packages'))
const Domain = lazy(() => import('./pages/misc/Domain'))
const PurchaseTransaction = lazy(() => import('./pages/purchases/PurchaseTransaction'))

// Inventory
const ProductList = lazy(() => import('./pages/inventory/ProductList'))
const AddProduct = lazy(() => import('./pages/inventory/AddProduct'))
const EditProduct = lazy(() => import('./pages/inventory/EditProduct'))
const ProductDetails = lazy(() => import('./pages/inventory/ProductDetails'))
const ExpiredProducts = lazy(() => import('./pages/inventory/ExpiredProducts'))
const LowStocks = lazy(() => import('./pages/inventory/LowStocks'))
const CategoryList = lazy(() => import('./pages/inventory/CategoryList'))
const SubCategories = lazy(() => import('./pages/inventory/SubCategories'))
const BrandList = lazy(() => import('./pages/inventory/BrandList'))
const Units = lazy(() => import('./pages/inventory/Units'))
const VariantAttributes = lazy(() => import('./pages/inventory/VariantAttributes'))
const Warranty = lazy(() => import('./pages/inventory/Warranty'))
const Barcode = lazy(() => import('./pages/inventory/Barcode'))
const QRCode = lazy(() => import('./pages/inventory/QRCode'))

// Installments
const InstallmentPlans = lazy(() => import('./pages/installments/InstallmentPlans'))
const CreateInstallment = lazy(() => import('./pages/installments/CreateInstallment'))
const InstallmentDetails = lazy(() => import('./pages/installments/InstallmentDetails'))

// Stock
const ManageStocks = lazy(() => import('./pages/stock/ManageStocks'))
const StockAdjustment = lazy(() => import('./pages/stock/StockAdjustment'))
const StockTransfer = lazy(() => import('./pages/stock/StockTransfer'))
const StockHistory = lazy(() => import('./pages/stock/StockHistory'))
const SoldStock = lazy(() => import('./pages/stock/SoldStock'))

// Sales
const OnlineOrders = lazy(() => import('./pages/sales/OnlineOrders'))
const POSOrders = lazy(() => import('./pages/sales/POSOrders'))
const Invoice = lazy(() => import('./pages/sales/Invoice'))
const InvoiceDetails = lazy(() => import('./pages/sales/InvoiceDetails'))
const SalesReturns = lazy(() => import('./pages/sales/SalesReturns'))
const QuotationList = lazy(() => import('./pages/sales/QuotationList'))
const POS = lazy(() => import('./pages/sales/POS'))

// Promo
const Coupons = lazy(() => import('./pages/promo/Coupons'))
const GiftCards = lazy(() => import('./pages/promo/GiftCards'))
const DiscountPlan = lazy(() => import('./pages/promo/DiscountPlan'))
const Discount = lazy(() => import('./pages/promo/Discount'))

// Purchases
const PurchaseList = lazy(() => import('./pages/purchases/PurchaseList'))
const PurchaseOrderReport = lazy(() => import('./pages/purchases/PurchaseOrderReport'))
const PurchaseReturns = lazy(() => import('./pages/purchases/PurchaseReturns'))

// Finance
const ExpenseList = lazy(() => import('./pages/finance/ExpenseList'))
const ExpenseCategory = lazy(() => import('./pages/finance/ExpenseCategory'))
const FinanceIncome = lazy(() => import('./pages/finance/Income'))
const IncomeCategory = lazy(() => import('./pages/finance/IncomeCategory'))
const AccountList = lazy(() => import('./pages/finance/AccountList'))
const MoneyTransfer = lazy(() => import('./pages/finance/MoneyTransfer'))
const BalanceSheet = lazy(() => import('./pages/finance/BalanceSheet'))
const TrialBalance = lazy(() => import('./pages/finance/TrialBalance'))
const CashFlow = lazy(() => import('./pages/finance/CashFlow'))
const AccountStatement = lazy(() => import('./pages/finance/AccountStatement'))

// People
const Customers = lazy(() => import('./pages/people/Customers'))
const Billers = lazy(() => import('./pages/people/Billers'))
const Suppliers = lazy(() => import('./pages/people/Suppliers'))
const StoreList = lazy(() => import('./pages/people/StoreList'))
const WarehousePage = lazy(() => import('./pages/people/Warehouse'))

// HRM
const EmployeesGrid = lazy(() => import('./pages/hrm/EmployeesGrid'))
const EmployeesList = lazy(() => import('./pages/hrm/EmployeesList'))
const AddEmployee = lazy(() => import('./pages/hrm/AddEmployee'))
const EditEmployee = lazy(() => import('./pages/hrm/EditEmployee'))
const EmployeeDetails = lazy(() => import('./pages/hrm/EmployeeDetails'))
const EmployeeSalary = lazy(() => import('./pages/hrm/EmployeeSalary'))
const DepartmentGrid = lazy(() => import('./pages/hrm/DepartmentGrid'))
const DepartmentList = lazy(() => import('./pages/hrm/DepartmentList'))
const Designation = lazy(() => import('./pages/hrm/Designation'))
const Shift = lazy(() => import('./pages/hrm/Shift'))
const AttendanceEmployee = lazy(() => import('./pages/hrm/AttendanceEmployee'))
const AttendanceAdmin = lazy(() => import('./pages/hrm/AttendanceAdmin'))
const LeavesAdmin = lazy(() => import('./pages/hrm/LeavesAdmin'))
const LeavesEmployee = lazy(() => import('./pages/hrm/LeavesEmployee'))
const LeaveTypes = lazy(() => import('./pages/hrm/LeaveTypes'))
const HolidaysPage = lazy(() => import('./pages/hrm/Holidays'))
const Payslip = lazy(() => import('./pages/hrm/Payslip'))

// Reports
const SalesReport = lazy(() => import('./pages/reports/SalesReport'))
const BestSeller = lazy(() => import('./pages/reports/BestSeller'))
const PurchaseReport = lazy(() => import('./pages/reports/PurchaseReport'))
const InventoryReport = lazy(() => import('./pages/reports/InventoryReport'))
const InvoiceReport = lazy(() => import('./pages/reports/InvoiceReport'))
const SupplierReport = lazy(() => import('./pages/reports/SupplierReport'))
const SupplierDueReport = lazy(() => import('./pages/reports/SupplierDueReport'))
const CustomerReport = lazy(() => import('./pages/reports/CustomerReport'))
const CustomerDueReport = lazy(() => import('./pages/reports/CustomerDueReport'))
const ProductReport = lazy(() => import('./pages/reports/ProductReport'))
const ProductExpiryReport = lazy(() => import('./pages/reports/ProductExpiryReport'))
const ProductQuantityAlert = lazy(() => import('./pages/reports/ProductQuantityAlert'))
const ExpenseReport = lazy(() => import('./pages/reports/ExpenseReport'))
const IncomeReport = lazy(() => import('./pages/reports/IncomeReport'))
const TaxReports = lazy(() => import('./pages/reports/TaxReports'))
const ProfitAndLoss = lazy(() => import('./pages/reports/ProfitAndLoss'))
const AnnualReport = lazy(() => import('./pages/reports/AnnualReport'))

// Installment Reports
const InstallmentCollectionReport = lazy(() => import('./pages/reports/InstallmentCollectionReport'))
const OutstandingBalanceReport = lazy(() => import('./pages/reports/OutstandingBalanceReport'))
const DailyCashFlowReport = lazy(() => import('./pages/reports/DailyCashFlowReport'))
const InstallmentProfitLossReport = lazy(() => import('./pages/reports/InstallmentProfitLossReport'))
const CustomerLedgerReport = lazy(() => import('./pages/reports/CustomerLedgerReport'))
const DefaultersReport = lazy(() => import('./pages/reports/DefaultersReport'))
const PaymentHistoryReport = lazy(() => import('./pages/reports/PaymentHistoryReport'))
const InstallmentSalesSummaryReport = lazy(() => import('./pages/reports/InstallmentSalesSummaryReport'))
const InstProductSalesReport = lazy(() => import('./pages/reports/InstProductSalesReport'))
const DefaultRateReport = lazy(() => import('./pages/reports/DefaultRateReport'))
const RecoveryPerformanceReport = lazy(() => import('./pages/reports/RecoveryPerformanceReport'))
const DueTodayReport = lazy(() => import('./pages/reports/DueTodayReport'))
const UpcomingDueReport = lazy(() => import('./pages/reports/UpcomingDueReport'))
const LateFeeReport = lazy(() => import('./pages/reports/LateFeeReport'))
const ProductProfitReport = lazy(() => import('./pages/reports/ProductProfitReport'))

// CMS
const CmsPages = lazy(() => import('./pages/cms/Pages'))
const AllBlog = lazy(() => import('./pages/cms/AllBlog'))
const BlogTag = lazy(() => import('./pages/cms/BlogTag'))
const BlogCategories = lazy(() => import('./pages/cms/BlogCategories'))
const BlogComments = lazy(() => import('./pages/cms/BlogComments'))
const BlogDetails = lazy(() => import('./pages/cms/BlogDetails'))
const CountriesPage = lazy(() => import('./pages/cms/Countries'))
const StatesPage = lazy(() => import('./pages/cms/States'))
const CitiesPage = lazy(() => import('./pages/cms/Cities'))
const Testimonials = lazy(() => import('./pages/cms/Testimonials'))
const FAQ = lazy(() => import('./pages/cms/FAQ'))

// User Management
const Users = lazy(() => import('./pages/users/Users'))
const RolesPermissions = lazy(() => import('./pages/users/RolesPermissions'))
const Permissions = lazy(() => import('./pages/users/Permissions'))
const DeleteAccount = lazy(() => import('./pages/users/DeleteAccount'))

// Settings
const GeneralSettings = lazy(() => import('./pages/settings/GeneralSettings'))
const SecuritySettings = lazy(() => import('./pages/settings/SecuritySettings'))
const Notification = lazy(() => import('./pages/settings/Notification'))
const ConnectedApps = lazy(() => import('./pages/settings/ConnectedApps'))
const SystemSettings = lazy(() => import('./pages/settings/SystemSettings'))
const CompanySettings = lazy(() => import('./pages/settings/CompanySettings'))
const LocalizationSettings = lazy(() => import('./pages/settings/LocalizationSettings'))
const Prefixes = lazy(() => import('./pages/settings/Prefixes'))
const PreferenceSetting = lazy(() => import('./pages/settings/Preference'))
const Appearance = lazy(() => import('./pages/settings/Appearance'))
const SocialAuthentication = lazy(() => import('./pages/settings/SocialAuthentication'))
const LanguageSettings = lazy(() => import('./pages/settings/LanguageSettings'))
const InvoiceSettings = lazy(() => import('./pages/settings/InvoiceSettings'))
const InvoiceTemplates = lazy(() => import('./pages/settings/InvoiceTemplates'))
const PrinterSettings = lazy(() => import('./pages/settings/PrinterSettings'))
const POSSettings = lazy(() => import('./pages/settings/POSSettings'))
const CustomFields = lazy(() => import('./pages/settings/CustomFields'))
const FieldVisibilitySettings = lazy(() => import('./pages/settings/FieldVisibilitySettings'))
const EmailSettings = lazy(() => import('./pages/settings/EmailSettings'))
const EmailTemplates = lazy(() => import('./pages/settings/EmailTemplates'))
const SMSSettings = lazy(() => import('./pages/settings/SMSSettings'))
const SMSTemplates = lazy(() => import('./pages/settings/SMSTemplates'))
const OTPSettings = lazy(() => import('./pages/settings/OTPSettings'))
const GDPRSettings = lazy(() => import('./pages/settings/GDPRSettings'))
const PaymentGatewaySettings = lazy(() => import('./pages/settings/PaymentGatewaySettings'))
const BankSettingsGrid = lazy(() => import('./pages/settings/BankSettingsGrid'))
const TaxRates = lazy(() => import('./pages/settings/TaxRates'))
const CurrencySettings = lazy(() => import('./pages/settings/CurrencySettings'))
const StorageSettings = lazy(() => import('./pages/settings/StorageSettings'))
const BanIPAddress = lazy(() => import('./pages/settings/BanIPAddress'))
const WhatsAppSettings = lazy(() => import('./pages/settings/WhatsAppSettings'))

// Auth
const SignIn = lazy(() => import('./pages/auth/SignIn'))
const SignIn2 = lazy(() => import('./pages/auth/SignIn2'))
const SignIn3 = lazy(() => import('./pages/auth/SignIn3'))
const Register = lazy(() => import('./pages/auth/Register'))
const Register2 = lazy(() => import('./pages/auth/Register2'))
const Register3 = lazy(() => import('./pages/auth/Register3'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ForgotPassword2 = lazy(() => import('./pages/auth/ForgotPassword2'))
const ForgotPassword3 = lazy(() => import('./pages/auth/ForgotPassword3'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const ResetPassword2 = lazy(() => import('./pages/auth/ResetPassword2'))
const ResetPassword3 = lazy(() => import('./pages/auth/ResetPassword3'))
const EmailVerification = lazy(() => import('./pages/auth/EmailVerification'))
const EmailVerification2 = lazy(() => import('./pages/auth/EmailVerification2'))
const EmailVerification3 = lazy(() => import('./pages/auth/EmailVerification3'))
const TwoStepVerification = lazy(() => import('./pages/auth/TwoStepVerification'))
const TwoStepVerification2 = lazy(() => import('./pages/auth/TwoStepVerification2'))
const TwoStepVerification3 = lazy(() => import('./pages/auth/TwoStepVerification3'))
const LockScreen = lazy(() => import('./pages/auth/LockScreen'))

// Application
const Chat = lazy(() => import('./pages/application/Chat'))
const VideoCall = lazy(() => import('./pages/application/VideoCall'))
const AudioCall = lazy(() => import('./pages/application/AudioCall'))
const CallHistory = lazy(() => import('./pages/application/CallHistory'))
const CalendarPage = lazy(() => import('./pages/application/Calendar'))
const Contacts = lazy(() => import('./pages/application/Contacts'))
const EmailApp = lazy(() => import('./pages/application/Email'))
const EmailReply = lazy(() => import('./pages/application/EmailReply'))
const TodoList = lazy(() => import('./pages/application/TodoList'))
const TodoPage = lazy(() => import('./pages/application/Todo'))
const Notes = lazy(() => import('./pages/application/Notes'))
const FileManager = lazy(() => import('./pages/application/FileManager'))
const ProjectsPage = lazy(() => import('./pages/application/Projects'))
const SocialFeed = lazy(() => import('./pages/application/SocialFeed'))
const SearchList = lazy(() => import('./pages/application/SearchList'))

// Ecommerce
const EcomProducts = lazy(() => import('./pages/ecommerce/Products'))
const EcomProductDetails = lazy(() => import('./pages/ecommerce/ProductDetails'))
const CartPage = lazy(() => import('./pages/ecommerce/Cart'))
const CheckoutPage = lazy(() => import('./pages/ecommerce/Checkout'))
const WishlistPage = lazy(() => import('./pages/ecommerce/Wishlist'))
const ReviewsPage = lazy(() => import('./pages/ecommerce/Reviews'))

// Misc Pages
const Profile = lazy(() => import('./pages/misc/Profile'))
const Error404 = lazy(() => import('./pages/misc/Error404'))
const Error500 = lazy(() => import('./pages/misc/Error500'))
const BlankPage = lazy(() => import('./pages/misc/BlankPage'))
const PricingPage = lazy(() => import('./pages/misc/Pricing'))
const ComingSoon = lazy(() => import('./pages/misc/ComingSoon'))
const UnderMaintenance = lazy(() => import('./pages/misc/UnderMaintenance'))
const Activities = lazy(() => import('./pages/misc/Activities'))

// UI Elements
const UIAlerts = lazy(() => import('./pages/elements/UIAlerts'))
const UIAccordion = lazy(() => import('./pages/elements/UIAccordion'))
const UIAvatar = lazy(() => import('./pages/elements/UIAvatar'))
const UIBadges = lazy(() => import('./pages/elements/UIBadges'))
const UIBorders = lazy(() => import('./pages/elements/UIBorders'))
const UIButtons = lazy(() => import('./pages/elements/UIButtons'))
const UIButtonsGroup = lazy(() => import('./pages/elements/UIButtonsGroup'))
const UIBreadcrumb = lazy(() => import('./pages/elements/UIBreadcrumb'))
const UICards = lazy(() => import('./pages/elements/UICards'))
const UICarousel = lazy(() => import('./pages/elements/UICarousel'))
const UIColors = lazy(() => import('./pages/elements/UIColors'))
const UIDropdowns = lazy(() => import('./pages/elements/UIDropdowns'))
const UIGridEl = lazy(() => import('./pages/elements/UIGrid'))
const UIImages = lazy(() => import('./pages/elements/UIImages'))
const UILightbox = lazy(() => import('./pages/elements/UILightbox'))
const UIMedia = lazy(() => import('./pages/elements/UIMedia'))
const UIModals = lazy(() => import('./pages/elements/UIModals'))
const UIOffcanvas = lazy(() => import('./pages/elements/UIOffcanvas'))
const UIPagination = lazy(() => import('./pages/elements/UIPagination'))
const UIPopovers = lazy(() => import('./pages/elements/UIPopovers'))
const UIProgress = lazy(() => import('./pages/elements/UIProgress'))
const UIPlaceholders = lazy(() => import('./pages/elements/UIPlaceholders'))
const UIRangeSlider = lazy(() => import('./pages/elements/UIRangeSlider'))
const UISpinner = lazy(() => import('./pages/elements/UISpinner'))
const UISweetAlerts = lazy(() => import('./pages/elements/UISweetAlerts'))
const UINavTabs = lazy(() => import('./pages/elements/UINavTabs'))
const UIToasts = lazy(() => import('./pages/elements/UIToasts'))
const UITooltips = lazy(() => import('./pages/elements/UITooltips'))
const UITypography = lazy(() => import('./pages/elements/UITypography'))
const UIVideo = lazy(() => import('./pages/elements/UIVideo'))
const UISortable = lazy(() => import('./pages/elements/UISortable'))
const UISwiperjs = lazy(() => import('./pages/elements/UISwiperjs'))
const UIRibbon = lazy(() => import('./pages/elements/UIRibbon'))
const UIClipboard = lazy(() => import('./pages/elements/UIClipboard'))
const UIDragDrop = lazy(() => import('./pages/elements/UIDragDrop'))
const UIRating = lazy(() => import('./pages/elements/UIRating'))
const UITextEditor = lazy(() => import('./pages/elements/UITextEditor'))
const UICounter = lazy(() => import('./pages/elements/UICounter'))
const UIScrollbar = lazy(() => import('./pages/elements/UIScrollbar'))
const UIStickyNote = lazy(() => import('./pages/elements/UIStickyNote'))
const UITimeline = lazy(() => import('./pages/elements/UITimeline'))
const ChartApex = lazy(() => import('./pages/elements/ChartApex'))
const ChartC3 = lazy(() => import('./pages/elements/ChartC3'))
const ChartJs = lazy(() => import('./pages/elements/ChartJs'))
const ChartMorris = lazy(() => import('./pages/elements/ChartMorris'))
const ChartFlot = lazy(() => import('./pages/elements/ChartFlot'))
const ChartPeity = lazy(() => import('./pages/elements/ChartPeity'))
const IconFontawesome = lazy(() => import('./pages/elements/IconFontawesome'))
const IconFeather = lazy(() => import('./pages/elements/IconFeather'))
const IconIonic = lazy(() => import('./pages/elements/IconIonic'))
const IconMaterial = lazy(() => import('./pages/elements/IconMaterial'))
const IconPe7 = lazy(() => import('./pages/elements/IconPe7'))
const IconSimpleline = lazy(() => import('./pages/elements/IconSimpleline'))
const IconThemify = lazy(() => import('./pages/elements/IconThemify'))
const IconWeather = lazy(() => import('./pages/elements/IconWeather'))
const IconTypicon = lazy(() => import('./pages/elements/IconTypicon'))
const IconFlag = lazy(() => import('./pages/elements/IconFlag'))
const IconTabler = lazy(() => import('./pages/elements/IconTabler'))
const IconBootstrap = lazy(() => import('./pages/elements/IconBootstrap'))
const IconRemix = lazy(() => import('./pages/elements/IconRemix'))
const FormBasicInputs = lazy(() => import('./pages/elements/FormBasicInputs'))
const FormCheckboxRadios = lazy(() => import('./pages/elements/FormCheckboxRadios'))
const FormInputGroups = lazy(() => import('./pages/elements/FormInputGroups'))
const FormGridGutters = lazy(() => import('./pages/elements/FormGridGutters'))
const FormSelect = lazy(() => import('./pages/elements/FormSelect'))
const FormMask = lazy(() => import('./pages/elements/FormMask'))
const FormFileUpload = lazy(() => import('./pages/elements/FormFileUpload'))
const FormHorizontal = lazy(() => import('./pages/elements/FormHorizontal'))
const FormVertical = lazy(() => import('./pages/elements/FormVertical'))
const FormFloatingLabels = lazy(() => import('./pages/elements/FormFloatingLabels'))
const FormValidation = lazy(() => import('./pages/elements/FormValidation'))
const FormSelect2 = lazy(() => import('./pages/elements/FormSelect2'))
const FormWizard = lazy(() => import('./pages/elements/FormWizard'))
const FormPickers = lazy(() => import('./pages/elements/FormPickers'))
const TablesBasic = lazy(() => import('./pages/elements/TablesBasic'))
const DataTables = lazy(() => import('./pages/elements/DataTables'))
const MapsVector = lazy(() => import('./pages/elements/MapsVector'))
const MapsLeaflet = lazy(() => import('./pages/elements/MapsLeaflet'))

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
          <Route path="/" element={<Navigate to="/admin-dashboard-2" replace />} />
          
          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin-dashboard-2" element={<Dashboard />} />
          <Route path="/sales-dashboard" element={<SalesDashboard />} />

          {/* Super Admin */}
          <Route path="/companies" element={<Companies />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/domain" element={<Domain />} />
          <Route path="/purchase-transaction" element={<PurchaseTransaction />} />

          {/* Inventory */}
          <Route path="/product-list" element={<ProductList />} />
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/edit-product/:id" element={<EditProduct />} />
          <Route path="/product-details" element={<ProductDetails />} />
          <Route path="/expired-products" element={<ExpiredProducts />} />
          <Route path="/low-stocks" element={<LowStocks />} />
          <Route path="/category-list" element={<CategoryList />} />
          <Route path="/sub-categories" element={<SubCategories />} />
          <Route path="/brand-list" element={<BrandList />} />
          <Route path="/units" element={<Units />} />
          <Route path="/variant-attributes" element={<VariantAttributes />} />
          <Route path="/warranty" element={<Warranty />} />
          <Route path="/barcode" element={<Barcode />} />
          <Route path="/qrcode" element={<QRCode />} />

          {/* Stock */}
          <Route path="/manage-stocks" element={<ManageStocks />} />
          <Route path="/stock-adjustment" element={<StockAdjustment />} />
          <Route path="/stock-transfer" element={<StockTransfer />} />
          <Route path="/stock-history" element={<StockHistory />} />
          <Route path="/sold-stock" element={<SoldStock />} />

          {/* Installments */}
          <Route path="/installment-plans" element={<InstallmentPlans />} />
          <Route path="/create-installment" element={<CreateInstallment />} />
          <Route path="/installment-details/:id" element={<InstallmentDetails />} />

          {/* Sales */}
          <Route path="/online-orders" element={<OnlineOrders />} />
          <Route path="/pos-orders" element={<POSOrders />} />
          <Route path="/invoice" element={<Invoice />} />
          <Route path="/invoice-details/:id" element={<InvoiceDetails />} />
          <Route path="/sales-returns" element={<SalesReturns />} />
          <Route path="/quotation-list" element={<QuotationList />} />
          <Route path="/pos" element={<POS />} />

          {/* Promo */}
          <Route path="/coupons" element={<Coupons />} />
          <Route path="/gift-cards" element={<GiftCards />} />
          <Route path="/discount-plan" element={<DiscountPlan />} />
          <Route path="/discount" element={<Discount />} />

          {/* Purchases */}
          <Route path="/purchase-list" element={<PurchaseList />} />
          <Route path="/purchase-order-report" element={<PurchaseOrderReport />} />
          <Route path="/purchase-returns" element={<PurchaseReturns />} />

          {/* Finance */}
          <Route path="/expense-list" element={<ExpenseList />} />
          <Route path="/expense-category" element={<ExpenseCategory />} />
          <Route path="/income" element={<FinanceIncome />} />
          <Route path="/income-category" element={<IncomeCategory />} />
          <Route path="/account-list" element={<AccountList />} />
          <Route path="/money-transfer" element={<MoneyTransfer />} />
          <Route path="/balance-sheet" element={<BalanceSheet />} />
          <Route path="/trial-balance" element={<TrialBalance />} />
          <Route path="/cash-flow" element={<CashFlow />} />
          <Route path="/account-statement" element={<AccountStatement />} />

          {/* People */}
          <Route path="/customers" element={<Customers />} />
          <Route path="/billers" element={<Billers />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/store-list" element={<StoreList />} />
          <Route path="/warehouse" element={<WarehousePage />} />

          {/* HRM */}
          <Route path="/employees-grid" element={<EmployeesGrid />} />
          <Route path="/employees-list" element={<EmployeesList />} />
          <Route path="/add-employee" element={<AddEmployee />} />
          <Route path="/edit-employee" element={<EditEmployee />} />
          <Route path="/employee-details" element={<EmployeeDetails />} />
          <Route path="/employee-salary" element={<EmployeeSalary />} />
          <Route path="/department-grid" element={<DepartmentGrid />} />
          <Route path="/department-list" element={<DepartmentList />} />
          <Route path="/designation" element={<Designation />} />
          <Route path="/shift" element={<Shift />} />
          <Route path="/attendance-employee" element={<AttendanceEmployee />} />
          <Route path="/attendance-admin" element={<AttendanceAdmin />} />
          <Route path="/leaves-admin" element={<LeavesAdmin />} />
          <Route path="/leaves-employee" element={<LeavesEmployee />} />
          <Route path="/leave-types" element={<LeaveTypes />} />
          <Route path="/holidays" element={<HolidaysPage />} />
          <Route path="/payslip" element={<Payslip />} />

          {/* Reports */}
          <Route path="/sales-report" element={<SalesReport />} />
          <Route path="/best-seller" element={<BestSeller />} />
          <Route path="/purchase-report" element={<PurchaseReport />} />
          <Route path="/inventory-report" element={<InventoryReport />} />
          <Route path="/invoice-report" element={<InvoiceReport />} />
          <Route path="/supplier-report" element={<SupplierReport />} />
          <Route path="/supplier-due-report" element={<SupplierDueReport />} />
          <Route path="/customer-report" element={<CustomerReport />} />
          <Route path="/customer-due-report" element={<CustomerDueReport />} />
          <Route path="/product-report" element={<ProductReport />} />
          <Route path="/product-expiry-report" element={<ProductExpiryReport />} />
          <Route path="/product-quantity-alert" element={<ProductQuantityAlert />} />
          <Route path="/expense-report" element={<ExpenseReport />} />
          <Route path="/income-report" element={<IncomeReport />} />
          <Route path="/tax-reports" element={<TaxReports />} />
          <Route path="/profit-and-loss" element={<ProfitAndLoss />} />
          <Route path="/annual-report" element={<AnnualReport />} />

          {/* Installment Reports */}
          <Route path="/inst-collection-report" element={<InstallmentCollectionReport />} />
          <Route path="/inst-outstanding-balance" element={<OutstandingBalanceReport />} />
          <Route path="/inst-daily-cashflow" element={<DailyCashFlowReport />} />
          <Route path="/inst-profit-loss" element={<InstallmentProfitLossReport />} />
          <Route path="/inst-customer-ledger" element={<CustomerLedgerReport />} />
          <Route path="/inst-defaulters" element={<DefaultersReport />} />
          <Route path="/inst-payment-history" element={<PaymentHistoryReport />} />
          <Route path="/inst-sales-summary" element={<InstallmentSalesSummaryReport />} />
          <Route path="/inst-product-sales" element={<InstProductSalesReport />} />
          <Route path="/inst-default-rate" element={<DefaultRateReport />} />
          <Route path="/inst-recovery-performance" element={<RecoveryPerformanceReport />} />
          <Route path="/inst-due-today" element={<DueTodayReport />} />
          <Route path="/inst-upcoming-due" element={<UpcomingDueReport />} />
          <Route path="/inst-late-fees" element={<LateFeeReport />} />
          <Route path="/inst-product-profit" element={<ProductProfitReport />} />

          {/* CMS */}
          <Route path="/pages" element={<CmsPages />} />
          <Route path="/all-blog" element={<AllBlog />} />
          <Route path="/blog-tag" element={<BlogTag />} />
          <Route path="/blog-categories" element={<BlogCategories />} />
          <Route path="/blog-comments" element={<BlogComments />} />
          <Route path="/blog-details" element={<BlogDetails />} />
          <Route path="/countries" element={<CountriesPage />} />
          <Route path="/states" element={<StatesPage />} />
          <Route path="/cities" element={<CitiesPage />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/faq" element={<FAQ />} />

          {/* User Management */}
          <Route path="/users" element={<Users />} />
          <Route path="/roles-permissions" element={<RolesPermissions />} />
          <Route path="/permissions" element={<Permissions />} />
          <Route path="/delete-account" element={<DeleteAccount />} />

          {/* Settings */}
          <Route path="/general-settings" element={<GeneralSettings />} />
          <Route path="/security-settings" element={<SecuritySettings />} />
          <Route path="/notification" element={<Notification />} />
          <Route path="/connected-apps" element={<ConnectedApps />} />
          <Route path="/system-settings" element={<SystemSettings />} />
          <Route path="/company-settings" element={<CompanySettings />} />
          <Route path="/localization-settings" element={<LocalizationSettings />} />
          <Route path="/prefixes" element={<Prefixes />} />
          <Route path="/preference" element={<PreferenceSetting />} />
          <Route path="/appearance" element={<Appearance />} />
          <Route path="/social-authentication" element={<SocialAuthentication />} />
          <Route path="/language-settings" element={<LanguageSettings />} />
          <Route path="/invoice-settings" element={<InvoiceSettings />} />
          <Route path="/invoice-templates" element={<InvoiceTemplates />} />
          <Route path="/printer-settings" element={<PrinterSettings />} />
          <Route path="/pos-settings" element={<POSSettings />} />
          <Route path="/custom-fields" element={<CustomFields />} />
          <Route path="/field-visibility" element={<FieldVisibilitySettings />} />
          <Route path="/email-settings" element={<EmailSettings />} />
          <Route path="/email-templates" element={<EmailTemplates />} />
          <Route path="/sms-settings" element={<SMSSettings />} />
          <Route path="/sms-templates" element={<SMSTemplates />} />
          <Route path="/whatsapp-settings" element={<WhatsAppSettings />} />
          <Route path="/otp-settings" element={<OTPSettings />} />
          <Route path="/gdpr-settings" element={<GDPRSettings />} />
          <Route path="/payment-gateway-settings" element={<PaymentGatewaySettings />} />
          <Route path="/bank-settings-grid" element={<BankSettingsGrid />} />
          <Route path="/tax-rates" element={<TaxRates />} />
          <Route path="/currency-settings" element={<CurrencySettings />} />
          <Route path="/storage-settings" element={<StorageSettings />} />
          <Route path="/ban-ip-address" element={<BanIPAddress />} />

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
          <Route path="/video-call" element={<VideoCall />} />
          <Route path="/audio-call" element={<AudioCall />} />
          <Route path="/call-history" element={<CallHistory />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/email" element={<EmailApp />} />
          <Route path="/email-reply" element={<EmailReply />} />
          <Route path="/todo-list" element={<TodoList />} />
          <Route path="/todo" element={<TodoPage />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/file-manager" element={<FileManager />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/social-feed" element={<SocialFeed />} />
          <Route path="/search-list" element={<SearchList />} />

          {/* Ecommerce */}
          <Route path="/ecommerce/products" element={<EcomProducts />} />
          <Route path="/ecommerce/product-details" element={<EcomProductDetails />} />
          <Route path="/ecommerce/orders" element={<OnlineOrders />} />
          <Route path="/ecommerce/customers" element={<Customers />} />
          <Route path="/ecommerce/cart" element={<CartPage />} />
          <Route path="/ecommerce/checkout" element={<CheckoutPage />} />
          <Route path="/ecommerce/wishlist" element={<WishlistPage />} />
          <Route path="/ecommerce/reviews" element={<ReviewsPage />} />

          {/* Misc Pages */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/error-404" element={<Error404 />} />
          <Route path="/error-500" element={<Error500 />} />
          <Route path="/blank-page" element={<BlankPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/coming-soon" element={<ComingSoon />} />
          <Route path="/under-maintenance" element={<UnderMaintenance />} />
          <Route path="/activities" element={<Activities />} />

          {/* UI Elements */}
          <Route path="/ui-alerts" element={<UIAlerts />} />
          <Route path="/ui-accordion" element={<UIAccordion />} />
          <Route path="/ui-avatar" element={<UIAvatar />} />
          <Route path="/ui-badges" element={<UIBadges />} />
          <Route path="/ui-borders" element={<UIBorders />} />
          <Route path="/ui-buttons" element={<UIButtons />} />
          <Route path="/ui-buttons-group" element={<UIButtonsGroup />} />
          <Route path="/ui-breadcrumb" element={<UIBreadcrumb />} />
          <Route path="/ui-cards" element={<UICards />} />
          <Route path="/ui-carousel" element={<UICarousel />} />
          <Route path="/ui-colors" element={<UIColors />} />
          <Route path="/ui-dropdowns" element={<UIDropdowns />} />
          <Route path="/ui-grid" element={<UIGridEl />} />
          <Route path="/ui-images" element={<UIImages />} />
          <Route path="/ui-lightbox" element={<UILightbox />} />
          <Route path="/ui-media" element={<UIMedia />} />
          <Route path="/ui-modals" element={<UIModals />} />
          <Route path="/ui-offcanvas" element={<UIOffcanvas />} />
          <Route path="/ui-pagination" element={<UIPagination />} />
          <Route path="/ui-popovers" element={<UIPopovers />} />
          <Route path="/ui-progress" element={<UIProgress />} />
          <Route path="/ui-placeholders" element={<UIPlaceholders />} />
          <Route path="/ui-rangeslider" element={<UIRangeSlider />} />
          <Route path="/ui-spinner" element={<UISpinner />} />
          <Route path="/ui-sweetalerts" element={<UISweetAlerts />} />
          <Route path="/ui-nav-tabs" element={<UINavTabs />} />
          <Route path="/ui-toasts" element={<UIToasts />} />
          <Route path="/ui-tooltips" element={<UITooltips />} />
          <Route path="/ui-typography" element={<UITypography />} />
          <Route path="/ui-video" element={<UIVideo />} />
          <Route path="/ui-sortable" element={<UISortable />} />
          <Route path="/ui-swiperjs" element={<UISwiperjs />} />
          <Route path="/ui-ribbon" element={<UIRibbon />} />
          <Route path="/ui-clipboard" element={<UIClipboard />} />
          <Route path="/ui-drag-drop" element={<UIDragDrop />} />
          <Route path="/ui-rangeslider-adv" element={<UIRangeSlider />} />
          <Route path="/ui-rating" element={<UIRating />} />
          <Route path="/ui-text-editor" element={<UITextEditor />} />
          <Route path="/ui-counter" element={<UICounter />} />
          <Route path="/ui-scrollbar" element={<UIScrollbar />} />
          <Route path="/ui-stickynote" element={<UIStickyNote />} />
          <Route path="/ui-timeline" element={<UITimeline />} />

          {/* Charts */}
          <Route path="/chart-apex" element={<ChartApex />} />
          <Route path="/chart-c3" element={<ChartC3 />} />
          <Route path="/chart-js" element={<ChartJs />} />
          <Route path="/chart-morris" element={<ChartMorris />} />
          <Route path="/chart-flot" element={<ChartFlot />} />
          <Route path="/chart-peity" element={<ChartPeity />} />

          {/* Icons */}
          <Route path="/icon-fontawesome" element={<IconFontawesome />} />
          <Route path="/icon-feather" element={<IconFeather />} />
          <Route path="/icon-ionic" element={<IconIonic />} />
          <Route path="/icon-material" element={<IconMaterial />} />
          <Route path="/icon-pe7" element={<IconPe7 />} />
          <Route path="/icon-simpleline" element={<IconSimpleline />} />
          <Route path="/icon-themify" element={<IconThemify />} />
          <Route path="/icon-weather" element={<IconWeather />} />
          <Route path="/icon-typicon" element={<IconTypicon />} />
          <Route path="/icon-flag" element={<IconFlag />} />
          <Route path="/icon-tabler" element={<IconTabler />} />
          <Route path="/icon-bootstrap" element={<IconBootstrap />} />
          <Route path="/icon-remix" element={<IconRemix />} />

          {/* Forms */}
          <Route path="/form-basic-inputs" element={<FormBasicInputs />} />
          <Route path="/form-checkbox-radios" element={<FormCheckboxRadios />} />
          <Route path="/form-input-groups" element={<FormInputGroups />} />
          <Route path="/form-grid-gutters" element={<FormGridGutters />} />
          <Route path="/form-select" element={<FormSelect />} />
          <Route path="/form-mask" element={<FormMask />} />
          <Route path="/form-fileupload" element={<FormFileUpload />} />
          <Route path="/form-horizontal" element={<FormHorizontal />} />
          <Route path="/form-vertical" element={<FormVertical />} />
          <Route path="/form-floating-labels" element={<FormFloatingLabels />} />
          <Route path="/form-validation" element={<FormValidation />} />
          <Route path="/form-select2" element={<FormSelect2 />} />
          <Route path="/form-wizard" element={<FormWizard />} />
          <Route path="/form-pickers" element={<FormPickers />} />

          {/* Tables & Maps */}
          <Route path="/tables-basic" element={<TablesBasic />} />
          <Route path="/data-tables" element={<DataTables />} />
          <Route path="/maps-vector" element={<MapsVector />} />
          <Route path="/maps-leaflet" element={<MapsLeaflet />} />

          {/* Layout demo routes */}
          <Route path="/layout-horizontal" element={<BlankPage />} />
          <Route path="/layout-detached" element={<BlankPage />} />
          <Route path="/layout-two-column" element={<BlankPage />} />
          <Route path="/layout-hovered" element={<BlankPage />} />
          <Route path="/layout-boxed" element={<BlankPage />} />
          <Route path="/layout-rtl" element={<BlankPage />} />
          <Route path="/layout-dark" element={<BlankPage />} />

          {/* 404 Catch-all */}
          <Route path="*" element={<Error404 />} />
        </Routes>
      </Layout>
    </Suspense>
  )
}

export default App