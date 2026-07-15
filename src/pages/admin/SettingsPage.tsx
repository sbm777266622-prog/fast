import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AdminSidebar from "@/components/AdminSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  ArrowLeft,
  Database,
  Shield,
  FileText,
  CreditCard,
  Users,
  AlertTriangle,
  Info,
} from "lucide-react";

export default function AdminSettings() {
  const navigate = useNavigate();

  const handleBackup = () => {
    const command = `mysqldump -u root -p netcard_pro > backup_${Date.now()}.sql`;
    navigator.clipboard.writeText(command);
    toast.success("تم نسخ أمر النسخ الاحتياطي!");
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
              <h1 className="font-bold text-lg">الإعدادات</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                معلومات النظام
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">اسم النظام</span>
                <span className="font-bold">NetCard Pro</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">الإصدار</span>
                <Badge variant="outline">1.0.0</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">المكدس التقني</span>
                <span className="font-medium">React + tRPC + Drizzle + MySQL</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">اللغة</span>
                <span className="font-medium">العربية (RTL)</span>
              </div>
            </CardContent>
          </Card>

          {/* Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-green-500" />
                النسخ الاحتياطي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                قم بتشغيل الأمر التالي في سطر الأوامر لإنشاء نسخة احتياطية من قاعدة البيانات:
              </p>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                mysqldump -u root -p netcard_pro &gt; backup_{Date.now()}.sql
              </div>
              <Button onClick={handleBackup} variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                نسخ الأمر
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                الأمان
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "JWT Authentication", status: "مفعل" },
                { label: "Database Transactions", status: "مفعل" },
                { label: "Row-Level Locking", status: "مفعل" },
                { label: "Atomic Card Reservation", status: "مفعل" },
                { label: "Input Validation", status: "مفعل" },
                { label: "Duplicate Prevention", status: "مفعل" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-muted-foreground">{item.label}</span>
                  <Badge className="bg-green-500">{item.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Payment Gateways Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-500" />
                بوابات الدفع المدعومة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {["جيب", "فلوسك", "ون كاش", "جوالي", "كاش (يدوي)"].map((gw) => (
                  <div key={gw} className="bg-muted rounded-lg p-3 text-center">
                    <CreditCard className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-sm font-medium">{gw}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* RBAC */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-500" />
                الصلاحيات (RBAC)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { role: "Super Admin", desc: "صلاحيات كاملة على النظام" },
                  { role: "Admin", desc: "إدارة الكروت والطلبات والتقارير" },
                  { role: "Operator", desc: "إدارة الطلبات والعملاء" },
                  { role: "Accountant", desc: "الاطلاع على التقارير المالية فقط" },
                  { role: "Viewer", desc: "عرض فقط بدون تعديل" },
                ].map((r) => (
                  <div key={r.role} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{r.role}</p>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
