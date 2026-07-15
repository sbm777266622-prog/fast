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
  CreditCard,
  Plus,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
} from "lucide-react";

export default function AdminPaymentGateways() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: gateways, isLoading } = trpc.payment.listAllGateways.useQuery();
  const createMutation = trpc.payment.createGateway.useMutation({
    onSuccess: () => { utils.payment.listAllGateways.invalidate(); toast.success("تم الإنشاء!"); setOpen(false); }
  });
  const updateMutation = trpc.payment.updateGateway.useMutation({
    onSuccess: () => { utils.payment.listAllGateways.invalidate(); toast.success("تم التحديث!"); setEditOpen(false); }
  });
  const deleteMutation = trpc.payment.deleteGateway.useMutation({
    onSuccess: () => { utils.payment.listAllGateways.invalidate(); toast.success("تم الحذف!"); }
  });

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", code: "", provider: "", description: "" });

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
              <h1 className="font-bold text-lg">بوابات الدفع</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">بوابات الدفع ({gateways?.length || 0})</h2>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" />بوابة جديدة</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>إضافة بوابة دفع</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-4">
                  <div className="space-y-2"><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
                  <div className="space-y-2"><Label>الكود</Label><Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} /></div>
                  <div className="space-y-2"><Label>المزود</Label><Input value={form.provider} onChange={(e) => setForm({...form, provider: e.target.value})} /></div>
                  <div className="space-y-2"><Label>الوصف</Label><Input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
                  <Button className="w-full" onClick={() => createMutation.mutate({ name: form.name, code: form.code, provider: form.provider, description: form.description })} disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {gateways?.map((gw: any) => (
                <Card key={gw.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{gw.name}</h3>
                        <p className="text-sm text-muted-foreground">{gw.code} | {gw.provider}</p>
                      </div>
                      <Badge variant={gw.isActive ? "default" : "secondary"}>
                        {gw.isActive ? "نشط" : "معطل"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{gw.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={gw.isActive} onCheckedChange={() => updateMutation.mutate({ id: gw.id, isActive: !gw.isActive })} />
                        <span className="text-sm">نشط</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditId(gw.id); setForm({ name: gw.name, code: gw.code, provider: gw.provider, description: gw.description || "" }); setEditOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { if (confirm("هل أنت متأكد؟")) deleteMutation.mutate({ id: gw.id }); }}>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل البوابة</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-4">
            <div className="space-y-2"><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
            <div className="space-y-2"><Label>المزود</Label><Input value={form.provider} onChange={(e) => setForm({...form, provider: e.target.value})} /></div>
            <Button className="w-full" onClick={() => updateMutation.mutate({ id: editId!, name: form.name, provider: form.provider, description: form.description })} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
