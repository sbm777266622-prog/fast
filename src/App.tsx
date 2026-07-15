import { Routes, Route } from "react-router";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

// Public Pages
import Home from "@/pages/Home";
import StorePage from "@/pages/StorePage";
import OrderPage from "@/pages/OrderPage";
import SuccessPage from "@/pages/SuccessPage";
import OrderLookupPage from "@/pages/OrderLookupPage";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

// Admin Pages
import AdminDashboard from "@/pages/admin/DashboardPage";
import AdminPackages from "@/pages/admin/PackagesPage";
import AdminCards from "@/pages/admin/CardsPage";
import AdminOrders from "@/pages/admin/OrdersPage";
import AdminCustomers from "@/pages/admin/CustomersPage";
import AdminPaymentGateways from "@/pages/admin/PaymentGatewaysPage";
import AdminImport from "@/pages/admin/ImportPage";
import AdminReports from "@/pages/admin/ReportsPage";
import AdminSettings from "@/pages/admin/SettingsPage";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="netcard-theme">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/order/:orderId" element={<OrderPage />} />
        <Route path="/success/:orderId" element={<SuccessPage />} />
        <Route path="/lookup" element={<OrderLookupPage />} />
        <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/packages" element={<AdminPackages />} />
        <Route path="/admin/cards" element={<AdminCards />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/customers" element={<AdminCustomers />} />
        <Route path="/admin/payments" element={<AdminPaymentGateways />} />
        <Route path="/admin/import" element={<AdminImport />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/settings" element={<AdminSettings />} />

        {/* Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-left" richColors />
    </ThemeProvider>
  );
}
