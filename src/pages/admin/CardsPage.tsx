import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminSidebar from "@/components/AdminSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import {
  CreditCard,
  Search,
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

export default function AdminCards() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [packageFilter, setPackageFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data: packages } = trpc.package.listAll.useQuery();
  const { data: cardsData, isLoading } = trpc.card.list.useQuery({
    search: search || undefined,
    status: statusFilter as any || undefined,
    packageId: packageFilter ? Number(packageFilter) : undefined,
    page,
    limit: 50,
  });
  const { data: stats } = trpc.card.getStats.useQuery();

  const deleteMutation = trpc.card.delete.useMutation({
    onSuccess: () => { utils.card.list.invalidate(); utils.card.getStats.invalidate(); toast.success("تم الحذف!"); }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available": return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 ml-1" />متاح</Badge>;
      case "sold": return <Badge className="bg-blue-500">مباع</Badge>;
      case "reserved": return <Badge variant="secondary"><Clock className="h-3 w-3 ml-1" />محجوز</Badge>;
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
              <h1 className="font-bold text-lg">إدارة الكروت</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="p-4 md:p-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "الكل", value: stats?.total || 0, color: "text-blue-600" },
              { label: "متاح", value: stats?.available || 0, color: "text-green-600" },
              { label: "مباع", value: stats?.sold || 0, color: "text-orange-600" },
              { label: "محجوز", value: stats?.reserved || 0, color: "text-yellow-600" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="بحث عن كرت..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">الكل</SelectItem>
                    <SelectItem value="available">متاح</SelectItem>
                    <SelectItem value="sold">مباع</SelectItem>
                    <SelectItem value="reserved">محجوز</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={packageFilter} onValueChange={setPackageFilter}>
                  <SelectTrigger><SelectValue placeholder="الباقة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">الكل</SelectItem>
                    {packages?.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Cards Table */}
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm text-muted-foreground">
                      <th className="text-right py-3 px-2">#</th>
                      <th className="text-right py-3 px-2">الكرت</th>
                      <th className="text-right py-3 px-2">الباقة</th>
                      <th className="text-right py-3 px-2">السعر</th>
                      <th className="text-right py-3 px-2">الحالة</th>
                      <th className="text-right py-3 px-2">التاريخ</th>
                      <th className="text-right py-3 px-2">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardsData?.items?.map((card: any) => (
                      <tr key={card.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 text-sm">{card.id}</td>
                        <td className="py-3 px-2 font-mono text-sm">{card.cardCode.substring(0, 20)}...</td>
                        <td className="py-3 px-2 text-sm">{packages?.find((p) => p.id === card.packageId)?.name || card.packageId}</td>
                        <td className="py-3 px-2 font-bold">{card.price} ر.ي</td>
                        <td className="py-3 px-2">{getStatusBadge(card.status)}</td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {new Date(card.createdAt).toLocaleDateString("ar-SA")}
                        </td>
                        <td className="py-3 px-2">
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { if (confirm("هل أنت متأكد؟")) deleteMutation.mutate({ id: card.id }); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {cardsData && cardsData.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>السابق</Button>
                  <span className="px-4 py-2 text-sm">{page} / {cardsData.totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(cardsData.totalPages, p + 1))} disabled={page === cardsData.totalPages}>التالي</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
