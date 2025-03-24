import { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import prisma from '@/lib/prisma';
import { generateToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, firstName, lastName, name } = req.body;

    let finalFirstName = firstName;
    let finalLastName = lastName;

    // Handle "name" if firstName/lastName are missing
    if (!firstName && !lastName && name) {
      const parts = name.trim().split(/\s+/);
      finalFirstName = parts[0];
      finalLastName = parts.slice(1).join(' ') || finalFirstName;
    }

    if (!email || !password || (!finalFirstName && !finalLastName)) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const hashedPassword = createHash('sha256')
      .update(password + process.env.JWT_SECRET)
      .digest('hex');

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: finalFirstName,
        lastName: finalLastName,
        totalIncome: 0,
        categories: {
          create: [
            { name: 'Groceries' },
            { name: 'Transportation' },
            { name: 'Entertainment' },
            { name: 'Bills' },
            { name: 'Salary' }
          ],
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        currency: true,
        theme: true,
      },
    });

    const token = generateToken({ id: user.id, email: user.email });

    return res.status(201).json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    });
  }
}
