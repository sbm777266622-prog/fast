import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Wifi,
  Shield,
  Zap,
  Clock,
  CreditCard,
  Headphones,
  ShoppingCart,
  Package,
  Search,
  ChevronLeft,
  TrendingUp,
  Users,
  BarChart3,
  ArrowLeft,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { data: packages, isLoading } = trpc.package.list.useQuery();

  const features = [
    {
      icon: <Zap className="h-6 w-6 text-yellow-500" />,
      title: "تفعيل فوري",
      desc: "احصل على كرتك فوراً بعد إتمام الدفع",
    },
    {
      icon: <Shield className="h-6 w-6 text-green-500" />,
      title: "شراء آمن 100%",
      desc: "نظام حماية متكامل يمنع بيع الكرت مرتين",
    },
    {
      icon: <Clock className="h-6 w-6 text-blue-500" />,
      title: "دعم على مدار الساعة",
      desc: "فريق الدعم جاهز لمساعدتك في أي وقت",
    },
    {
      icon: <CreditCard className="h-6 w-6 text-purple-500" />,
      title: "دفع سهل",
      desc: "ادعم جميع المحافظ الإلكترونية اليمنية",
    },
  ];

  const steps = [
    { num: "1", title: "اختر الباقة", desc: "اختر الباقة المناسبة لك من القائمة" },
    { num: "2", title: "أكمل الدفع", desc: "ادفع باستخدام المحفظة الإلكترونية المفضلة" },
    { num: "3", title: "احصل على الكرت", desc: "سيظهر الكرت فوراً بعد نجاح الدفع" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center">
              <Wifi className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">NetCard Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/lookup")}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">البحث عن طلب</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">لوحة الإدارة</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-cyan-500/5" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="text-center mb-16 animate-fade-in">
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
              <TrendingUp className="h-3.5 w-3.5 ml-1" />
              نظام بيع كروت الإنترنت
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              اشترِ كرت الإنترنت
              <span className="text-gradient block mt-2">بكل سهولة وأمان</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              احصل على كروت الإنترنت بسرعة فورية ودفع آمن عبر المحافظ الإلكترونية اليمنية.
              نظام متكامل يضمن لك تجربة شراء سلسة وموثوقة.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/store")}
                className="gap-2 px-8 text-lg h-14 bg-gradient-to-l from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
              >
                <ShoppingCart className="h-5 w-5" />
                تصفح الباقات
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/lookup")}
                className="gap-2 px-8 text-lg h-14"
              >
                <Search className="h-5 w-5" />
                البحث عن طلب
              </Button>
            </div>
          </div>

          {/* Packages Grid */}
          <div className="mb-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3">الباقات المتاحة</h2>
              <p className="text-muted-foreground">اختر الباقة المناسبة لاحتياجاتك</p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {packages?.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className="card-hover cursor-pointer border-2 hover:border-blue-300 dark:hover:border-blue-700 overflow-hidden"
                    onClick={() => navigate(`/store?package=${pkg.id}`)}
                  >
                    <div
                      className="h-2"
                      style={{ backgroundColor: pkg.color || "#3B82F6" }}
                    />
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
                          <Wifi className="h-3 w-3 inline ml-1" />
                          {pkg.speed}
                        </p>
                      )}
                      {pkg.quotaGB && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {pkg.quotaGB} جيجابايت
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mb-3">
                        متبقي: {pkg.availableCards} كرت
                      </p>
                      <Button className="w-full gap-2" size="sm">
                        <ShoppingCart className="h-4 w-4" />
                        شراء الآن
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="mb-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3">كيفية الشراء</h2>
              <p className="text-muted-foreground">ثلاث خطوات بسيطة للحصول على كرتك</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((step) => (
                <div key={step.num} className="text-center animate-slide-up">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg">
                    {step.num}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="mb-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3">لماذا NetCard Pro؟</h2>
              <p className="text-muted-foreground">مميزات تجعلنا الخيار الأفضل</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <Card key={i} className="card-hover p-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-xl flex items-center justify-center">
                    {f.icon}
                  </div>
                  <h3 className="font-bold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { label: "كرت مباع", value: "+10,000", icon: <ShoppingCart className="h-5 w-5" /> },
              { label: "عميل سعيد", value: "+5,000", icon: <Users className="h-5 w-5" /> },
              { label: "باقة متاحة", value: "5", icon: <Package className="h-5 w-5" /> },
              { label: "دقة التسليم", value: "100%", icon: <Shield className="h-5 w-5" /> },
            ].map((stat) => (
              <Card key={stat.label} className="p-6 text-center">
                <div className="flex justify-center mb-2 text-blue-500">{stat.icon}</div>
                <div className="text-2xl font-black text-gradient">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                <Wifi className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">NetCard Pro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              نظام بيع كروت الإنترنت - جميع الحقوق محفوظة © 2025
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Headphones className="h-4 w-4" />
              <span>الدعم الفني متاح 24/7</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
