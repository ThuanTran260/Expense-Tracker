import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate);

router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;
