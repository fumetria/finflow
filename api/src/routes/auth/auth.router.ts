import { Router } from "express";
import { register, login } from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";

const router = Router();

router.post('/register', async (req, res, next) => {
    try {
        const body = registerSchema.parse(req.body)
        const token = await register(body)
        return res.status(201).json({ token })
    } catch (err) {
        next(err)
    }
})

router.post('/login', async (req, res, next) => {
    try {
        const body = loginSchema.parse(req.body)
        const token = await login(body)
        return res.status(200).json({ token })
    } catch (err) {
        next(err)
    }
})

export default router