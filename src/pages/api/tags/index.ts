import { NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'

// Main API handler function for tags endpoint
async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
	// Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        const tags = await prisma.tag.findMany({
          where: {
            userId: req.user.id
          }
        })
        return res.status(200).json(tags)

      case 'POST':
        const { name } = req.body
        
        if (!name) {
          return res.status(400).json({ error: 'Name is required' })
        }

        // Check if tag already exists for this user
        const existingTag = await prisma.tag.findUnique({
          where: {
            name_userId: {
              name,
              userId: req.user.id
            }
          },
        })

		// Return existing tag if found
        if (existingTag) {
          return res.status(200).json(existingTag) 
        }

		// Create new tag for the user
        const newTag = await prisma.tag.create({
          data: {
            name,
            user: {
              connect: { id: req.user.id }
            }
          },
        })
        return res.status(201).json(newTag)

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Tags API Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

// Wrap handler with authentication middleware
export default withAuth(handler)