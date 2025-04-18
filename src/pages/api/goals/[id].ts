import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'

// Main API handler for goal operations by ID
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getGoal(req, res)
      case 'PUT':
        return await updateGoal(req, res)
      case 'DELETE':
        return await deleteGoal(req, res)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
    }
  } catch (error) {
    console.error('Goal API Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

// Handler for retrieving a specific goal
async function getGoal(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'Goal ID is required' })
    }

    const goal = await prisma.goal.findUnique({
      where: {
        id: String(id),
      },
      include: {
        category: true,
        transactions: {
          include: {
            transaction: true,
          },
        },
      },
    })

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' })
    }

    return res.status(200).json(goal)
  } catch (error) {
    console.error('Error fetching goal:', error)
    return res.status(500).json({ error: 'Failed to fetch goal' })
  }
}
// Handler for updating a specific goal
async function updateGoal(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query
    const {
      name,
      targetAmount,
      deadline,
      description,
      priority,
      categoryId,
      status,
      autoAllocate,
      allocateAmount,
      allocateType,
    } = req.body

    if (!id) {
      return res.status(400).json({ error: 'Goal ID is required' })
    }

    const goal = await prisma.goal.update({
      where: {
        id: String(id),
      },
      data: {
        name,
        targetAmount,
        deadline: deadline ? new Date(deadline) : null,
        description,
        priority,
        categoryId,
        status,
        autoAllocate,
        allocateAmount,
        allocateType,
      },
      include: {
        category: true,
      },
    })

    return res.status(200).json(goal)
  } catch (error) {
    console.error('Error updating goal:', error)
    return res.status(500).json({ error: 'Failed to update goal' })
  }
}

// Handler for deleting a specific goal
async function deleteGoal(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'Goal ID is required' })
    }

    await prisma.goal.delete({
      where: {
        id: String(id),
      },
    })

    return res.status(204).end()
  } catch (error) {
    console.error('Error deleting goal:', error)
    return res.status(500).json({ error: 'Failed to delete goal' })
  }
}