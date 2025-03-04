import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Delete all associated data in the correct order to respect foreign key constraints
    await prisma.$transaction([
      // Delete mood logs first
      prisma.moodLog.deleteMany({
        where: { userId },
      }),
      // Delete transactions
      prisma.transaction.deleteMany({
        where: { userId },
      }),
      // Delete budgets
      prisma.budget.deleteMany({
        where: { userId },
      }),
      // Delete categories
      prisma.category.deleteMany({
        where: { userId },
      }),
      // Delete tags
      prisma.tag.deleteMany({
        where: { userId },
      }),
      // Finally delete the user
      prisma.user.delete({
        where: { id: userId },
      }),
    ]);

    return res.status(200).json({ message: 'Account and all associated data successfully deleted' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return res.status(500).json({ 
      error: 'Failed to delete account',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}