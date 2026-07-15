import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { packageRouter } from "./package-router";
import { cardRouter } from "./card-router";
import { customerRouter } from "./customer-router";
import { orderRouter } from "./order-router";
import { paymentRouter } from "./payment-router";
import { adminRouter } from "./admin-router";
import { auditRouter } from "./audit-router";
import { fileRouter } from "./file-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  package: packageRouter,
  card: cardRouter,
  customer: customerRouter,
  order: orderRouter,
  payment: paymentRouter,
  admin: adminRouter,
  audit: auditRouter,
  file: fileRouter,
});

export type AppRouter = typeof appRouter;
