import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    const { goalId, transactionId, amount } = req.body

    if (!goalId || !transactionId || !amount) {
      return res.status(400).json({ error: 'Goal ID, transaction ID, and amount are required' })
    }

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // Get the goal and check if it exists
      const goal = await prisma.goal.findUnique({
        where: { id: goalId },
      })

      if (!goal) {
        throw new Error('Goal not found')
      }

      // Get the transaction and check if it exists
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      })

      if (!transaction) {
        throw new Error('Transaction not found')
      }

      // Create the goal transaction
      const goalTransaction = await prisma.goalTransaction.create({
        data: {
          goalId,
          transactionId,
          amount,
        },
      })

      // Update the goal's current amount
      const updatedGoal = await prisma.goal.update({
        where: { id: goalId },
        data: {
          currentAmount: {
            increment: amount,
          },
        },
        include: {
          category: true,
        },
      })

      // Check if the goal is completed
      if (updatedGoal.currentAmount >= updatedGoal.targetAmount) {
        await prisma.goal.update({
          where: { id: goalId },
          data: {
            status: 'COMPLETED',
          },
        })
      }

      return {
        goalTransaction,
        updatedGoal,
      }
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error allocating transaction to goal:', error)
    return res.status(500).json({ 
      error: 'Failed to allocate transaction to goal',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}