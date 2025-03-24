import { NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'

async function calculateBudgetSpending(budget: any, userId: string) {
  if (!budget || !userId) {
    console.error('Invalid budget or userId in calculateBudgetSpending')
    return null
  }

  try {
    const startDate = new Date(budget.startDate)
    const endDate = new Date(budget.endDate)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date range for budget', { budgetId: budget.id })
      return null
    }

    const transactions = await prisma.transaction.aggregate({
      where: {
        userId: userId,
        categoryId: budget.categoryId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        type: 'EXPENSE',
        status: { not: 'DELETED' },
      },
      _sum: {
        amount: true,
      },
    })

    const currentSpending = Math.abs(Number(transactions._sum.amount || 0))
    const monthlyLimit = Number(budget.monthlyLimit)
    const percentageUsed = monthlyLimit > 0 ? (currentSpending / monthlyLimit) * 100 : 0

    return {
      ...budget,
      currentSpending,
      percentageUsed: percentageUsed.toFixed(2),
      remainingAmount: Math.max(0, monthlyLimit - currentSpending),
    }
  } catch (error) {
    console.error('Error in calculateBudgetSpending:', error)
    return null
  }
}

async function checkExistingBudget(userId: string, categoryId: string, startDate: Date, endDate: Date, periodType: string) {
  const existingBudget = await prisma.budget.findFirst({
    where: {
      userId: userId,
      categoryId: categoryId,
      periodType: periodType,
      OR: [
        {
          AND: [
            { startDate: { lte: endDate } },
            { endDate: { gte: startDate } }
          ]
        }
      ]
    }
  })

  return existingBudget
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    switch (req.method) {
      case 'GET':
        const budgets = await prisma.budget.findMany({
          where: {
            userId: req.user.id,
            endDate: {
              gte: new Date() // Only get active or future budgets
            }
          },
          include: {
            category: true,
          },
          orderBy: [
            { startDate: 'asc' },
            { categoryId: 'asc' }
          ],
        })

        // Calculate current spending and percentage for each budget
        const budgetsWithSpending = await Promise.all(
          budgets.map(async (budget) => {
            try {
              const calculatedBudget = await calculateBudgetSpending(budget, req.user.id)
              return calculatedBudget || {
                ...budget,
                currentSpending: 0,
                percentageUsed: "0",
                remainingAmount: Number(budget.monthlyLimit)
              }
            } catch (error) {
              console.error(`Error calculating budget spending for budget ${budget.id}:`, error)
              return {
                ...budget,
                currentSpending: 0,
                percentageUsed: "0",
                remainingAmount: Number(budget.monthlyLimit)
              }
            }
          })
        )

        // Filter out any null values and sort by percentage used
        const validBudgets = budgetsWithSpending
          .filter(budget => budget !== null)
          .sort((a, b) => parseFloat(b.percentageUsed) - parseFloat(a.percentageUsed))

        return res.status(200).json(validBudgets)

      case 'POST':
        const { 
          categoryId, 
          monthlyLimit, 
          startDate, 
          endDate, 
          isRecurring, 
          periodType,
          alertThreshold 
        } = req.body

        if (!categoryId || monthlyLimit === undefined || !startDate || !endDate) {
          return res.status(400).json({ error: 'Required fields missing' })
        }

        const parsedMonthlyLimit = parseFloat(monthlyLimit)
        if (isNaN(parsedMonthlyLimit) || parsedMonthlyLimit <= 0) {
          return res.status(400).json({ error: 'Invalid monthly limit amount' })
        }

        const startDateObj = new Date(startDate)
        const endDateObj = new Date(endDate)

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
          return res.status(400).json({ error: 'Invalid date format' })
        }

        if (startDateObj >= endDateObj) {
          return res.status(400).json({ error: 'End date must be after start date' })
        }

        // Verify that the category belongs to the user
        const category = await prisma.category.findFirst({
          where: {
            id: categoryId,
            userId: req.user.id
          }
        })

        if (!category) {
          return res.status(400).json({ error: 'Invalid category' })
        }

        // Check for existing overlapping budget
        const existingBudget = await checkExistingBudget(
          req.user.id,
          categoryId,
          startDateObj,
          endDateObj,
          periodType || 'MONTHLY'
        )

        if (existingBudget) {
          return res.status(400).json({ 
            error: 'Duplicate budget',
            message: 'A budget already exists for this category and time period'
          })
        }

        const newBudget = await prisma.budget.create({
          data: {
            category: {
              connect: { id: categoryId }
            },
            monthlyLimit: parsedMonthlyLimit,
            startDate: startDateObj,
            endDate: endDateObj,
            isRecurring: isRecurring || false,
            periodType: periodType || 'MONTHLY',
            alertThreshold: parseFloat(alertThreshold) || 80.0,
            user: {
              connect: { id: req.user.id }
            }
          },
          include: {
            category: true,
          },
        })

        // Calculate spending for the new budget
        const budgetWithSpending = await calculateBudgetSpending(newBudget, req.user.id)
        if (!budgetWithSpending) {
          return res.status(500).json({ error: 'Error calculating budget spending' })
        }
        
        return res.status(201).json(budgetWithSpending)

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Budgets API Error:', error)
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}

export default withAuth(handler)