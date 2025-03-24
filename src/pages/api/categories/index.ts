import { NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'

const defaultCategories = [
  { name: 'Groceries', icon: '🛒' },
  { name: 'Rent', icon: '🏠' },
  { name: 'Utilities', icon: '💡' },
  { name: 'Entertainment', icon: '🎮' },
  { name: 'Transportation', icon: '🚗' },
  { name: 'Healthcare', icon: '🏥' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Salary', icon: '💰' },
  { name: 'Investments', icon: '📈' },
  { name: 'Other', icon: '📦' },
]

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  if (req.method === 'GET') {
    try {
      const categories = await prisma.category.findMany({
        where: {
          userId: req.user.id
        },
        orderBy: {
          name: 'asc',
        },
      })

      // If no categories exist, create the default ones for this user
      if (categories.length === 0) {
        await prisma.category.createMany({
          data: defaultCategories.map(cat => ({
            ...cat,
            userId: req.user!.id
          })),
        })
        return res.status(200).json(await prisma.category.findMany({
          where: {
            userId: req.user.id
          },
          orderBy: {
            name: 'asc',
          },
        }))
      }

      return res.status(200).json(categories)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      return res.status(500).json({ error: 'Failed to fetch categories' })
    }
  } else if (req.method === 'POST') {
    try {
      const { name } = req.body

      if (!name) {
        return res.status(400).json({ error: 'Category name is required' })
      }

      const category = await prisma.category.create({
        data: {
          name,
          user: {
            connect: { id: req.user.id }
          }
        },
      })

      return res.status(201).json(category)
    } catch (error) {
      console.error('Failed to create category:', error)
      return res.status(500).json({ error: 'Failed to create category' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)