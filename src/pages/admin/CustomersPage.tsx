import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AdminSidebar from "@/components/AdminSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import {
  Users,
  Search,
  Loader2,
  ArrowLeft,
  Phone,
  ShoppingCart,
  Ban,
  UserCheck,
} from "lucide-react";

export default function AdminCustomers() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: customersData, isLoading } = trpc.customer.list.useQuery({
    search: search || undefined,
    page,
    limit: 50,
  });

  const toggleBlock = trpc.customer.toggleBlock.useMutation({
    onSuccess: () => { utils.customer.list.invalidate(); toast.success("تم التحديث!"); }
  });

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
              <h1 className="font-bold text-lg">العملاء</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="p-4 md:p-6">
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="بحث برقم الهاتف أو الاسم..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <>
              <div className="grid gap-4">
                {customersData?.items?.map((customer: any) => (
                  <Card key={customer.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold">
                          {(customer.fullName || "?")[0]}
                        </div>
                        <div>
                          <p className="font-bold">{customer.fullName || "بدون اسم"}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {customer.phone}
                          </p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{customer.totalOrders} طلب</span>
                            <span>{customer.totalSpent} ر.ي</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {customer.isBlocked ? (
                          <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" />محظور</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-500 gap-1"><UserCheck className="h-3 w-3" />نشط</Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleBlock.mutate({ id: customer.id })}
                        >
                          {customer.isBlocked ? "إلغاء الحظر" : "حظر"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {customersData && customersData.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>السابق</Button>
                  <span className="px-4 py-2 text-sm">{page} / {customersData.totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(customersData.totalPages, p + 1))} disabled={page === customersData.totalPages}>التالي</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
