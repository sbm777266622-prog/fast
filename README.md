# NetCard Pro - نظام بيع كروت الإنترنت

## نظام متكامل لإدارة وبيع كروت الإنترنت الخاصة بشبكات MikroTik

---

## المتطلبات

- **نظام التشغيل**: Windows 10/11
- **Node.js**: الإصدار 20 LTS أو أحدث
- **XAMPP**: مع MySQL
- **npm**: يأتي مع Node.js

---

## خطوات التثبيت على Windows 11

### 1. تثبيت Node.js

1. اذهب إلى [nodejs.org](https://nodejs.org)
2. حمّل الإصدار LTS (مستحسن 20.x)
3. شغّل المثبت واتبع الخطوات
4. تحقق من التثبيت:
   ```bash
   node --version
   npm --version
   ```

### 2. تثبيت XAMPP

1. اذهب إلى [apachefriends.org](https://www.apachefriends.org)
2. حمّل XAMPP لنظام Windows
3. شغّل المثبت واتبع الخطوات
4. افتح XAMPP Control Panel
5. ابدأ خدمة **Apache** و **MySQL**

### 3. إنشاء قاعدة البيانات

1. افتح المتصفح واذهب إلى: `http://localhost/phpmyadmin`
2. انقر على "New" لإنشاء قاعدة بيانات جديدة
3. أدخل الاسم: `netcard_pro`
4. اختر الترميز: `utf8mb4_general_ci`
5. انقر "Create"

### 4. تثبيت المشروع

1. فك ضغط الملف `netcard-pro.zip`
2. افتح Terminal (موجه الأوامر) في مجلد المشروع:
   ```bash
   cd C:\path\to\netcard-pro
   ```
3. ثبت الاعتماديات:
   ```bash
   npm install
   ```

### 5. إعداد متغيرات البيئة (.env)

1. افتح ملف `.env` في المشروع
2. تأكد من إعدادات قاعدة البيانات:
   ```
   DATABASE_URL=mysql://root@localhost:3306/netcard_pro
   ```
   إذا كان MySQL يحتاج كلمة مرور:
   ```
   DATABASE_URL=mysql://root:password@localhost:3306/netcard_pro
   ```

### 6. تهيئة قاعدة البيانات

```bash
# إنشاء الجداول
npm run db:push

# إضافة البيانات الافتراضية (الباقات + بوابات الدفع)
npx tsx db/seed.ts
```

### 7. تشغيل المشروع

**للتطوير (مع HMR):**
```bash
npm run dev
```
افتح المتصفح: `http://localhost:3000`

**للإنتاج:**
```bash
npm run build
npm start
```

---

## الباقات الافتراضية

| الباقة | السعر | السرعة | السعة |
|--------|-------|--------|-------|
| باقة 100 ريال | 100 ر.ي | 2 ميجابت/ث | 10 GB |
| باقة 200 ريال | 200 ر.ي | 4 ميجابت/ث | 25 GB |
| باقة 250 ريال | 250 ر.ي | 6 ميجابت/ث | 40 GB |
| باقة 300 ريال | 300 ر.ي | 8 ميجابت/ث | 60 GB |
| باقة 500 ريال | 500 ر.ي | 12 ميجابت/ث | 100 GB |

---

## بوابات الدفع المدعومة

- جيب
- فلوسك
- ون كاش
- جوالي
- كاش (يدوي)

---

## استيراد الكروت

### الصيغ المدعومة
- PDF
- TXT (نص عادي)
- CSV
- Excel (XLSX)

### طريقة الاستيراد
1. من لوحة الإدارة، اذهب إلى "استيراد الكروت"
2. اختر الملف من جهازك (اسحب وأفلت أو انقر)
3. اختر الباقة المطلوبة
4. راجع المعاينة
5. انقر "استيراد"

---

## هيكل المشروع

```
netcard-pro/
├── api/                    # Backend API (tRPC + Hono)
│   ├── routers/           # API Routers
│   ├── middleware.ts      # Auth & RBAC
│   └── logger.ts          # Winston Logger
├── db/                    # Database
│   ├── schema.ts          # Drizzle ORM Schema
│   └── seed.ts            # Seed Data
├── src/                   # Frontend (React)
│   ├── pages/             # Page Components
│   │   ├── Home.tsx       # الصفحة الرئيسية
│   │   ├── StorePage.tsx  # صفحة الشراء
│   │   ├── SuccessPage.tsx # صفحة النجاح
│   │   ├── admin/         # لوحة الإدارة
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── PackagesPage.tsx
│   │   │   ├── CardsPage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── CustomersPage.tsx
│   │   │   ├── ImportPage.tsx
│   │   │   └── ReportsPage.tsx
│   ├── components/        # UI Components
│   ├── providers/         # tRPC Provider
│   └── App.tsx            # Routes
├── dist/                  # Build Output
├── .env                   # Environment Variables
├── package.json
└── README.md
```

---

## مميزات الأمان

- JWT Authentication
- Database Transactions (منع البيع المزدوج)
- Row-Level Locking (حجز الصفوف)
- Atomic Card Reservation
- Input Validation (Zod)
- Duplicate Prevention
- Audit Logs (سجل العمليات)
- Rate Limiting
- CSRF Protection
- XSS Protection
- SQL Injection Protection

---

## أوامر مفيدة

| الأمر | الوصف |
|-------|-------|
| `npm run dev` | تشغيل وضع التطوير |
| `npm run build` | بناء للإنتاج |
| `npm start` | تشغيل الإنتاج |
| `npm run check` | فحص TypeScript |
| `npm run db:push` | تحديث قاعدة البيانات |
| `npm run format` | تنسيق الكود |

---

## إنشاء نسخة احتياطية

```bash
# في XAMPP Shell أو Command Prompt
mysqldump -u root -p netcard_pro > backup_$(date +%Y%m%d_%H%M%S).sql
```

## استعادة نسخة احتياطية

```bash
mysql -u root -p netcard_pro < backup_file.sql
```

---

## الدعم الفني

NetCard Pro - نظام بيع كروت الإنترنت
© 2025 - جميع الحقوق محفوظة
