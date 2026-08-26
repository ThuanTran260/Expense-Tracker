import { Router } from 'express';
import { exchangeService } from '../services/exchange.service';

const router = Router();

// Public endpoint — dữ liệu tỷ giá công khai, không chứa user data
router.get('/', async (_req, res, next) => {
  try {
    res.json(await exchangeService.getLatestUsdRates());
  } catch (err) {
    next(err);
  }
});

export default router;
