import { useLocation, useNavigate } from "react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Wifi,
  LayoutDashboard,
  Package,
  CreditCard,
  ShoppingCart,
  Users,
  Settings,
  FileText,
  Upload,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BarChart3,
} from "lucide-react";

const menuItems = [
  { path: "/admin", label: "لوحة التحكم", icon: <LayoutDashboard className="h-5 w-5" /> },
  { path: "/admin/packages", label: "إدارة الباقات", icon: <Package className="h-5 w-5" /> },
  { path: "/admin/cards", label: "إدارة الكروت", icon: <CreditCard className="h-5 w-5" /> },
  { path: "/admin/orders", label: "الطلبات", icon: <ShoppingCart className="h-5 w-5" /> },
  { path: "/admin/customers", label: "العملاء", icon: <Users className="h-5 w-5" /> },
  { path: "/admin/payments", label: "بوابات الدفع", icon: <BarChart3 className="h-5 w-5" /> },
  { path: "/admin/import", label: "استيراد الكروت", icon: <Upload className="h-5 w-5" /> },
  { path: "/admin/reports", label: "التقارير", icon: <FileText className="h-5 w-5" /> },
  { path: "/admin/settings", label: "الإعدادات", icon: <Settings className="h-5 w-5" /> },
];

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`fixed right-0 top-0 h-full bg-card border-l z-50 transition-all duration-300 hidden lg:flex flex-col ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="p-4 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center">
                <Wifi className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">NetCard Pro</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="mr-auto"
          >
            {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        <Separator />

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  isActive ? "bg-blue-600 hover:bg-blue-700" : ""
                } ${collapsed ? "px-3" : ""}`}
                onClick={() => navigate(item.path)}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </nav>

        <Separator />

        <div className="p-3">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 ${
              collapsed ? "px-3" : ""
            }`}
            onClick={() => navigate("/")}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>خروج</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50 lg:hidden">
        <div className="flex items-center justify-around p-2">
          {menuItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                className={`flex flex-col items-center gap-0.5 h-auto py-1 px-2 ${
                  isActive ? "text-blue-600" : ""
                }`}
                onClick={() => navigate(item.path)}
              >
                {item.icon}
                <span className="text-[10px]">{item.label.split(" ")[0]}</span>
              </Button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
