import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import AdminSidebar from "@/components/AdminSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2, ArrowLeft, FileText, TrendingUp, Calendar, Download } from "lucide-react";

export default function AdminReports() {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [generated, setGenerated] = useState(false);

  const { data: report, isLoading } = trpc.admin.getReport.useQuery(
    { dateFrom: dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0], dateTo: dateTo || new Date().toISOString().split("T")[0], groupBy: "day" },
    { enabled: generated }
  );
  const { data: salesChart } = trpc.admin.getSalesChart.useQuery(
    { period: "daily", days: 30 },
    { enabled: true }
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <AdminSidebar />
      <div className="lg:mr-64 pb-20 lg:pb-0">
        <header className="sticky top-0 z-40 glass-effect border-b">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="font-bold text-lg">التقارير</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid sm:grid-cols-3 gap-3 items-end">
                <div className="space-y-2">
                  <Label>من تاريخ</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>إلى تاريخ</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <Button onClick={() => setGenerated(true)} className="gap-2">
                  <FileText className="h-4 w-4" />
                  عرض التقرير
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          {report && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
              {[
                { label: "إجمالي الطلبات", value: report.summary.totalOrders, icon: <FileText className="h-5 w-5" /> },
                { label: "الطلبات المدفوعة", value: report.summary.paidOrders, icon: <TrendingUp className="h-5 w-5" /> },
                { label: "إجمالي الإيرادات", value: `${report.summary.totalRevenue.toFixed(0)} ر.ي`, icon: <TrendingUp className="h-5 w-5 text-green-500" /> },
                { label: "متوسط الطلب", value: `${report.summary.averageOrder.toFixed(0)} ر.ي`, icon: <Calendar className="h-5 w-5" /> },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{s.label}</p>
                        <p className="text-2xl font-black text-blue-600">{s.value}</p>
                      </div>
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                        {s.icon}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                مبيعات آخر 30 يوم
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesChart && salesChart.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-end gap-1 h-48">
                    {salesChart.map((day, i) => {
                      const maxRevenue = Math.max(...salesChart.map((d) => d.revenue), 1);
                      const height = (day.revenue / maxRevenue) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${day.revenue.toFixed(0)} ر.ي`}>
                          <div className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-sm transition-all hover:from-blue-600 hover:to-cyan-500 min-h-[4px]" style={{ height: `${Math.max(height, 4)}%` }} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{salesChart[0]?.date}</span>
                    <span>{salesChart[salesChart.length - 1]?.date}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">لا توجد بيانات كافية</div>
              )}
            </CardContent>
          </Card>

          {/* By Package */}
          {report && report.byPackage.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  المبيعات حسب الباقة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.byPackage.map((pkg: any) => {
                    const maxRevenue = Math.max(...report.byPackage.map((p: any) => p.revenue), 1);
                    const pct = (pkg.revenue / maxRevenue) * 100;
                    return (
                      <div key={pkg.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{pkg.name}</span>
                          <span className="text-muted-foreground">{pkg.orders} طلب | {pkg.revenue.toFixed(0)} ر.ي</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-l from-purple-500 to-pink-400 rounded-full" style={{ width: `${Math.max(pct, 4)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
