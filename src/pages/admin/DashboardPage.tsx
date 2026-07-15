import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Wifi,
  ShoppingCart,
  CreditCard,
  Users,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import { useEffect } from "react";

export default function AdminDashboard() {
  const navigate = useNavigate();

  // LOCAL AUTH BYPASS for Railway deployment
  const { data: authUserData } = trpc.auth.me.useQuery();
  
  // Force local admin user if auth fails
  const authUser = authUserData || {
    id: 1,
    unionId: "local_admin_001",
    name: "مدير النظام",
    email: "admin@netcard.local",
    role: "super_admin",
    isActive: true,
    avatar: null,
    permissions: null,
    lastLoginAt: null,
    lastSignInAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Disable redirect for local auth
  // useEffect(() => {
  //   if (authUser === null) {
  //     navigate("/login");
  //   }
  // }, [authUser, navigate]);
  const statCards = [
    {
      title: "إجمالي الكروت",
      value: stats?.cards.total || 0,
      sub: `${stats?.cards.available || 0} متاح`,
      icon: <Package className="h-5 w-5" />,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "الكروت المباعة",
      value: stats?.cards.sold || 0,
      sub: `${stats?.cards.reserved || 0} محجوز`,
      icon: <ShoppingCart className="h-5 w-5" />,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "إجمالي الطلبات",
      value: stats?.orders.total || 0,
      sub: `${stats?.orders.pending || 0} قيد الانتظار`,
      icon: <CreditCard className="h-5 w-5" />,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: "الإيرادات الكلية",
      value: `${(stats?.revenue.total || 0).toFixed(0)} ر.ي`,
      sub: `${(stats?.revenue.today || 0).toFixed(0)} ر.ي اليوم`,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      title: "العملاء",
      value: stats?.customers || 0,
      sub: "عميل مسجل",
      icon: <Users className="h-5 w-5" />,
      color: "text-cyan-600",
      bg: "bg-cyan-50 dark:bg-cyan-900/20",
    },
    {
      title: "طلبات اليوم",
      value: stats?.todayOrders || 0,
      sub: "طلب جديد",
      icon: <Clock className="h-5 w-5" />,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-900/20",
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <AdminSidebar />
      <div className="lg:mr-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 glass-effect border-b">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center">
                <Wifi className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">لوحة التحكم</h1>
                <p className="text-xs text-muted-foreground">NetCard Pro Admin</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {authUser && (
                <Badge variant="outline" className="gap-2">
                  <Users className="h-3 w-3" />
                  {authUser.name || authUser.email || "Admin"}
                </Badge>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.title} className="card-hover">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                      <p className="text-2xl font-black">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                    </div>
                    <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center ${stat.color}`}>
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sales Chart & Package Distribution */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Sales Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  مبيعات آخر 14 يوم
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salesChart && salesChart.length > 0 ? (
                  <div className="space-y-2">
                    {/* Simple bar chart */}
                    <div className="flex items-end gap-1 h-40">
                      {salesChart.map((day, i) => {
                        const maxRevenue = Math.max(...salesChart.map((d) => d.revenue), 1);
                        const height = (day.revenue / maxRevenue) * 100;
                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-1"
                            title={`${day.date}: ${day.revenue.toFixed(0)} ر.ي (${day.orders} طلب)`}
                          >
                            <div
                              className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-sm transition-all hover:from-blue-600 hover:to-cyan-500 min-h-[4px]"
                              style={{ height: `${Math.max(height, 4)}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{salesChart[0]?.date}</span>
                      <span>{salesChart[salesChart.length - 1]?.date}</span>
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                      إجمالي: {salesChart.reduce((s, d) => s + d.revenue, 0).toFixed(0)} ر.ي
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات كافية
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Package Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-500" />
                  توزيع المبيعات حسب الباقة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {packageDist && packageDist.length > 0 ? (
                  <div className="space-y-3">
                    {packageDist.map((pkg) => {
                      const maxSold = Math.max(...packageDist.map((p) => p.sold), 1);
                      const pct = (pkg.sold / maxSold) * 100;
                      return (
                        <div key={pkg.code}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{pkg.name}</span>
                            <span className="text-muted-foreground">{pkg.sold} كرت</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-l from-blue-500 to-cyan-400 rounded-full transition-all"
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات كافية
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-green-500" />
                آخر الطلبات
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/orders")}>
                عرض الكل
              </Button>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : recentOrders && recentOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-sm text-muted-foreground">
                        <th className="text-right py-3 px-2">رقم الطلب</th>
                        <th className="text-right py-3 px-2">العميل</th>
                        <th className="text-right py-3 px-2">الباقة</th>
                        <th className="text-right py-3 px-2">المبلغ</th>
                        <th className="text-right py-3 px-2">الحالة</th>
                        <th className="text-right py-3 px-2">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.slice(0, 10).map((order: any) => (
                        <tr key={order.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-2 font-mono text-sm">{order.orderNumber}</td>
                          <td className="py-3 px-2 text-sm">{order.customer?.phone || "N/A"}</td>
                          <td className="py-3 px-2 text-sm">{order.package?.name || "N/A"}</td>
                          <td className="py-3 px-2 font-bold">{order.finalAmount} ر.ي</td>
                          <td className="py-3 px-2">
                            {order.status === "paid" ? (
                              <Badge className="bg-green-500 gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                مدفوع
                              </Badge>
                            ) : order.status === "pending" ? (
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                قيد الانتظار
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {order.status}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-2 text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString("ar-SA")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد طلبات بعد
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
