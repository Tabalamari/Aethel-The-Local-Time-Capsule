import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Aethel: The Local Time Capsule API',
    supabaseConfigured: false,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`[Aethel Backend] Server listening on http://localhost:${PORT}`);
});
