import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'

// Main API handler for budget operations by ID
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
	// Extract budget ID from query parameters
  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid budget ID' })
  }
  // Handle PUT request to update a budget
  if (req.method === 'PUT') {
    try {
      const { categoryId, monthlyLimit, startDate, endDate } = req.body

      if (!categoryId || !monthlyLimit || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required fields' })
      }
	  // Update budget in the database
      const budget = await prisma.budget.update({
        where: { id },
        data: {
          categoryId,
          monthlyLimit: parseFloat(monthlyLimit),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
        include: {
          category: true,
        },
      })

      return res.status(200).json(budget)
    } catch (error) {
      console.error('Failed to update budget:', error)
      return res.status(500).json({ error: 'Failed to update budget' })
    }
	// Handle DELETE request to remove a budget
  } else if (req.method === 'DELETE') {
    try {
      await prisma.budget.delete({
        where: { id },
      })

      return res.status(204).end()
    } catch (error) {
      console.error('Failed to delete budget:', error)
      return res.status(500).json({ error: 'Failed to delete budget' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}