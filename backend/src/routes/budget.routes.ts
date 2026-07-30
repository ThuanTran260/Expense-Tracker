import { Router } from 'express';
import { budgetController } from '../controllers/budget.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate);

router.get('/', budgetController.getBudgets);
router.post('/', budgetController.createBudget);
router.put('/:id', budgetController.updateBudget);
router.delete('/:id', budgetController.deleteBudget);

export default router;
