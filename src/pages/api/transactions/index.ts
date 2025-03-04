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

// Validation types
import { Decimal } from '@prisma/client/runtime/library'

interface TransactionInput {
  amount: number | Decimal
  type: 'INCOME' | 'EXPENSE'
  category: string
  date: string
  description: string
  tags?: string[]
  notes?: string
}

interface TransactionFilters {
  search?: string
  category?: string
  type?: 'INCOME' | 'EXPENSE' | 'all'
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  const user = req.user
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  // Helper function for structured error logging
  const logError = (error: any, context: string, additionalInfo?: Record<string, any>) => {
    const errorLog = {
      timestamp: new Date().toISOString(),
      path: '/api/transactions',
      context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      userId: user.id,
      requestMethod: req.method,
      ...additionalInfo
    }
    
    console.error('Transaction API Error:', JSON.stringify(errorLog, null, 2))
  }

  try {
    switch (req.method) {
      case 'GET':
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10
        const skip = (page - 1) * limit

        // Parse filters from query parameters
        const filters: TransactionFilters = {
          search: req.query.search as string,
          category: req.query.category as string,
          type: req.query.type as 'INCOME' | 'EXPENSE' | 'all',
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
          maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
        }

        // Build where clause based on filters
        const where: any = {
          userId: user.id,
          status: { not: 'DELETED' },
        }

        // Add search filter
        if (filters.search) {
          where.OR = [
            { description: { contains: filters.search, mode: 'insensitive' } },
            { category: { name: { contains: filters.search, mode: 'insensitive' } } }
          ]
        }

        // Add category filter
        if (filters.category && filters.category !== 'all') {
          where.categoryId = filters.category
        }

        // Add type filter
        if (filters.type && filters.type !== 'all') {
          where.type = filters.type
        }

        // Add date range filter
        if (filters.startDate || filters.endDate) {
          where.date = {}
          if (filters.startDate && filters.startDate !== 'null') {
            where.date.gte = new Date(filters.startDate)
          }
          if (filters.endDate && filters.endDate !== 'null') {
            where.date.lte = new Date(new Date(filters.endDate).setHours(23, 59, 59, 999))
          }
          // If no valid dates are set, remove the date filter
          if (Object.keys(where.date).length === 0) {
            delete where.date
          }
        }

        // Add amount range filter
        if (filters.minAmount || filters.maxAmount) {
          where.amount = {}
          if (filters.minAmount) {
            where.amount.gte = filters.type === 'EXPENSE' ? 
              -Math.abs(filters.minAmount) : 
              filters.minAmount
          }
          if (filters.maxAmount) {
            where.amount.lte = filters.type === 'EXPENSE' ? 
              -Math.abs(filters.maxAmount) : 
              filters.maxAmount
          }
        }

        try {
          // Get total count for pagination
          const total = await prisma.transaction.count({ where })

          // Get sort parameters
          const sortField = (req.query.sortField as string) || 'date'
          const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc'
          
          // Get transactions with pagination and sorting
          const [transactions, stats] = await Promise.all([
            prisma.transaction.findMany({
              where,
              orderBy: {
                [sortField]: sortOrder
              },
              include: {
                category: true,
                tags: true,
              },
              skip,
              take: limit,
            }),
            prisma.transaction.groupBy({
              by: ['type'],
              where,
              _sum: {
                amount: true,
              },
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
            description: t.description || '',
            tags: t.tags || [],
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
          logError(error, 'Error fetching transactions', { filters })
          return res.status(500).json({ 
            error: 'Failed to fetch transactions',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          })
        }

      case 'POST':
        const { amount, type, category, date, description, tags } = req.body

        // Validate required fields
        if (!amount || !type || !category || !date) {
          logError('Missing required fields', 'Validation error', { body: req.body })
          return res.status(400).json({ error: 'Required fields missing' })
        }

        // Validate amount
        const parsedAmount = parseFloat(amount)
        if (isNaN(parsedAmount) || parsedAmount === 0) {
          logError('Invalid amount', 'Validation error', { amount })
          return res.status(400).json({ error: 'Amount must be a non-zero number' })
        }

        // Validate type
        if (!['INCOME', 'EXPENSE'].includes(type)) {
          logError('Invalid transaction type', 'Validation error', { type })
          return res.status(400).json({ error: 'Invalid transaction type' })
        }

        // Validate date
        const parsedDate = new Date(date)
        if (isNaN(parsedDate.getTime())) {
          logError('Invalid date', 'Validation error', { date })
          return res.status(400).json({ error: 'Invalid date' })
        }

        try {
          // First, ensure the category exists
          let categoryRecord = await prisma.category.findFirst({
            where: {
              name: category.toLowerCase(),
              userId: user.id
            }
          })

          if (!categoryRecord) {
            categoryRecord = await prisma.category.create({
              data: {
                name: category.toLowerCase(),
                userId: user.id
              }
            })
          }

          // Handle tags if provided
          let tagConnections = []
          if (tags && Array.isArray(tags) && tags.length > 0) {
            const tagRecords = await Promise.all(
              tags.map(async (tagName) => {
                let tag = await prisma.tag.findFirst({
                  where: {
                    name: tagName.toLowerCase(),
                    userId: user.id
                  }
                })

                if (!tag) {
                  tag = await prisma.tag.create({
                    data: {
                      name: tagName.toLowerCase(),
                      userId: user.id
                    }
                  })
                }

                return tag
              })
            )
            tagConnections = tagRecords.map(tag => ({ id: tag.id }))
          }

          // Create the transaction
          const finalAmount = type === 'EXPENSE' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount)
          
          // Check for potential duplicate transaction within 1 minute
          const existingTransaction = await prisma.transaction.findFirst({
            where: {
              userId: user.id,
              amount: new Decimal(finalAmount),
              type: type as 'INCOME' | 'EXPENSE',
              date: {
                gte: new Date(parsedDate.getTime() - 60000), // 1 minute before
                lte: new Date(parsedDate.getTime() + 60000), // 1 minute after
              },
              description: description || '',
            }
          })

          if (existingTransaction) {
            return res.status(400).json({ 
              error: 'Duplicate transaction',
              message: 'This transaction appears to be a duplicate. Please verify the details.'
            })
          }

          const newTransaction = await prisma.transaction.create({
            data: {
              amount: new Decimal(finalAmount),
              type: type as 'INCOME' | 'EXPENSE',
              date: parsedDate,
              description: description || '',
              category: {
                connect: { id: categoryRecord.id }
              },
              user: {
                connect: { id: user.id }
              },
              ...(tagConnections.length > 0 && {
                tags: {
                  connect: tagConnections
                }
              })
            },
            include: {
              category: true,
              tags: true,
            },
          })

          const formattedTransaction = {
            id: newTransaction.id,
            amount: Number(newTransaction.amount),
            type: newTransaction.type,
            category: {
              id: newTransaction.category.id,
              name: newTransaction.category.name,
            },
            date: newTransaction.date,
            description: newTransaction.description || '',
            tags: newTransaction.tags || [],
          }

          return res.status(201).json(formattedTransaction)
        } catch (error) {
          logError(error, 'Error creating transaction', { body: req.body })
          return res.status(500).json({ 
            error: 'Failed to create transaction',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          })
        }

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    logError(error, 'Unhandled error')
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}

export default withAuth(handler)