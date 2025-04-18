import { NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

// Validation schema for transaction updates
const updateTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.string().min(1).optional(),
  date: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: 'Invalid date format'
  }).optional(),
  description: z.string().min(1).max(255).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional()
})

// Helper function for structured error logging
const logError = (error: any, context: string, userId: string, transactionId: string, additionalInfo?: Record<string, any>) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    path: '/api/transactions/[id]',
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    userId,
    transactionId,
    ...additionalInfo
  }
  
  console.error('Transaction API Error:', JSON.stringify(errorLog, null, 2))
  return errorLog
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const user = req.user
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid transaction ID' })
  }

  try {
    // First, verify the transaction exists and belongs to the user
    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: user.id,
        status: { not: 'DELETED' }
      },
      include: {
        category: true,
        tags: true
      }
    })

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    switch (req.method) {
      case 'GET': {
        // Return the transaction details
        return res.status(200).json({
          id: transaction.id,
          amount: Number(transaction.amount),
          type: transaction.type,
          category: {
            id: transaction.category.id,
            name: transaction.category.name,
          },
          date: transaction.date,
          description: transaction.description,
          notes: transaction.notes,
          tags: transaction.tags,
        })
      }

      case 'PUT': {
        try {
          // Validate the update data
          const validatedData = updateTransactionSchema.parse(req.body)
          const { amount, type, category, date, description, notes, tags } = validatedData

          // Start a transaction to ensure data consistency
          const result = await prisma.$transaction(async (tx) => {
            // Handle category update if provided
            let categoryId = transaction.categoryId
            if (category) {
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
              categoryId = categoryRecord.id
            }

            // Handle tags update if provided
            let tagRecords = []
            if (tags) {
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

            // Calculate the new amount if type or amount changes
            let finalAmount = transaction.amount
            if (amount || type) {
              const newAmount = amount || Math.abs(Number(transaction.amount))
              finalAmount = (type || transaction.type) === 'EXPENSE' 
                ? -Math.abs(newAmount) 
                : Math.abs(newAmount)
            }

            // Update the transaction
            const updatedTransaction = await tx.transaction.update({
              where: { id },
              data: {
                amount: finalAmount,
                type: type || undefined,
                date: date ? new Date(date) : undefined,
                description: description || undefined,
                notes: notes || undefined,
                categoryId: categoryId,
                ...(tags && {
                  tags: {
                    set: tagRecords.map(tag => ({ id: tag.id }))
                  }
                })
              },
              include: {
                category: true,
                tags: true,
              },
            })

            // Update user's total income/expenses if necessary
            if (amount || type) {
              const oldAmount = Number(transaction.amount)
              const newAmount = Number(finalAmount)
              const difference = newAmount - oldAmount
              
              if (difference !== 0) {
                await tx.user.update({
                  where: { id: user.id },
                  data: {
                    totalIncome: {
                      increment: difference
                    }
                  }
                })
              }
            }

            return updatedTransaction
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
            notes: result.notes,
            tags: result.tags,
          }

          return res.status(200).json(formattedTransaction)
        } catch (error) {
          if (error instanceof z.ZodError) {
            return res.status(400).json({
              error: 'Validation error',
              message: 'Invalid input data',
              details: error.errors
            })
          }

          const errorLog = logError(error, 'UPDATE_TRANSACTION', user.id, id, { input: req.body })
          return res.status(500).json({
            error: 'Failed to update transaction',
            message: 'An error occurred while updating the transaction',
            details: errorLog
          })
        }
      }

      case 'DELETE': {
        try {
          // Soft delete the transaction by updating its status
          await prisma.$transaction(async (tx) => {
            await tx.transaction.update({
              where: { id },
              data: { status: 'DELETED' }
            })

            // Update user's total income/expenses
            const amount = Number(transaction.amount)
            if (amount !== 0) {
              await tx.user.update({
                where: { id: user.id },
                data: {
                  totalIncome: {
                    decrement: amount
                  }
                }
              })
            }
          })

          return res.status(200).json({ message: 'Transaction deleted successfully' })
        } catch (error) {
          const errorLog = logError(error, 'DELETE_TRANSACTION', user.id, id)
          return res.status(500).json({
            error: 'Failed to delete transaction',
            message: 'An error occurred while deleting the transaction',
            details: errorLog
          })
        }
      }

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    const errorLog = logError(error, 'GENERAL_ERROR', user.id, id)
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      details: errorLog
    })
  }
}

// Wrap handler with authentication middleware
export default withAuth(handler)