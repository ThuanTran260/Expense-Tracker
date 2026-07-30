import { Request, Response, NextFunction } from 'express';
import { statsService } from '../services/stats.service';
import { statsQuerySchema } from '../validators';

export const statsController = {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const query = statsQuerySchema.parse(req.query);
      const data = await statsService.getSummary(req.user!.userId, query);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const query = statsQuerySchema.parse(req.query);
      const data = await statsService.getByCategory(req.user!.userId, query);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const query = statsQuerySchema.parse(req.query);
      const data = await statsService.getTimeline(req.user!.userId, query);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },
};
