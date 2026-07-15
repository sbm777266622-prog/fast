import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AdminSidebar from "@/components/AdminSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Wifi,
  ArrowLeft,
} from "lucide-react";

export default function AdminPackages() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: packages, isLoading } = trpc.package.listAll.useQuery();
  const createMutation = trpc.package.create.useMutation({
    onSuccess: () => { utils.package.listAll.invalidate(); toast.success("تم إنشاء الباقة!"); setOpen(false); }
  });
  const updateMutation = trpc.package.update.useMutation({
    onSuccess: () => { utils.package.listAll.invalidate(); toast.success("تم التحديث!"); setEditOpen(false); }
  });
  const toggleMutation = trpc.package.toggleActive.useMutation({
    onSuccess: () => utils.package.listAll.invalidate()
  });
  const deleteMutation = trpc.package.delete.useMutation({
    onSuccess: () => { utils.package.listAll.invalidate(); toast.success("تم الحذف!"); }
  });

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", code: "", price: "", speed: "", quotaGB: "", durationDays: "30", color: "#3B82F6" });

  const handleCreate = () => {
    if (!form.name || !form.code || !form.price) { toast.error("يرجى ملء الحقول المطلوبة"); return; }
    createMutation.mutate({ name: form.name, code: form.code, price: form.price, speed: form.speed, quotaGB: form.quotaGB ? Number(form.quotaGB) : undefined, durationDays: Number(form.durationDays), color: form.color });
  };

  const handleUpdate = () => {
    if (!editId) return;
    updateMutation.mutate({ id: editId, name: form.name, code: form.code, price: form.price, speed: form.speed, quotaGB: form.quotaGB ? Number(form.quotaGB) : undefined, color: form.color });
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
              <h1 className="font-bold text-lg">إدارة الباقات</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">الباقات ({packages?.length || 0})</h2>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  باقة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة باقة جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>الاسم *</Label>
                      <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="باقة 100 ريال" />
                    </div>
                    <div className="space-y-2">
                      <Label>الكود *</Label>
                      <Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} placeholder="PKG-100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>السعر *</Label>
                      <Input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} placeholder="100" />
                    </div>
                    <div className="space-y-2">
                      <Label>السرعة</Label>
                      <Input value={form.speed} onChange={(e) => setForm({...form, speed: e.target.value})} placeholder="2 ميجابت" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>السعة (GB)</Label>
                      <Input type="number" value={form.quotaGB} onChange={(e) => setForm({...form, quotaGB: e.target.value})} placeholder="10" />
                    </div>
                    <div className="space-y-2">
                      <Label>اللون</Label>
                      <Input type="color" value={form.color} onChange={(e) => setForm({...form, color: e.target.value})} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {packages?.map((pkg) => (
                <Card key={pkg.id} className="overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: pkg.color || "#3B82F6" }} />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{pkg.name}</h3>
                        <p className="text-sm text-muted-foreground">{pkg.code}</p>
                      </div>
                      <Badge variant={pkg.isActive ? "default" : "secondary"}>
                        {pkg.isActive ? "نشط" : "معطل"}
                      </Badge>
                    </div>
                    <div className="text-2xl font-black text-gradient mb-3">
                      {pkg.price} <span className="text-sm font-normal">ر.ي</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div className="bg-muted rounded p-2">
                        <span className="text-muted-foreground">المخزون:</span>{" "}
                        <span className="font-bold">{pkg.availableCards}</span>
                      </div>
                      <div className="bg-muted rounded p-2">
                        <span className="text-muted-foreground">المباع:</span>{" "}
                        <span className="font-bold">{pkg.soldCards}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={pkg.isActive}
                          onCheckedChange={() => toggleMutation.mutate({ id: pkg.id })}
                        />
                        <span className="text-sm">نشط</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditId(pkg.id); setForm({ name: pkg.name, code: pkg.code, price: String(pkg.price), speed: pkg.speed || "", quotaGB: pkg.quotaGB ? String(pkg.quotaGB) : "", durationDays: String(pkg.durationDays || 30), color: pkg.color || "#3B82F6" }); setEditOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { if (confirm("هل أنت متأكد من الحذف؟")) deleteMutation.mutate({ id: pkg.id }); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل الباقة</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
              <div className="space-y-2"><Label>الكود</Label><Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>السعر</Label><Input value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} /></div>
              <div className="space-y-2"><Label>السرعة</Label><Input value={form.speed} onChange={(e) => setForm({...form, speed: e.target.value})} /></div>
            </div>
            <Button className="w-full" onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
