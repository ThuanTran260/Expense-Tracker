import { Request, Response, NextFunction } from 'express';
import { categoryService } from '../services/category.service';
import { createCategorySchema } from '../validators';

export const categoryController = {
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await categoryService.getCategories(req.user!.userId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createCategorySchema.parse(req.body);
      const category = await categoryService.createCategory(req.user!.userId, body);
      res.status(201).json({ category });
    } catch (err) {
      next(err);
    }
  },

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      await categoryService.deleteCategory(req.user!.userId, String(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
