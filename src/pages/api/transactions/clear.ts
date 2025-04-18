import { NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'

// Main API handler function for clearing transactions
async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  const user = req.user
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  // Only allow DELETE method
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    // Delete all transactions for the user
    await prisma.transaction.deleteMany({
      where: {
        userId: user.id
      }
    })

    return res.status(200).json({ message: 'All transactions cleared successfully' })
  } catch (error) {
    console.error('Error clearing transactions:', error)
    return res.status(500).json({ 
      error: 'Failed to clear transactions',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}

// Wrap handler with authentication middleware
export default withAuth(handler)