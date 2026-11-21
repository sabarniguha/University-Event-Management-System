-- A short ID printed on each exported report so anyone can check it is genuine. Purely additive.
CREATE TABLE "ReportSeal" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "figures" JSONB NOT NULL,
    "userId" INTEGER,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportSeal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportSeal_code_key" ON "ReportSeal"("code");
