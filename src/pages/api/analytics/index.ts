import { NextApiResponse } from 'next'
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth'
import prisma from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export default withAuth(async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Helper function for structured error logging
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
    }
    console.error('Analytics API Error:', JSON.stringify(errorLog, null, 2))
    return errorLog
  }

  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
    
    // Extract and verify JWT token
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

    // Get the period from query and calculate the startDate using period (in months)
    const period = parseInt(req.query.period as string) || 6;
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - period + 1, 1);

    // Filter transactions by the authenticated user's ID.
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.user!.id, // Only one filter for userId now
        date: {
          gte: startDate,
        },
        status: 'COMPLETED', // Only completed transactions
      },
      include: {
        category: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Process monthly data
    const monthlyStats: { [key: string]: { name: string, income: number, expenses: number } } = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize all months in the period with zero values
    for (let i = 0; i < period; i++) {
      const monthIndex = (today.getMonth() - period + 1 + i + 12) % 12;
      const monthName = months[monthIndex];
      monthlyStats[monthName] = {
        name: monthName,
        income: 0,
        expenses: 0
      };
    }

    // Fill in actual transaction data
    transactions.forEach(transaction => {
      const monthName = transaction.date.toLocaleString('en-US', { month: 'short' });
      const amount = Number(transaction.amount);
      
      if (transaction.type === 'INCOME') {
        monthlyStats[monthName].income += amount;
      } else if (transaction.type === 'EXPENSE') {
        monthlyStats[monthName].expenses += Math.abs(amount);
      }
    });

    // Convert to array and sort by month order
    const currentMonthIndex = today.getMonth();
    const sortedMonthlyData = Object.values(monthlyStats).sort((a, b) => {
      const aIndex = (months.indexOf(a.name) - currentMonthIndex + 12) % 12;
      const bIndex = (months.indexOf(b.name) - currentMonthIndex + 12) % 12;
      return aIndex - bIndex;
    });

    // Process category data for expenses
    const categoryStats: { [key: string]: { total: number, name: string } } = {};
    transactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(transaction => {
        const categoryName = transaction.category?.name || 'Other';
        if (!categoryStats[categoryName]) {
          categoryStats[categoryName] = {
            name: categoryName,
            total: 0
          };
        }
        categoryStats[categoryName].total += Math.abs(Number(transaction.amount));
      });

    // Define a color palette for categories
    const colors = [
      '#0ea5e9', // blue
      '#f43f5e', // red
      '#8b5cf6', // purple
      '#10b981', // green
      '#f59e0b', // yellow
      '#ec4899', // pink
      '#6366f1', // indigo
      '#84cc16', // lime
      '#14b8a6', // teal
      '#f97316'  // orange
    ];

    const formattedCategoryData = Object.values(categoryStats)
      .map((category, index) => ({
        name: category.name,
        value: category.total,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 categories

    // Calculate totals for the period
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

    return res.status(200).json({
      monthlyData: sortedMonthlyData,
      categoryData: formattedCategoryData,
      totals: {
        income: totals.totalIncome,
        expenses: totals.totalExpenses,
        balance: totals.totalIncome - totals.totalExpenses
      }
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
