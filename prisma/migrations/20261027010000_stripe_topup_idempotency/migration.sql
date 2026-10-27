ALTER TABLE "ai_credit_transactions" ADD COLUMN "sourceId" TEXT;
CREATE UNIQUE INDEX "ai_credit_transactions_sourceId_key" ON "ai_credit_transactions"("sourceId");
ALTER TABLE "billing_invoices" ADD COLUMN "stripeCheckoutSessionId" TEXT;
CREATE UNIQUE INDEX "billing_invoices_stripeCheckoutSessionId_key" ON "billing_invoices"("stripeCheckoutSessionId");
