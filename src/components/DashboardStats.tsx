import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon, DollarSign } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast";

interface StatsCardProps {
  title: string;
  value: string;
  type?: 'income' | 'expense' | 'balance';
  currency: string;
  trend?: number;
}

function StatsCard({ title, value, type, currency, trend }: StatsCardProps) {
  const getIcon = () => {
    switch (type) {
      case 'income':
        return <ArrowUpIcon className="h-5 w-5 text-emerald-400" />;
      case 'expense':
        return <ArrowDownIcon className="h-5 w-5 text-rose-400" />;
      default:
        return <DollarSign className="h-5 w-5 text-blue-400" />;
    }
  };

  const getGradient = () => {
    switch (type) {
      case 'income':
        return 'from-emerald-500/20 to-emerald-500/5';
      case 'expense':
        return 'from-rose-500/20 to-rose-500/5';
      default:
        return 'from-blue-500/20 to-blue-500/5';
    }
  };

  const getGlow = () => {
    switch (type) {
      case 'income':
        return 'shadow-emerald-500/20';
      case 'expense':
        return 'shadow-rose-500/20';
      default:
        return 'shadow-blue-500/20';
    }
  };

  const formatCurrency = (value: string, currency: string) => {
    const numericValue = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericValue);
  };

  return (
    <Card className={cn(
      "glass-panel relative overflow-hidden transition-all-smooth hover:translate-y-[-4px]",
      "bg-gradient-to-br",
      getGradient(),
      "shadow-lg",
      getGlow()
    )}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "rounded-lg p-2 glass-effect",
              type === 'income' && "bg-emerald-500/10",
              type === 'expense' && "bg-rose-500/10",
              type === 'balance' && "bg-blue-500/10"
            )}>
              {getIcon()}
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          </div>
          {trend !== undefined && (
            <div className={cn(
              "text-sm font-medium",
              trend > 0 ? "text-emerald-400" : "text-rose-400"
            )}>
              {trend > 0 ? "+" : ""}{trend}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className={cn(
            "text-3xl font-bold tracking-tight transition-colors",
            type === 'income' && "text-emerald-400",
            type === 'expense' && "text-rose-400",
            type === 'balance' && "text-blue-400"
          )}>
            {formatCurrency(value, currency)}
          </p>
        </div>
      </div>
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-1",
        "bg-gradient-to-r from-transparent via-current to-transparent opacity-25",
        type === 'income' && "text-emerald-400",
        type === 'expense' && "text-rose-400",
        type === 'balance' && "text-blue-400"
      )} />
    </Card>
  );
}

interface DashboardStatsProps {
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
}

export function DashboardStats({ totalIncome, totalExpenses, transactionCount }: DashboardStatsProps) {
  const balance = totalIncome + totalExpenses; // expenses are negative

  return (
    <div className="grid gap-4 md:grid-cols-3 animate-slide-in">
      <StatsCard
        title="Total Income"
        value={totalIncome.toString()}
        type="income"
        currency="USD"
      />
      <StatsCard
        title="Total Expenses"
        value={Math.abs(totalExpenses).toString()}
        type="expense"
        currency="USD"
      />
      <StatsCard
        title="Current Balance"
        value={balance.toString()}
        type="balance"
        currency="USD"
      />
    </div>
  );
}