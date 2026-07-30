import { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service';
import { updateSettingsSchema } from '../validators';

export const settingsController = {
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.getSettings(req.user!.userId);
      res.json({ settings });
    } catch (err) {
      next(err);
    }
  },

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const body = updateSettingsSchema.parse(req.body);
      const settings = await settingsService.updateSettings(req.user!.userId, body);
      res.json({ settings });
    } catch (err) {
      next(err);
    }
  },
};
