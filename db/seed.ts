import { eq } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import { packages, paymentGateways, settings } from "./schema";

async function seed() {
  const db = getDb();
  console.log("Starting seed...");

  // ─── Seed Default Packages ───
  const defaultPackages = [
    {
      name: "باقة 100 ريال",
      code: "PKG-100",
      description: "باقة إنترنت بقيمة 100 ريال - سرعة عالية",
      price: "100.00",
      originalPrice: "120.00",
      durationDays: 30,
      speed: "2 ميجابت/ثانية",
      quotaGB: 10,
      sortOrder: 1,
      color: "#10B981",
      isActive: true,
      isFeatured: false,
    },
    {
      name: "باقة 200 ريال",
      code: "PKG-200",
      description: "باقة إنترنت بقيمة 200 ريال - سرعة فائقة",
      price: "200.00",
      originalPrice: "250.00",
      durationDays: 30,
      speed: "4 ميجابت/ثانية",
      quotaGB: 25,
      sortOrder: 2,
      color: "#3B82F6",
      isActive: true,
      isFeatured: true,
    },
    {
      name: "باقة 250 ريال",
      code: "PKG-250",
      description: "باقة إنترنت بقيمة 250 ريال - الأكثر مبيعاً",
      price: "250.00",
      originalPrice: "300.00",
      durationDays: 30,
      speed: "6 ميجابت/ثانية",
      quotaGB: 40,
      sortOrder: 3,
      color: "#8B5CF6",
      isActive: true,
      isFeatured: true,
    },
    {
      name: "باقة 300 ريال",
      code: "PKG-300",
      description: "باقة إنترنت بقيمة 300 ريال - باقة ممتازة",
      price: "300.00",
      originalPrice: "350.00",
      durationDays: 30,
      speed: "8 ميجابت/ثانية",
      quotaGB: 60,
      sortOrder: 4,
      color: "#F59E0B",
      isActive: true,
      isFeatured: false,
    },
    {
      name: "باقة 500 ريال",
      code: "PKG-500",
      description: "باقة إنترنت بقيمة 500 ريال - باقة VIP غير محدودة",
      price: "500.00",
      originalPrice: "600.00",
      durationDays: 30,
      speed: "12 ميجابت/ثانية",
      quotaGB: 100,
      sortOrder: 5,
      color: "#EF4444",
      isActive: true,
      isFeatured: true,
    },
  ];

  for (const pkg of defaultPackages) {
    // Check if package already exists
    const existing = await db
      .select()
      .from(packages)
      .where(eq(packages.code, pkg.code));

    if (!existing || existing.length === 0) {
      await db.insert(packages).values(pkg);
      console.log(`Package ${pkg.name} created`);
    } else {
      console.log(`Package ${pkg.name} already exists, skipping`);
    }
  }

  // ─── Seed Default Payment Gateways (Yemeni) ───
  const defaultGateways = [
    {
      name: "جيب",
      code: "jeeb",
      description: "محفظة جيب الإلكترونية اليمنية",
      provider: "Jeeb",
      isActive: true,
      isDefault: true,
      supportsAutoConfirm: false,
      requiresManualConfirm: true,
      sortOrder: 1,
      iconUrl: "",
    },
    {
      name: "فلوسك",
      code: "falosak",
      description: "محفظة فلوسك الإلكترونية",
      provider: "Falosak",
      isActive: true,
      isDefault: false,
      supportsAutoConfirm: false,
      requiresManualConfirm: true,
      sortOrder: 2,
      iconUrl: "",
    },
    {
      name: "ون كاش",
      code: "onecash",
      description: "محفظة ون كاش الإلكترونية",
      provider: "OneCash",
      isActive: true,
      isDefault: false,
      supportsAutoConfirm: false,
      requiresManualConfirm: true,
      sortOrder: 3,
      iconUrl: "",
    },
    {
      name: "جوالي",
      code: "jawali",
      description: "محفظة جوالي الإلكترونية",
      provider: "Jawali",
      isActive: true,
      isDefault: false,
      supportsAutoConfirm: false,
      requiresManualConfirm: true,
      sortOrder: 4,
      iconUrl: "",
    },
    {
      name: "كاش",
      code: "cash",
      description: "الدفع النقدي - يدوي",
      provider: "Manual",
      isActive: true,
      isDefault: false,
      supportsAutoConfirm: false,
      requiresManualConfirm: true,
      sortOrder: 5,
      iconUrl: "",
    },
  ];

  for (const gateway of defaultGateways) {
    const existing = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.code, gateway.code));

    if (!existing || existing.length === 0) {
      await db.insert(paymentGateways).values(gateway);
      console.log(`Payment gateway ${gateway.name} created`);
    } else {
      console.log(`Payment gateway ${gateway.name} already exists, skipping`);
    }
  }

  // ─── Seed Default Settings ───
  const defaultSettings = [
    {
      key: "site_name",
      value: "NetCard Pro",
      group: "general",
      label: "اسم الموقع",
      description: "اسم المتجر الظاهر في الموقع",
      isPublic: true,
    },
    {
      key: "site_logo",
      value: "",
      group: "general",
      label: "شعار الموقع",
      description: "رابط شعار الموقع",
      isPublic: true,
    },
    {
      key: "currency",
      value: "YER",
      group: "general",
      label: "العملة",
      description: "العملة الافتراضية",
      isPublic: true,
    },
    {
      key: "reserve_minutes",
      value: "10",
      group: "orders",
      label: "مدة الحجز (دقائق)",
      description: "مدة حجز الكرت بالدقائق",
      isPublic: false,
    },
    {
      key: "enable_guest_checkout",
      value: "true",
      group: "orders",
      label: "الشراء كزائر",
      description: "تمكين الشراء بدون تسجيل",
      isPublic: true,
    },
    {
      key: "contact_phone",
      value: "",
      group: "contact",
      label: "رقم التواصل",
      description: "رقم الهاتف للتواصل",
      isPublic: true,
    },
    {
      key: "contact_whatsapp",
      value: "",
      group: "contact",
      label: "واتساب",
      description: "رقم واتساب للتواصل",
      isPublic: true,
    },
    {
      key: "theme_primary",
      value: "#3B82F6",
      group: "appearance",
      label: "اللون الرئيسي",
      description: "اللون الرئيسي للموقع",
      isPublic: true,
    },
  ];

  for (const setting of defaultSettings) {
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, setting.key));

    if (!existing || existing.length === 0) {
      await db.insert(settings).values(setting);
      console.log(`Setting ${setting.key} created`);
    } else {
      console.log(`Setting ${setting.key} already exists, skipping`);
    }
  }

  console.log("Seed completed successfully!");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
