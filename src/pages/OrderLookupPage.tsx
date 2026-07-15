import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import {
  Search,
  ArrowLeft,
  Phone,
  FileText,
  Wifi,
  Copy,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function OrderLookupPage() {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState<"order" | "phone">("order");
  const [searchValue, setSearchValue] = useState("");
  const [searched, setSearched] = useState(false);

  const { data: order, isLoading } = trpc.order.getByNumber.useQuery(
    { orderNumber: searchValue },
    { enabled: searched && searchType === "order" && searchValue.length > 0 }
  );

  const { data: phoneOrders, isLoading: phoneLoading } = trpc.order.getByPhone.useQuery(
    { phone: searchValue },
    { enabled: searched && searchType === "phone" && searchValue.length > 0 }
  );

  const handleSearch = () => {
    if (!searchValue.trim()) {
      toast.error("يرجى إدخال قيمة البحث");
      return;
    }
    setSearched(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ!");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed":
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">مدفوع</Badge>;
      case "pending":
        return <Badge variant="secondary">قيد الانتظار</Badge>;
      case "failed":
        return <Badge variant="destructive">فاشل</Badge>;
      case "cancelled":
        return <Badge variant="outline">ملغي</Badge>;
      case "expired":
        return <Badge variant="secondary">منتهي</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 glass-effect">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            رجوع
          </Button>
          <h1 className="text-lg font-bold">البحث عن طلب</h1>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">البحث عن طلب</h2>
          <p className="text-muted-foreground">
            أدخل رقم الطلب أو رقم الهاتف للبحث
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-2 mb-4">
              <Button
                variant={searchType === "order" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => { setSearchType("order"); setSearched(false); }}
              >
                <FileText className="h-4 w-4" />
                رقم الطلب
              </Button>
              <Button
                variant={searchType === "phone" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => { setSearchType("phone"); setSearched(false); }}
              >
                <Phone className="h-4 w-4" />
                رقم الهاتف
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder={
                  searchType === "order"
                    ? "أدخل رقم الطلب (مثال: NCP-20250714-1234)"
                    : "أدخل رقم الهاتف (مثال: 771234567)"
                }
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isLoading || phoneLoading}>
                {isLoading || phoneLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && searchType === "order" && order && (
          <Card className="animate-slide-up">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">رقم الطلب</p>
                  <p className="text-xl font-black font-mono">{order.orderNumber}</p>
                </div>
                {getStatusBadge(order.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">الباقة</p>
                  <p className="font-bold">{order.package?.name}</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">السعر</p>
                  <p className="font-bold text-blue-600">{order.totalAmount} ر.ي</p>
                </div>
              </div>

              {order.status === "paid" && order.card && (
                <>
                  <Separator />
                  <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl p-6 text-white text-center">
                    <Wifi className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm text-blue-100 mb-2">كرت الإنترنت</p>
                    <p className="text-xl font-black font-mono tracking-wider mb-3 break-all">
                      {order.card.cardCode}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopy(order.card!.cardCode)}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      نسخ الكرت
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {searched && searchType === "phone" && phoneOrders && phoneOrders.length > 0 && (
          <div className="space-y-4 animate-slide-up">
            {phoneOrders.map((o) => (
              <Card key={o.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/success/${o.orderNumber}`)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold font-mono">{o.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-blue-600">{o.finalAmount} ر.ي</p>
                      {getStatusBadge(o.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {searched && (
          (searchType === "order" && !order && !isLoading) ||
          (searchType === "phone" && phoneOrders?.length === 0 && !phoneLoading)
        ) && (
          <Card className="text-center p-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-bold mb-2">لا توجد نتائج</h3>
            <p className="text-muted-foreground">
              لم يتم العثور على {searchType === "order" ? "طلب" : "طلبات"} بهذا الرقم
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
