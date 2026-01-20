import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export const attachUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    req.user = null;
  }
  next();
};

export const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'auth required' });
  next();
};
