import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getGoals(req, res)
      case 'POST':
        return await createGoal(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
    }
  } catch (error) {
    console.error('Goals API Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function getGoals(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get all goals without user filtering for now
    const goals = await prisma.goal.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Map the goals to include calculated currentAmount
    const goalsWithCurrentAmount = goals.map(goal => ({
      ...goal,
      currentAmount: 0, // For now, we'll set it to 0 since we don't have transactions yet
      targetAmount: parseFloat(goal.targetAmount.toString()), // Convert Decimal to number
    }))

    console.log('Fetched goals:', goalsWithCurrentAmount) // Add logging for debugging
    return res.status(200).json(goalsWithCurrentAmount)
  } catch (error) {
    console.error('Error fetching goals:', error)
    return res.status(500).json({ error: 'Failed to fetch goals' })
  }
}

async function createGoal(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      name,
      targetAmount,
      deadline,
      description,
      priority,
      categoryId,
      autoAllocate,
      allocateAmount,
      allocateType,
    } = req.body

    if (!name || !targetAmount) {
      return res.status(400).json({ error: 'Name and target amount are required' })
    }

    // Create a default user if it doesn't exist
    let user = await prisma.user.findFirst()
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'default@example.com',
          password: 'default-password',
          name: 'Default User',
        },
      })
    }

    const goal = await prisma.goal.create({
      data: {
        name,
        targetAmount: parseFloat(targetAmount),
        deadline: deadline ? new Date(deadline) : null,
        description,
        priority: priority || 'MEDIUM',
        categoryId,
        userId: user.id,
        autoAllocate: autoAllocate || false,
        allocateAmount: allocateAmount ? parseFloat(allocateAmount) : null,
        allocateType,
      },
    })

    // Add currentAmount for consistency with the get endpoint
    const goalWithCurrentAmount = {
      ...goal,
      currentAmount: 0,
      targetAmount: parseFloat(goal.targetAmount.toString()),
    }

    console.log('Created goal:', goalWithCurrentAmount) // Add logging for debugging
    return res.status(201).json(goalWithCurrentAmount)
  } catch (error) {
    console.error('Error creating goal:', error)
    return res.status(500).json({ error: 'Failed to create goal' })
  }
}