import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail, verifyPassword } from '../services/users.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/signup', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const result = await createUser({ email, password });

    if (result.error) {
      return res.status(409).json({ error: result.error });
    }

    const token = jwt.sign(
      { id: result.user.id, email: result.user.email, plan: result.user.plan },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user: result.user, token });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, plan: user.plan },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
});

export default router;
