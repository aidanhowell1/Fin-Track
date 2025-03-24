import { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { compare } from 'bcryptjs';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.method === 'GET') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          currency: true,
          timezone: true,
          language: true,
          theme: true,
          twoFactorEnabled: true,
          notifyBudget: true,
          notifyEmail: true,
          notifyInApp: true,
          notifyThreshold: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json(user);
    }

    if (req.method === 'PUT') {
      const {
        name,
        currency,
        timezone,
        language,
        theme,
        twoFactorEnabled,
        notifyBudget,
        notifyEmail,
        notifyInApp,
        notifyThreshold,
      } = req.body;

      // If currency is being changed, we need to delete all financial data
      if (currency && currency !== req.user.currency) {
        await prisma.$transaction([
          prisma.transaction.deleteMany({ where: { userId: req.user.id } }),
          prisma.budget.deleteMany({ where: { userId: req.user.id } }),
          prisma.category.deleteMany({ where: { userId: req.user.id } }),
          prisma.user.update({
            where: { id: req.user.id },
            data: {
              currency,
              language,
              notifyBudget,
              notifyEmail,
              notifyInApp,
              notifyThreshold,
              name,
            },
          })
        ]);

        const updatedUser = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            currency: true,
            language: true,
            theme: true,
            twoFactorEnabled: true,
            notifyBudget: true,
            notifyEmail: true,
            notifyInApp: true,
            notifyThreshold: true,
            createdAt: true,
          },
        });

        if (!updatedUser) {
          throw new Error('Failed to fetch updated user data');
        }

        return res.status(200).json(updatedUser);
      }

      // If no currency change, just update the settings
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          name,
          language,
          notifyBudget,
          notifyEmail,
          notifyInApp,
          notifyThreshold,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          currency: true,
          language: true,
          theme: true,
          twoFactorEnabled: true,
          notifyBudget: true,
          notifyEmail: true,
          notifyInApp: true,
          notifyThreshold: true,
          createdAt: true,
        },
      });

      return res.status(200).json(updatedUser);
    }

    if (req.method === 'DELETE') {
      const { password } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          password: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValidPassword = await compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Delete all user data
      await prisma.$transaction([
        prisma.transaction.deleteMany({ where: { userId: req.user.id } }),
        prisma.budget.deleteMany({ where: { userId: req.user.id } }),
        prisma.category.deleteMany({ where: { userId: req.user.id } }),
        prisma.tag.deleteMany({ where: { userId: req.user.id } }),
        prisma.user.delete({ where: { id: req.user.id } }),
      ]);

      return res.status(200).json({ message: 'Account deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Settings API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler);