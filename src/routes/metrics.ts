import { Router, Request, Response } from 'express';
import { getMetrics } from '../services/monitoring';
import logger from '../utils/logger';

const router = Router();

// GET /metrics - Prometheus metrics endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const metrics = await getMetrics();
    
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
    
  } catch (error) {
    logger.error('Failed to retrieve metrics:', error);
    res.status(500).send('Failed to retrieve metrics');
  }
});

export default router;
