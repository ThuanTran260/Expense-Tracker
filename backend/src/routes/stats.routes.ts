import { Router } from 'express';
import { statsController } from '../controllers/stats.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate);

router.get('/summary', statsController.getSummary);
router.get('/by-category', statsController.getByCategory);
router.get('/timeline', statsController.getTimeline);

export default router;
