import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // <-- Added import

// Helper function to handle errors
const handleError = (error: any, res: NextApiResponse) => {
  console.error('API Error:', error);
  return res.status(500).json({ 
    error: 'Internal Server Error',
    details: error.message 
  });
};

// Helper function to get date ranges in UTC
const getDateRanges = () => {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  return { today, tomorrow, sevenDaysAgo, thirtyDaysAgo };
};

const logError = (error: any, context: string) => {
  console.error(`Mood API Error [${context}]:`, {
    message: error.message,
    stack: error.stack,
    cause: error.cause
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        console.log('Fetching mood logs with transactions...');
        
        const { today, tomorrow, sevenDaysAgo, thirtyDaysAgo } = getDateRanges();

        // Get today's entries count
        const todayEntriesCount = await prisma.moodLog.count({
          where: {
            date: {
              gte: today,
              lt: tomorrow,
            },
          },
        });

        // Get last 30 days of mood logs with transactions
        const recentMoodLogs = await prisma.moodLog.findMany({
          where: {
            date: {
              gte: thirtyDaysAgo,
            },
            userId: req.user?.id, // Add user filtering
          },
          orderBy: {
            date: 'desc',
          },
          include: {
            transaction: {
              select: {
                amount: true,
                type: true,
                category: {
                  select: {
                    name: true
                  }
                },
              },
            },
          },
        });

        // Get historical weekly data
        const historicalWeeks = await prisma.$queryRaw(Prisma.sql`
          WITH weeks AS (
            SELECT 
              date_trunc('week', m.date) as week_start,
              date_trunc('week', m.date) + interval '6 days' as week_end,
              AVG(CAST(m.intensity AS FLOAT)) as avg_mood,
              COUNT(*) as entry_count,
              COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN ABS(CAST(t.amount AS FLOAT)) ELSE 0 END), 0) as total_spending
            FROM "fintrack_schema"."mood_logs" m
            LEFT JOIN "fintrack_schema"."transactions" t ON m."transactionId" = t.id
            WHERE m.date >= ${thirtyDaysAgo}
              AND m."userId" = ${req.user?.id}
              AND (t.id IS NULL OR t."userId" = ${req.user?.id})
            GROUP BY date_trunc('week', m.date)
            ORDER BY week_start DESC
            LIMIT 12
          )
          SELECT * FROM weeks;
        `);

        // Process the data for visualizations with proper date handling
        const processedData = recentMoodLogs.map(log => ({
          id: log.id,
          date: log.date.toISOString(),
          mood: log.mood,
          intensity: log.intensity,
          notes: log.notes,
          transactionAmount: log.transaction ? Math.abs(Number(log.transaction.amount)) : 0,
          transactionType: log.transaction?.type || null,
          category: log.transaction?.category?.name || null,
        }));

        // Calculate mood distribution for the last 30 days
        const moodDistribution = recentMoodLogs.reduce((acc, log) => {
          acc[log.mood] = (acc[log.mood] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Calculate spending correlation for the last 30 days
        const spendingCorrelation = recentMoodLogs.reduce((acc, log) => {
          if (log.transaction && log.transaction.type === 'EXPENSE') {
            if (!acc[log.mood]) {
              acc[log.mood] = { totalSpent: 0, count: 0 };
            }
            acc[log.mood].totalSpent += Math.abs(Number(log.transaction.amount));
            acc[log.mood].count += 1;
          }
          return acc;
        }, {} as Record<string, { totalSpent: number; count: number }>);

        // Process historical weeks data
        const processedHistoricalWeeks = (historicalWeeks as any[]).map((week) => ({
          weekStart: week.week_start.toISOString(),
          weekEnd: week.week_end.toISOString(),
          averageMood: parseFloat(week.avg_mood.toFixed(2)),
          entryCount: parseInt(week.entry_count),
          totalSpending: parseFloat(week.total_spending.toFixed(2)),
        }));

        console.log('Successfully processed mood analytics data');

        return res.status(200).json({
          timelineData: processedData,
          moodDistribution,
          spendingCorrelation,
          dailyEntriesCount: todayEntriesCount,
          historicalWeeks: processedHistoricalWeeks,
          serverTime: new Date().toISOString(),
        });

      case 'POST':
        console.log('Creating new mood log...');
        
        const { mood, intensity, notes, transactionId } = req.body;

        if (!mood || !intensity) {
          console.error('Missing required fields in mood log creation');
          return res.status(400).json({ 
            error: 'Missing required fields',
            details: {
              mood: !mood ? 'Mood is required' : null,
              intensity: !intensity ? 'Intensity is required' : null,
            }
          });
        }

        if (intensity < 1 || intensity > 10) {
          console.error(`Invalid intensity value: ${intensity}`);
          return res.status(400).json({ 
            error: 'Invalid intensity value',
            details: 'Intensity must be between 1 and 10'
          });
        }

        const { today: todayStart, tomorrow: todayEnd } = getDateRanges();

        const existingMoodLogs = await prisma.moodLog.count({
          where: {
            date: {
              gte: todayStart,
              lt: todayEnd,
            },
          },
        });

        if (existingMoodLogs >= 3) {
          console.error('Maximum mood logs for today reached');
          return res.status(400).json({ 
            error: 'Maximum mood logs reached',
            details: 'You can only log your mood 3 times per day'
          });
        }

        const now = new Date();
        const newMoodLog = await prisma.moodLog.create({
          data: {
            mood,
            intensity,
            notes,
            transactionId,
            date: now,
            createdAt: now,
            updatedAt: now,
          },
        });

        console.log(`Successfully created mood log with ID: ${newMoodLog.id} at ${now.toISOString()}`);

        return res.status(201).json({
          ...newMoodLog,
          serverTime: now.toISOString(),
        });

      case 'DELETE':
        console.log('Deleting all mood logs...');
        
        await prisma.moodLog.deleteMany({});
        
        console.log('Successfully deleted all mood logs');
        
        return res.status(200).json({ message: 'All mood logs deleted successfully' });

      default:
        console.log(`Method ${req.method} not allowed`);
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Mood API Error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
