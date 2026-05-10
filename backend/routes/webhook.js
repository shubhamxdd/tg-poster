import express from 'express';
import { handleTelegramWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Middleware to verify Telegram secret token (optional but recommended in PLAN.md)
const verifyTelegramToken = (req, res, next) => {
  const secretToken = req.headers['x-telegram-bot-api-secret-token'];
  if (process.env.WEBHOOK_SECRET && secretToken !== process.env.WEBHOOK_SECRET) {
    return res.status(403).send('Unauthorized');
  }
  next();
};

router.post('/', verifyTelegramToken, handleTelegramWebhook);

export default router;
