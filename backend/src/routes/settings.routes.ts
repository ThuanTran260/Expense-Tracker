import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate);

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

export default router;
