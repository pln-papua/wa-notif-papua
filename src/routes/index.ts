import { Router, Request, Response } from 'express';
import { pool } from '../config/database';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const conn = await pool.getConnection();
    conn.release();
    res.json({ status: 'ok', db: 'connected', time: new Date() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

export default router;
