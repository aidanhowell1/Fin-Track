-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "fintrack_schema";

-- CreateEnum
CREATE TYPE "fintrack_schema"."TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "fintrack_schema"."TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "fintrack_schema"."BudgetPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "fintrack_schema"."MoodType" AS ENUM ('VERY_HAPPY', 'HAPPY', 'NEUTRAL', 'SAD', 'STRESSED', 'ANXIOUS', 'BORED');

-- CreateEnum
CREATE TYPE "fintrack_schema"."RecurringPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "fintrack_schema"."GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "fintrack_schema"."GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "fintrack_schema"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "name" TEXT,
    "avatar" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "language" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notifyBudget" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyInApp" BOOLEAN NOT NULL DEFAULT true,
    "notifyThreshold" DOUBLE PRECISION NOT NULL DEFAULT 90.0,
    "totalIncome" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fintrack_schema"."transactions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "fintrack_schema"."TransactionType" NOT NULL,
    "date" TIMESTAMP NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "notes" TEXT,
    "hash" TEXT,
    "status" "fintrack_schema"."TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPeriod" "fintrack_schema"."RecurringPeriod",
    "nextDueDate" TIMESTAMP(3),
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fintrack_schema"."transaction_splits" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "transactionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fintrack_schema"."categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fintrack_schema"."tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fintrack_schema"."budgets" (
    "id" TEXT NOT NULL,
    "monthlyLimit" DECIMAL(10,2) NOT NULL,
    "weeklyLimit" DECIMAL(10,2),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "periodType" "fintrack_schema"."BudgetPeriod" NOT NULL DEFAULT 'MONTHLY',
    "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fintrack_schema"."mood_logs" (
    "id" TEXT NOT NULL,
    "mood" "fintrack_schema"."MoodType" NOT NULL,
    "intensity" INTEGER NOT NULL DEFAULT 5,
    "notes" TEXT,
    "date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hideTutorial" BOOLEAN NOT NULL DEFAULT false,
    "customMood" TEXT,
    "userId" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "mood_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fintrack_schema"."audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fintrack_schema"."goals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL(10,2) NOT NULL,
    "currentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "description" TEXT,
    "priority" "fintrack_schema"."GoalPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "fintrack_schema"."GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "autoAllocate" BOOLEAN NOT NULL DEFAULT false,
    "allocateAmount" DECIMAL(10,2),
    "allocateType" TEXT,
    "categoryId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fintrack_schema"."goal_transactions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "goalId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fintrack_schema"."_TagToTransaction" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TagToTransaction_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "fintrack_schema"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_hash_key" ON "fintrack_schema"."transactions"("hash");

-- CreateIndex
CREATE INDEX "transactions_userId_date_idx" ON "fintrack_schema"."transactions"("userId", "date");

-- CreateIndex
CREATE INDEX "transactions_userId_type_idx" ON "fintrack_schema"."transactions"("userId", "type");

-- CreateIndex
CREATE INDEX "transactions_userId_categoryId_idx" ON "fintrack_schema"."transactions"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "transactions_hash_idx" ON "fintrack_schema"."transactions"("hash");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "fintrack_schema"."transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_userId_key" ON "fintrack_schema"."categories"("name", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_userId_key" ON "fintrack_schema"."tags"("name", "userId");

-- CreateIndex
CREATE INDEX "mood_logs_date_idx" ON "fintrack_schema"."mood_logs"("date");

-- CreateIndex
CREATE INDEX "mood_logs_transactionId_idx" ON "fintrack_schema"."mood_logs"("transactionId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_tableName_idx" ON "fintrack_schema"."audit_logs"("userId", "tableName");

-- CreateIndex
CREATE INDEX "audit_logs_recordId_idx" ON "fintrack_schema"."audit_logs"("recordId");

-- CreateIndex
CREATE INDEX "_TagToTransaction_B_index" ON "fintrack_schema"."_TagToTransaction"("B");

-- AddForeignKey
ALTER TABLE "fintrack_schema"."transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "fintrack_schema"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fintrack_schema"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."transaction_splits" ADD CONSTRAINT "transaction_splits_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "fintrack_schema"."transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."transaction_splits" ADD CONSTRAINT "transaction_splits_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "fintrack_schema"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fintrack_schema"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."tags" ADD CONSTRAINT "tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fintrack_schema"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."budgets" ADD CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "fintrack_schema"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fintrack_schema"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."mood_logs" ADD CONSTRAINT "mood_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fintrack_schema"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."mood_logs" ADD CONSTRAINT "mood_logs_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "fintrack_schema"."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fintrack_schema"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."goals" ADD CONSTRAINT "goals_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "fintrack_schema"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "fintrack_schema"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."goal_transactions" ADD CONSTRAINT "goal_transactions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "fintrack_schema"."goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."goal_transactions" ADD CONSTRAINT "goal_transactions_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "fintrack_schema"."transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."_TagToTransaction" ADD CONSTRAINT "_TagToTransaction_A_fkey" FOREIGN KEY ("A") REFERENCES "fintrack_schema"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fintrack_schema"."_TagToTransaction" ADD CONSTRAINT "_TagToTransaction_B_fkey" FOREIGN KEY ("B") REFERENCES "fintrack_schema"."transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
