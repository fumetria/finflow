import { Router } from 'express';
import { register, login, verifyEmail, resendVerification } from './auth.service.js';
import {
  loginSchema,
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from './auth.schemas.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await register(body);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const token = await login(body);
    return res.status(200).json({ token });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-email', async (req, res, next) => {
  try {
    const body = verifyEmailSchema.parse(req.body);
    const token = await verifyEmail(body);
    return res.status(200).json({ token });
  } catch (err) {
    next(err);
  }
});

router.post('/resend-verification', async (req, res, next) => {
  try {
    const body = resendVerificationSchema.parse(req.body);
    const result = await resendVerification(body);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
