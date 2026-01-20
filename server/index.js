import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';
import { attachUser } from './middleware/auth.js';

const app = express();
const port = process.env.PORT || 4000;

if (!process.env.GEMINI_API_KEY) {
  console.warn('WARNING: GEMINI_API_KEY is missing from environment variables. AI features will fail.');
}

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(attachUser);

app.use('/auth', authRouter);
app.use('/api', apiRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  app.use(express.static(path.join(__dirname, '../dist')));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.use((err, req, res, next) => {
  // Basic error handler to keep responses consistent.
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Unexpected server error',
    details: err.details || null
  });
});

app.listen(port, () => {
  console.log(`Deal Hunter server listening on http://localhost:${port}`);
});
