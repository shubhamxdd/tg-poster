import express from 'express';
import { handleTelegramWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Middleware to verify Telegram secret token
const verifyTelegramToken = (req, res, next) => {
  const secretToken = req.headers['x-telegram-bot-api-secret-token'];
  
  console.log('--- Incoming Webhook ---');
  console.log('Secret Token Received:', secretToken);
  console.log('Secret Token Expected:', process.env.WEBHOOK_SECRET);

  if (process.env.WEBHOOK_SECRET && secretToken !== process.env.WEBHOOK_SECRET) {
    console.log('❌ Webhook secret mismatch! Access Denied (403).');
    return res.status(403).send('Unauthorized');
  }
  
  console.log('✅ Webhook secret matched. Processing...');
  next();
};

router.post('/', verifyTelegramToken, handleTelegramWebhook);

export default router;
