import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import {
  Wifi,
  ShoppingCart,
  Package,
  ChevronLeft,
  ArrowLeft,
  Phone,
  User,
  CreditCard,
  Loader2,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
  AlertCircle,
} from "lucide-react";

type Step = "select" | "info" | "payment" | "processing";

export default function StorePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPackage = searchParams.get("package");

  const { data: packages, isLoading } = trpc.package.list.useQuery();
  const { data: gateways } = trpc.payment.getGateways.useQuery();
  const createCustomer = trpc.customer.create.useMutation();
  const createOrder = trpc.order.create.useMutation();
  const processPayment = trpc.payment.process.useMutation();
  const submitManualPayment = trpc.payment.submitManual.useMutation();

  const [step, setStep] = useState<Step>("select");
  const [selectedPackage, setSelectedPackage] = useState<number | null>(
    preselectedPackage ? Number(preselectedPackage) : null
  );
  const [selectedGateway, setSelectedGateway] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [transferNumber, setTransferNumber] = useState("");
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [currentOrderNumber, setCurrentOrderNumber] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedPkg = packages?.find((p) => p.id === selectedPackage);
  const selectedGw = gateways?.find((g) => g.id === selectedGateway);

  const handleSelectPackage = (pkgId: number) => {
    setSelectedPackage(pkgId);
    setStep("info");
  };

  const handleSubmitInfo = () => {
    if (!customerPhone || customerPhone.length < 9) {
      toast.error("يرجى إدخال رقم هاتف صحيح");
      return;
    }
    setStep("payment");
  };

  const handleProcessPayment = async () => {
    if (!selectedPackage || !selectedGateway || !customerPhone) return;

    setStep("processing");

    try {
      // Create or find customer
      const customerResult = await createCustomer.mutateAsync({
        fullName: customerName || undefined,
        phone: customerPhone,
        email: customerEmail || undefined,
      });

      // Create order
      const orderResult = await createOrder.mutateAsync({
        customerId: customerResult.id,
        packageId: selectedPackage,
        paymentGatewayId: selectedGateway,
        customerPhone,
        customerEmail: customerEmail || undefined,
      });

      setCurrentOrderId(orderResult.orderId);
      setCurrentOrderNumber(orderResult.orderNumber);

      // Check if manual confirmation required
      const gateway = gateways?.find((g) => g.id === selectedGateway);

      if (gateway?.requiresManualConfirm) {
        // Submit manual payment
        const manualResult = await submitManualPayment.mutateAsync({
          orderId: orderResult.orderId,
          gatewayId: selectedGateway,
          customerPhone,
          transferNumber: transferNumber || `MANUAL-${Date.now()}`,
          senderName: customerName || undefined,
        });

        if (manualResult.success) {
          setShowSuccess(true);
          toast.success("تم إرسال طلب الدفع! انتظر تأكيد الإدارة.");
        }
      } else {
        // Auto process payment
        const paymentResult = await processPayment.mutateAsync({
          orderId: orderResult.orderId,
          gatewayId: selectedGateway,
          customerPhone,
          customerEmail: customerEmail || undefined,
        });

        if (paymentResult.success) {
          setShowSuccess(true);
          toast.success("تم الدفع بنجاح!");
        } else {
          toast.error(paymentResult.message || "فشل الدفع");
          setStep("payment");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء معالجة الطلب");
      setStep("payment");
    }
  };

  const handleCopyCard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("تم نسخ الكرت!");
  };

  const handleGoToOrder = () => {
    if (currentOrderId) {
      navigate(`/success/${currentOrderId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            رجوع
          </Button>
          <h1 className="text-lg font-bold">متجر الكروت</h1>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { key: "select", label: "اختيار الباقة" },
            { key: "info", label: "البيانات" },
            { key: "payment", label: "الدفع" },
            { key: "processing", label: "التأكيد" },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step === s.key ||
                  (s.key === "select" && step !== "select") ||
                  (s.key === "info" && (step === "payment" || step === "processing")) ||
                  (s.key === "payment" && step === "processing")
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm hidden sm:inline ${
                  step === s.key ? "font-bold text-blue-600" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < 3 && <div className="w-8 h-0.5 bg-muted mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Package */}
        {step === "select" && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">اختر باقتك</h2>
              <p className="text-muted-foreground">اختر الباقة المناسبة لاحتياجاتك</p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages?.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden ${
                      selectedPackage === pkg.id
                        ? "ring-2 ring-blue-500 border-blue-500"
                        : "border-2 hover:border-blue-300"
                    }`}
                    onClick={() => handleSelectPackage(pkg.id)}
                  >
                    <div className="h-2" style={{ backgroundColor: pkg.color || "#3B82F6" }} />
                    <CardHeader className="pb-3 text-center">
                      <Package className="h-10 w-10 mx-auto mb-2 text-blue-500" />
                      <h3 className="font-bold text-lg">{pkg.name}</h3>
                      {pkg.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          {pkg.originalPrice} ر.ي
                        </span>
                      )}
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-3xl font-black text-gradient mb-2">
                        {pkg.price} <span className="text-sm font-normal">ر.ي</span>
                      </div>
                      {pkg.speed && (
                        <p className="text-sm text-muted-foreground mb-1">
                          <Zap className="h-3 w-3 inline ml-1" />
                          {pkg.speed}
                        </p>
                      )}
                      {pkg.quotaGB && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {pkg.quotaGB} جيجابايت
                        </p>
                      )}
                      <Badge variant="outline" className="mb-3">
                        <Clock className="h-3 w-3 ml-1" />
                        {pkg.durationDays} يوم
                      </Badge>
                      <div className="text-xs text-muted-foreground mb-3">
                        متبقي: {pkg.availableCards} كرت
                      </div>
                      <Button className="w-full gap-2" size="sm">
                        <ShoppingCart className="h-4 w-4" />
                        اختر هذه الباقة
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Customer Info */}
        {step === "info" && selectedPkg && (
          <div className="max-w-md mx-auto animate-slide-up">
            <Card>
              <CardHeader className="text-center">
                <h2 className="text-xl font-bold">بيانات العميل</h2>
                <p className="text-sm text-muted-foreground">
                  أدخل بياناتك لإتمام عملية الشراء
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{selectedPkg.name}</span>
                    <span className="text-lg font-black text-blue-600">
                      {selectedPkg.price} ر.ي
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">الاسم (اختياري)</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="أدخل اسمك"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    رقم الهاتف <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="مثال: 771234567"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="pr-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("select")}>
                    رجوع
                  </Button>
                  <Button className="flex-1 gap-2" onClick={handleSubmitInfo}>
                    متابعة
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === "payment" && selectedPkg && (
          <div className="max-w-md mx-auto animate-slide-up">
            <Card>
              <CardHeader className="text-center">
                <h2 className="text-xl font-bold">اختر طريقة الدفع</h2>
                <p className="text-sm text-muted-foreground">
                  اختر المحفظة الإلكترونية المفضلة
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">{selectedPkg.name}</span>
                    <span className="font-bold">{selectedPkg.price} ر.ي</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">الهاتف</span>
                    <span className="font-bold">{customerPhone}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>المحافظ الإلكترونية</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {gateways?.map((gw) => (
                      <button
                        key={gw.id}
                        onClick={() => setSelectedGateway(gw.id)}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-right ${
                          selectedGateway === gw.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-muted hover:border-blue-300"
                        }`}
                      >
                        <CreditCard className="h-6 w-6 text-blue-500 shrink-0" />
                        <div className="flex-1">
                          <div className="font-bold">{gw.name}</div>
                          <div className="text-xs text-muted-foreground">{gw.description}</div>
                        </div>
                        {selectedGateway === gw.id && (
                          <CheckCircle2 className="h-5 w-5 text-blue-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedGw?.requiresManualConfirm && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="transfer">رقم العملية / التحويل</Label>
                    <Input
                      id="transfer"
                      placeholder="أدخل رقم العملية بعد التحويل"
                      value={transferNumber}
                      onChange={(e) => setTransferNumber(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      قم بالتحويل إلى الرقم المخصص، ثم أدخل رقم العملية هنا
                    </p>
                  </div>
                )}

                <Separator />

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>الكرت سيحجز لمدة 10 دقائق لإتمام الدفع</span>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("info")}>
                    رجوع
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleProcessPayment}
                    disabled={!selectedGateway || createCustomer.isPending || createOrder.isPending}
                  >
                    {createCustomer.isPending || createOrder.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري المعالجة...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        تأكيد الدفع
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Processing */}
        {step === "processing" && (
          <div className="max-w-md mx-auto text-center animate-fade-in">
            <Card className="p-8">
              {!showSuccess ? (
                <>
                  <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-2">جاري معالجة الدفع...</h2>
                  <p className="text-muted-foreground">يرجى الانتظار قليلاً</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold mb-2 text-green-600">تم بنجاح!</h2>
                  <p className="text-muted-foreground mb-4">
                    {selectedGw?.requiresManualConfirm
                      ? "تم إرسال طلب الدفع. سيتم تأكيده من الإدارة قريباً."
                      : "تم الدفع بنجاح! يمكنك الآن الاطلاع على كرتك."}
                  </p>
                  <div className="bg-muted rounded-lg p-4 mb-4">
                    <p className="text-sm text-muted-foreground">رقم الطلب</p>
                    <p className="text-xl font-black font-mono">{currentOrderNumber}</p>
                  </div>
                  <Button className="w-full gap-2" onClick={handleGoToOrder}>
                    عرض الكرت
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
