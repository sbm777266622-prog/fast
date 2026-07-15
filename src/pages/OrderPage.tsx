import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2, ArrowLeft, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

export default function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading } = trpc.order.getByNumber.useQuery(
    { orderNumber: orderId || "" },
    { enabled: !!orderId, refetchInterval: 5000 }
  );

  // Auto-redirect to success page if paid
  useEffect(() => {
    if (order?.status === "paid") {
      navigate(`/success/${orderId}`);
    }
  }, [order, orderId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">الطلب غير موجود</h2>
          <Button onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> العودة
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 glass-effect">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> رجوع
          </Button>
          <h1 className="text-lg font-bold">حالة الطلب</h1>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <Card className="p-8">
          {order.status === "pending" && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">طلبك قيد المعالجة</h2>
              <p className="text-muted-foreground mb-4">
                رقم الطلب: <span className="font-mono font-bold">{order.orderNumber}</span>
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                <Clock className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <p className="text-sm">الكرت محجوز لمدة 10 دقائق</p>
                <p className="text-sm text-muted-foreground">بانتظار تأكيد الدفع...</p>
              </div>
            </>
          )}
          {order.status === "failed" && (
            <>
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2 text-red-600">فشل الطلب</h2>
              <p className="text-muted-foreground">لم يتم إتمام عملية الدفع</p>
            </>
          )}
          {order.status === "cancelled" && (
            <>
              <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2 text-orange-600">طلب ملغي</h2>
              <p className="text-muted-foreground">تم إلغاء الطلب</p>
            </>
          )}
          <Button onClick={() => navigate("/")} variant="outline" className="gap-2 mt-4">
            <ArrowLeft className="h-4 w-4" /> العودة للرئيسية
          </Button>
        </Card>
      </div>
    </div>
  );
}
