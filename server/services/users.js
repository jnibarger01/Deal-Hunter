import bcrypt from 'bcrypt';
import { getRedis } from './redis.js';

const SALT_ROUNDS = 10;
const USER_PREFIX = 'user:';
const EMAIL_INDEX = 'user:email:';

export const createUser = async ({ email, password, plan = 'free' }) => {
  const redis = getRedis();

  const existingId = await redis.get(`${EMAIL_INDEX}${email}`);
  if (existingId) {
    return { error: 'Email already registered' };
  }

  const id = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = {
    id,
    email,
    password: hashedPassword,
    plan,
    createdAt: Date.now()
  };

  await redis.set(`${USER_PREFIX}${id}`, JSON.stringify(user));
  await redis.set(`${EMAIL_INDEX}${email}`, id);

  const { password: _, ...safeUser } = user;
  return { user: safeUser };
};

export const findUserByEmail = async (email) => {
  const redis = getRedis();
  const id = await redis.get(`${EMAIL_INDEX}${email}`);
  if (!id) return null;

  const data = await redis.get(`${USER_PREFIX}${id}`);
  return data ? JSON.parse(data) : null;
};

export const verifyPassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};
