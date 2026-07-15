import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useDropzone } from "react-dropzone";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import AdminSidebar from "@/components/AdminSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  XCircle,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";

export default function AdminImport() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: packages } = trpc.package.listAll.useQuery();
  const { data: batches } = trpc.card.getImportBatches.useQuery();

  const parseMutation = trpc.file.parse.useMutation();
  const importMutation = trpc.card.importBatch.useMutation({
    onSuccess: (data) => {
      utils.card.list.invalidate();
      utils.card.getStats.invalidate();
      utils.card.getImportBatches.invalidate();
      toast.success(`تم استيراد ${data.imported} كرت بنجاح!`);
      setStep("done");
    },
  });

  const [step, setStep] = useState<"upload" | "preview" | "processing" | "done">("upload");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"txt" | "csv" | "xlsx" | "pdf">("txt");
  const [parsedCodes, setParsedCodes] = useState<Array<{ cardCode: string }>>([]);
  const [batchName, setBatchName] = useState("");

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase() as "txt" | "csv" | "xlsx" | "pdf" || "txt";
    setFileType(ext);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        const result = await parseMutation.mutateAsync({
          content,
          fileType: ext,
          fileName: file.name,
        });
        setParsedCodes(result.codes);
        setBatchName(`استيراد ${file.name}`);
        setStep("preview");
        toast.success(`تم العثور على ${result.totalRecords} كرت`);
      } catch (err: any) {
        toast.error(err.message || "فشل تحليل الملف");
      }
    };
    reader.readAsText(file);
  }, [parseMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
  });

  const handleImport = async () => {
    if (!selectedPackage) { toast.error("اختر الباقة"); return; }
    if (parsedCodes.length === 0) { toast.error("لا توجد كروت للاستيراد"); return; }

    setStep("processing");
    try {
      await importMutation.mutateAsync({
        cards: parsedCodes,
        packageId: Number(selectedPackage),
        batchName: batchName || `استيراد ${fileName}`,
        sourceFile: fileName,
        fileType,
      });
    } catch (err: any) {
      toast.error(err.message || "فشل الاستيراد");
      setStep("preview");
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
              <h1 className="font-bold text-lg">استيراد الكروت</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          {/* Upload Step */}
          {step === "upload" && (
            <Card className="animate-fade-in">
              <CardHeader className="text-center">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-10 w-10 text-blue-500" />
                </div>
                <CardTitle className="text-2xl">استيراد كروت من ملف</CardTitle>
                <p className="text-muted-foreground">ارفع ملف PDF, TXT, CSV, أو Excel يحتوي على الكروت</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-muted hover:border-blue-300"
                  }`}
                >
                  <input {...getInputProps()} />
                  {parseMutation.isPending ? (
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
                  ) : (
                    <>
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      {isDragActive ? (
                        <p className="text-lg font-medium text-blue-600">أفلت الملف هنا...</p>
                      ) : (
                        <>
                          <p className="text-lg font-medium mb-2">اسحب الملف هنا أو انقر للاختيار</p>
                          <p className="text-sm text-muted-foreground">PDF, TXT, CSV, XLSX</p>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {["PDF", "TXT", "CSV", "Excel"].map((type) => (
                    <div key={type} className="bg-muted rounded-lg p-3 text-center">
                      <FileSpreadsheet className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                      <p className="text-sm font-medium">{type}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Batches */}
                {batches && batches.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-bold mb-3">عمليات الاستيراد الأخيرة</h3>
                      <div className="space-y-2">
                        {batches.slice(0, 5).map((batch: any) => (
                          <div key={batch.id} className="flex items-center justify-between bg-muted rounded-lg p-3">
                            <div>
                              <p className="font-medium text-sm">{batch.batchName}</p>
                              <p className="text-xs text-muted-foreground">
                                {batch.importedRecords} كرت | {batch.duplicateRecords} مكرر
                              </p>
                            </div>
                            <Badge variant={batch.status === "completed" ? "default" : "secondary"}>
                              {batch.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Preview Step */}
          {step === "preview" && (
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  معاينة الكروت ({parsedCodes.length} كرت)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>اختر الباقة *</Label>
                  <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الباقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages?.map((pkg) => (
                        <SelectItem key={pkg.id} value={String(pkg.id)}>
                          {pkg.name} - {pkg.price} ر.ي
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>اسم الدفعة</Label>
                  <Input value={batchName} onChange={(e) => setBatchName(e.target.value)} />
                </div>

                <div className="bg-muted rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {parsedCodes.slice(0, 30).map((code, i) => (
                      <div key={i} className="bg-background rounded px-2 py-1 text-sm font-mono truncate">
                        {code.cardCode}
                      </div>
                    ))}
                    {parsedCodes.length > 30 && (
                      <div className="text-center text-muted-foreground text-sm py-1">
                        +{parsedCodes.length - 30} أكثر
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("upload")}>
                    رجوع
                  </Button>
                  <Button className="flex-1 gap-2" onClick={handleImport} disabled={importMutation.isPending}>
                    {importMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> جاري الاستيراد...</>
                    ) : (
                      <><Upload className="h-4 w-4" /> استيراد {parsedCodes.length} كرت</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing */}
          {step === "processing" && (
            <Card className="text-center p-12 animate-fade-in">
              <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">جاري استيراد الكروت...</h2>
              <p className="text-muted-foreground">قد تستغرق هذه العملية بعض الوقت</p>
              <Progress className="mt-6" value={45} />
            </Card>
          )}

          {/* Done */}
          {step === "done" && (
            <Card className="text-center p-12 animate-fade-in">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">تم الاستيراد بنجاح!</h2>
              <p className="text-muted-foreground mb-6">
                تم استيراد {parsedCodes.length} كرت إلى الباقة المحددة
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setStep("upload")}>استيراد آخر</Button>
                <Button onClick={() => navigate("/admin/cards")}>عرض الكروت</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
