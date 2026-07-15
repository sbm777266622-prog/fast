import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  Printer,
  ArrowLeft,
  Wifi,
  Clock,
  Shield,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function SuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading } = trpc.order.getByNumber.useQuery(
    { orderNumber: orderId || "" },
    { enabled: !!orderId }
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ!");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Simple text download as PDF placeholder
    if (order?.card?.cardCode) {
      const content = `
NetCard Pro - كرت الإنترنت
============================
رقم الطلب: ${order.orderNumber}
الباقة: ${order.package?.name}
السعر: ${order.totalAmount} ر.ي
الكرت: ${order.card.cardCode}
التاريخ: ${new Date(order.createdAt).toLocaleDateString("ar-SA")}
============================
شكراً لاختياركم NetCard Pro
      `;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `card-${order.orderNumber}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم التحميل!");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">الطلب غير موجود</h2>
            <p className="text-muted-foreground mb-4">
              لم يتم العثور على الطلب المطلوب
            </p>
            <Button onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = order.status === "paid";

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 glass-effect no-print">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            رجوع
          </Button>
          <h1 className="text-lg font-bold">تفاصيل الطلب</h1>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-black text-green-600 mb-2">
            {isPaid ? "تم الدفع بنجاح!" : "تفاصيل الطلب"}
          </h1>
          <p className="text-muted-foreground">
            {isPaid
              ? "شكراً لك! يمكنك الآن استخدام كرتك"
              : "حالة الطلب: " + order.status}
          </p>
        </div>

        {/* Order Details Card */}
        <Card className="mb-6 animate-slide-up">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">رقم الطلب</p>
                <p className="text-2xl font-black font-mono">{order.orderNumber}</p>
              </div>
              <Badge
                variant={isPaid ? "default" : "secondary"}
                className={isPaid ? "bg-green-500" : ""}
              >
                {isPaid ? "مدفوع" : order.status}
              </Badge>
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
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground">التاريخ</p>
                <p className="font-bold text-sm">
                  {new Date(order.createdAt).toLocaleDateString("ar-SA")}
                </p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground">العميل</p>
                <p className="font-bold text-sm">{order.customer?.phone}</p>
              </div>
            </div>

            <Separator />

            {/* Card Display (Only if paid) */}
            {isPaid && order.card && (
              <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl p-6 text-white text-center">
                <Wifi className="h-8 w-8 mx-auto mb-3" />
                <p className="text-sm text-blue-100 mb-2">كرت الإنترنت الخاص بك</p>
                <p className="text-2xl font-black font-mono tracking-wider mb-4 break-all">
                  {order.card.cardCode}
                </p>
                <div className="flex flex-wrap justify-center gap-2 no-print">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopy(order.card!.cardCode)}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    نسخ
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handlePrint}
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    طباعة
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownloadPDF}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    تحميل
                  </Button>
                </div>
              </div>
            )}

            {!isPaid && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="font-bold text-yellow-700 dark:text-yellow-300">
                  الطلب قيد الانتظار
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  سيتم تأكيد الطلب من الإدارة قريباً
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>هذا الكرت خاص بك ولا يمكن استخدامه من قبل شخص آخر</span>
            </div>
          </CardContent>
        </Card>

        {/* Print Only Section */}
        <div className="print-only hidden">
          <h2>NetCard Pro - فاتورة</h2>
          <p>رقم الطلب: {order.orderNumber}</p>
          <p>الباقة: {order.package?.name}</p>
          <p>الكرت: {order.card?.cardCode}</p>
          <p>التاريخ: {new Date(order.createdAt).toLocaleDateString("ar-SA")}</p>
        </div>

        {/* Back Button */}
        <div className="text-center no-print">
          <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            العودة للرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
}
