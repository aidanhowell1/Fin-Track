import { NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

// Validation schema for transaction input
const transactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1),
  date: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: 'Invalid date format'
  }),
  description: z.string().min(1).max(255),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional()
})

// Helper function to generate transaction hash for duplicate prevention
function generateTransactionHash(transaction: z.infer<typeof transactionSchema>, userId: string): string {
  const data = `${userId}:${transaction.amount}:${transaction.type}:${transaction.category}:${transaction.date}:${transaction.description}`
  return createHash('sha256').update(data).digest('hex')
}

// Helper function to handle database errors
const handleDatabaseError = (error: any) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          status: 409,
          error: 'Duplicate transaction detected',
          message: 'This transaction has already been recorded'
        }
      case 'P2025':
        return {
          status: 404,
          error: 'Record not found',
          message: 'The requested resource was not found'
        }
      default:
        return {
          status: 500,
          error: 'Database error',
          message: 'An error occurred while processing your request'
        }
    }
  }
  return {
    status: 500,
    error: 'Unknown error',
    message: error instanceof Error ? error.message : 'An unexpected error occurred'
  }
}

// Helper function for structured error logging
const logError = (error: any, context: string, userId: string, additionalInfo?: Record<string, any>) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    path: '/api/transactions',
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    userId,
    ...additionalInfo
  }
  
  console.error('Transaction API Error:', JSON.stringify(errorLog, null, 2))
  return errorLog
}

// Main API handler function for transactions endpoint
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const user = req.user
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    switch (req.method) {
      case 'GET': {
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10
        const skip = (page - 1) * limit

        // Build where clause based on filters
        const where: Prisma.TransactionWhereInput = {
          userId: user.id,
          status: 'COMPLETED',
          ...(req.query.search && {
            OR: [
              { description: { contains: req.query.search as string, mode: 'insensitive' } },
              { category: { name: { contains: req.query.search as string, mode: 'insensitive' } } }
            ]
          }),
          ...(req.query.category && req.query.category !== 'all' && {
            category: { name: req.query.category as string }
          }),
          ...(req.query.type && req.query.type !== 'all' && { 
            type: req.query.type as 'INCOME' | 'EXPENSE' 
          }),
          ...(req.query.startDate && { 
            date: { gte: new Date(req.query.startDate as string) } 
          }),
          ...(req.query.endDate && {
            date: {
              ...((req.query.startDate && { gte: new Date(req.query.startDate as string) }) || {}),
              lte: new Date(req.query.endDate as string)
            }
          }),
          ...(req.query.minAmount && { 
            amount: { gte: parseFloat(req.query.minAmount as string) } 
          }),
          ...(req.query.maxAmount && {
            amount: {
              ...((req.query.minAmount && { gte: parseFloat(req.query.minAmount as string) }) || {}),
              lte: parseFloat(req.query.maxAmount as string)
            }
          })
        }

        // Get sort parameters
        const sortField = (req.query.sortField as string) || 'date'
        const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc'

        try {
          // Get transactions with pagination and sorting
          const [transactions, total, stats] = await prisma.$transaction([
            prisma.transaction.findMany({
              where,
              orderBy: { [sortField]: sortOrder },
              include: {
                category: true,
                tags: true,
              },
              skip,
              take: limit,
            }),
            prisma.transaction.count({ where }),
            prisma.transaction.groupBy({
              by: ['type'],
              where,
              _sum: { amount: true },
            })
          ])

          // Calculate stats
          const totalIncome = stats.find(s => s.type === 'INCOME')?._sum.amount || 0
          const totalExpenses = stats.find(s => s.type === 'EXPENSE')?._sum.amount || 0

          // Format transactions for the frontend
          const formattedTransactions = transactions.map(t => ({
            id: t.id,
            amount: Number(t.amount),
            type: t.type,
            category: {
              id: t.category.id,
              name: t.category.name,
            },
            date: t.date,
            description: t.description,
            tags: t.tags,
          }))

          return res.status(200).json({
            transactions: formattedTransactions,
            pagination: {
              total,
              pages: Math.ceil(total / limit),
              currentPage: page,
              limit,
            },
            stats: {
              totalIncome: Number(totalIncome),
              totalExpenses: Number(totalExpenses),
              transactionCount: total
            }
          })
        } catch (error) {
          const errorLog = logError(error, 'GET_TRANSACTIONS', user.id, { filters: where })
          return res.status(500).json({
            error: 'Failed to fetch transactions',
            message: 'An error occurred while retrieving transactions',
            details: errorLog
          })
        }
      }

      case 'POST': {
        try {
          // Validate input using Zod schema
          const validatedData = transactionSchema.parse(req.body)
          const { amount, type, category, date, description, notes, tags } = validatedData

          // Generate transaction hash for duplicate prevention
          const transactionHash = generateTransactionHash(validatedData, user.id)

          // Check for existing transaction with the same hash
          const existingTransaction = await prisma.transaction.findUnique({
            where: { hash: transactionHash }
          })

          if (existingTransaction) {
            return res.status(409).json({
              error: 'Duplicate transaction',
              message: 'This exact transaction has already been recorded'
            })
          }

          const parsedDate = new Date(date)
          // Prevent future dates
          if (parsedDate > new Date()) {
            return res.status(400).json({
              error: 'Invalid date',
              message: 'Transaction date cannot be in the future'
            })
          }

          // Start a transaction to ensure data consistency
          const result = await prisma.$transaction(async (tx) => {
            // Get or create category
            let categoryRecord = await tx.category.findFirst({
              where: {
                name: category.toLowerCase(),
                userId: user.id
              }
            })

            if (!categoryRecord) {
              categoryRecord = await tx.category.create({
                data: {
                  name: category.toLowerCase(),
                  userId: user.id
                }
              })
            }

            // Handle tags
            let tagRecords = []
            if (tags && tags.length > 0) {
              tagRecords = await Promise.all(
                tags.map(async (tagName) => {
                  let tag = await tx.tag.findFirst({
                    where: {
                      name: tagName.toLowerCase(),
                      userId: user.id
                    }
                  })

                  if (!tag) {
                    tag = await tx.tag.create({
                      data: {
                        name: tagName.toLowerCase(),
                        userId: user.id
                      }
                    })
                  }

                  return tag
                })
              )
            }

            // Create the transaction
            const finalAmount = type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount)
            const newTransaction = await tx.transaction.create({
              data: {
                amount: finalAmount,
                type,
                date: parsedDate,
                description,
                notes,
                hash: transactionHash,
                status: 'COMPLETED',
                category: {
                  connect: { id: categoryRecord.id }
                },
                user: {
                  connect: { id: user.id }
                },
                ...(tagRecords.length > 0 && {
                  tags: {
                    connect: tagRecords.map(tag => ({ id: tag.id }))
                  }
                })
              },
              include: {
                category: true,
                tags: true,
              },
            })

            // Update user's total income/expenses
            await tx.user.update({
              where: { id: user.id },
              data: {
                totalIncome: {
                  increment: type === 'INCOME' ? amount : 0
                }
              }
            })

            return newTransaction
          })

          // Format the response
          const formattedTransaction = {
            id: result.id,
            amount: Number(result.amount),
            type: result.type,
            category: {
              id: result.category.id,
              name: result.category.name,
            },
            date: result.date,
            description: result.description,
            tags: result.tags,
          }

          return res.status(201).json(formattedTransaction)
        } catch (error) {
          if (error instanceof z.ZodError) {
            return res.status(400).json({
              error: 'Validation error',
              message: 'Invalid input data',
              details: error.errors
            })
          }

          const dbError = handleDatabaseError(error)
          const errorLog = logError(error, 'CREATE_TRANSACTION', user.id, { input: req.body })
          
          return res.status(dbError.status).json({
            error: dbError.error,
            message: dbError.message,
            details: errorLog
          })
        }
      }

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    const errorLog = logError(error, 'GENERAL_ERROR', user.id)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      details: errorLog
    })
  }
}

// Wrap handler with authentication middleware
export default withAuth(handler)