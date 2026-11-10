-- Track each deposit made toward a savings goal.
CREATE TABLE "SavingsContribution" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goalId" TEXT NOT NULL,

    CONSTRAINT "SavingsContribution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SavingsContribution_goalId_createdAt_idx"
ON "SavingsContribution"("goalId", "createdAt");

ALTER TABLE "SavingsContribution"
ADD CONSTRAINT "SavingsContribution_goalId_fkey"
FOREIGN KEY ("goalId") REFERENCES "SavingsGoal"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
