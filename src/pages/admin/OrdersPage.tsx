import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminSidebar from "@/components/AdminSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import {
  ShoppingCart,
  Search,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
} from "lucide-react";

export default function AdminOrders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data: ordersData, isLoading } = trpc.order.list.useQuery({
    search: search || undefined,
    status: statusFilter as any || undefined,
    page,
    limit: 50,
  });
  const { data: stats } = trpc.order.getStats.useQuery();
  const { data: packages } = trpc.package.listAll.useQuery();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-green-500 gap-1"><CheckCircle2 className="h-3 w-3" />مدفوع</Badge>;
      case "pending": return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />قيد الانتظار</Badge>;
      case "failed": return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />فاشل</Badge>;
      case "cancelled": return <Badge variant="outline">ملغي</Badge>;
      case "expired": return <Badge variant="secondary">منتهي</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

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
              <h1 className="font-bold text-lg">الطلبات</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="p-4 md:p-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "الكل", value: stats?.total || 0 },
              { label: "قيد الانتظار", value: stats?.pending || 0 },
              { label: "مدفوع", value: stats?.paid || 0 },
              { label: "الإيرادات", value: `${stats?.revenue?.toFixed(0) || 0} ر.ي` },
            ].map((s) => (
              <Card key={s.label}><CardContent className="p-4 text-center">
                <p className="text-2xl font-black text-blue-600">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </CardContent></Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="بحث برقم الطلب..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">الكل</SelectItem>
                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                    <SelectItem value="paid">مدفوع</SelectItem>
                    <SelectItem value="failed">فاشل</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <>
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
                    {ordersData?.items?.map((order: any) => (
                      <tr key={order.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/success/${order.orderNumber}`)}>
                        <td className="py-3 px-2 font-mono text-sm">{order.orderNumber}</td>
                        <td className="py-3 px-2 text-sm">{order.customerId}</td>
                        <td className="py-3 px-2 text-sm">{packages?.find((p) => p.id === order.packageId)?.name || order.packageId}</td>
                        <td className="py-3 px-2 font-bold">{order.finalAmount} ر.ي</td>
                        <td className="py-3 px-2">{getStatusBadge(order.status)}</td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("ar-SA")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ordersData && ordersData.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>السابق</Button>
                  <span className="px-4 py-2 text-sm">{page} / {ordersData.totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(ordersData.totalPages, p + 1))} disabled={page === ordersData.totalPages}>التالي</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
