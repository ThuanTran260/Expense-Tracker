import { Router } from 'express';
import { transactionController } from '../controllers/transaction.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate);

// Export phải đặt TRƯỚC /:id để không bị conflict
router.get('/export', transactionController.exportCSV);

router.get('/', transactionController.getTransactions);
router.post('/', transactionController.createTransaction);
router.get('/:id', transactionController.getTransactionById);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

export default router;
