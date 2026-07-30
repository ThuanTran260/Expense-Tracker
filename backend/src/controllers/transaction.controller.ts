import { Request, Response, NextFunction } from 'express';
import { transactionService } from '../services/transaction.service';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
} from '../validators';

export const transactionController = {
  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const query = transactionQuerySchema.parse(req.query);
      const result = await transactionService.getTransactions(req.user!.userId, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getTransactionById(req: Request, res: Response, next: NextFunction) {
    try {
      const transaction = await transactionService.getTransactionById(
        req.user!.userId,
        String(req.params.id)
      );
      res.json({ transaction });
    } catch (err) {
      next(err);
    }
  },

  async createTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createTransactionSchema.parse(req.body);
      const transaction = await transactionService.createTransaction(
        req.user!.userId,
        body
      );
      res.status(201).json({ transaction });
    } catch (err) {
      next(err);
    }
  },

  async updateTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const body = updateTransactionSchema.parse(req.body);
      const transaction = await transactionService.updateTransaction(
        req.user!.userId,
        String(req.params.id),
        body
      );
      res.json({ transaction });
    } catch (err) {
      next(err);
    }
  },

  async deleteTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      await transactionService.deleteTransaction(req.user!.userId, String(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async exportCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const query = transactionQuerySchema.parse(req.query);
      const csv = await transactionService.exportToCSV(req.user!.userId, query);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="transactions-${Date.now()}.csv"`
      );
      // BOM cho Excel mở đúng UTF-8
      res.send('\uFEFF' + csv);
    } catch (err) {
      next(err);
    }
  },
};
