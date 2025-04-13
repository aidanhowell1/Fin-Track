import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '../../../lib/withAuth';


export default withAuth(async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Structured error logging helper
  const logError = (error: any, context: string) => {
    const errorLog = {
      timestamp: new Date().toISOString(),
      path: '/api/analytics',
      context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      requestMethod: req.method,
    };
    console.error('Analytics API Error:', JSON.stringify(errorLog, null, 2));
    return errorLog;
  };

  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // --- JWT Extraction & Verification ---
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const errorLog = logError('Missing or invalid Authorization header', 'AUTHENTICATION');
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token', details: errorLog });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'JWT_SECRET') as { userId: string };
      userId = decoded.userId;
    } catch (err) {
      const errorLog = logError(err, 'TOKEN_VERIFICATION');
      return res.status(401).json({ error: 'Unauthorized: Invalid token', details: errorLog });
    }
    if (!userId) {
      const errorLog = logError('User ID not found in token', 'AUTHENTICATION');
      return res.status(401).json({ error: 'Unauthorized: User not authenticated', details: errorLog });
    }

    // --- Calculate Date Range ---
    const period = parseInt(req.query.period as string) || 6;
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - period + 1, 1);

    // --- Query Transactions ---
    // Note: We filter on the authenticated user's ID (as set by your withAuth middleware)
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.user!.id,
        date: { gte: startDate },
        status: 'COMPLETED',
      },
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    // --- Process Monthly Statistics ---
    const monthlyStats: { [key: string]: { name: string, income: number, expenses: number } } = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < period; i++) {
      const monthIndex = (today.getMonth() - period + 1 + i + 12) % 12;
      const monthName = months[monthIndex];
      monthlyStats[monthName] = { name: monthName, income: 0, expenses: 0 };
    }
    transactions.forEach(transaction => {
      const monthName = transaction.date.toLocaleString('en-US', { month: 'short' });
      const amount = Number(transaction.amount);
      if (transaction.type === 'INCOME') {
        monthlyStats[monthName].income += amount;
      } else if (transaction.type === 'EXPENSE') {
        monthlyStats[monthName].expenses += Math.abs(amount);
      }
    });
    const currentMonthIndex = today.getMonth();
    const sortedMonthlyData = Object.values(monthlyStats).sort((a, b) => {
      const aIndex = (months.indexOf(a.name) - currentMonthIndex + 12) % 12;
      const bIndex = (months.indexOf(b.name) - currentMonthIndex + 12) % 12;
      return aIndex - bIndex;
    });

    // --- Process Category Data ---
    const categoryStats: { [key: string]: { total: number, name: string } } = {};
    transactions.filter(t => t.type === 'EXPENSE').forEach(transaction => {
      const categoryName = transaction.category?.name || 'Other';
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = { name: categoryName, total: 0 };
      }
      categoryStats[categoryName].total += Math.abs(Number(transaction.amount));
    });
    const colors = [
      '#0ea5e9', '#f43f5e', '#8b5cf6', '#10b981', '#f59e0b',
      '#ec4899', '#6366f1', '#84cc16', '#14b8a6', '#f97316'
    ];
    const formattedCategoryData = Object.values(categoryStats)
      .map((category, index) => ({
        name: category.name,
        value: category.total,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // --- Calculate Totals ---
    const totals = transactions.reduce(
      (acc, t) => {
        const amount = Number(t.amount);
        if (t.type === 'INCOME') {
          acc.totalIncome += amount;
        } else if (t.type === 'EXPENSE') {
          acc.totalExpenses += Math.abs(amount);
        }
        return acc;
      },
      { totalIncome: 0, totalExpenses: 0 }
    );

    // --- Historical Weeks Query ---
    // Note: Using fully qualified table names – update these if your actual schema differs.
    const historicalWeeks = await prisma.$queryRaw`
      WITH weeks AS (
        SELECT 
          date_trunc('week', m.date) as week_start,
          date_trunc('week', m.date) + interval '6 days' as week_end,
          AVG(CAST(m.intensity AS FLOAT)) as avg_mood,
          COUNT(*) as entry_count,
          COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN ABS(CAST(t.amount AS FLOAT)) ELSE 0 END), 0) as total_spending
        FROM "fintrack_schema"."mood_logs" m
        LEFT JOIN "fintrack_schema"."transactions" t ON m."transactionId" = t.id
        WHERE m.date >= ${startDate}
          AND m."userId" = ${req.user!.id}
          AND (t.id IS NULL OR t."userId" = ${req.user!.id})
        GROUP BY date_trunc('week', m.date)
        ORDER BY week_start DESC
        LIMIT 12
      )
      SELECT * FROM weeks;
    `;
    const processedHistoricalWeeks = (historicalWeeks as any[]).map(week => ({
      weekStart: week.week_start.toISOString(),
      weekEnd: week.week_end.toISOString(),
      averageMood: parseFloat(week.avg_mood.toFixed(2)),
      entryCount: parseInt(week.entry_count),
      totalSpending: parseFloat(week.total_spending.toFixed(2)),
    }));

    return res.status(200).json({
      monthlyData: sortedMonthlyData,
      categoryData: formattedCategoryData,
      totals: {
        income: totals.totalIncome,
        expenses: totals.totalExpenses,
        balance: totals.totalIncome - totals.totalExpenses,
      },
      historicalWeeks: processedHistoricalWeeks,
    });

  } catch (error) {
    const errorLog = logError(error, 'Error fetching analytics data');
    return res.status(500).json({
      error: 'Failed to fetch analytics data',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: errorLog
    });
  }
});
