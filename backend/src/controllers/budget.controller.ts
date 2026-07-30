import { Request, Response, NextFunction } from 'express';
import { budgetService } from '../services/budget.service';
import { createBudgetSchema, updateBudgetSchema } from '../validators';
import { z } from 'zod';

const budgetQuerySchema = z.object({
  month: z.string().transform(Number).pipe(z.number().int().min(1).max(12)),
  year: z.string().transform(Number).pipe(z.number().int().min(2000).max(2100)),
});

export const budgetController = {
  async getBudgets(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const query = budgetQuerySchema.parse({
        month: req.query.month ?? String(now.getMonth() + 1),
        year: req.query.year ?? String(now.getFullYear()),
      });
      const data = await budgetService.getBudgets(
        req.user!.userId,
        query.month,
        query.year
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async createBudget(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createBudgetSchema.parse(req.body);
      const budget = await budgetService.createBudget(req.user!.userId, body);
      res.status(201).json({ budget });
    } catch (err) {
      next(err);
    }
  },

  async updateBudget(req: Request, res: Response, next: NextFunction) {
    try {
      const body = updateBudgetSchema.parse(req.body);
      const budget = await budgetService.updateBudget(
        req.user!.userId,
        String(req.params.id),
        body.monthlyLimit
      );
      res.json({ budget });
    } catch (err) {
      next(err);
    }
  },

  async deleteBudget(req: Request, res: Response, next: NextFunction) {
    try {
      await budgetService.deleteBudget(req.user!.userId, String(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
