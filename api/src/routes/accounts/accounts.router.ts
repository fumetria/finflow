import { Router } from "express"
import authtenticate from "../../middlewares/authtenticate.js"
import { findAllAccounts, createAccount, findAccountById, updateAccount } from "./accounts.service.js"
import { createAccountSchema, updateAccountSchema } from "./accounts.schemas.js"


const router = Router()

router.use(authtenticate)

router.get('/', async (req, res, next) => {
    try {
        const userAccounts = await findAllAccounts(req.user.sub)
        return res.status(200).json({ userAccounts })
    } catch (error) {
        next(error)
    }
})

router.post('/', async (req, res, next) => {
    try {
        const body = createAccountSchema.parse(req.body)
        const newAccount = await createAccount(req.user.sub, body)
        return res.status(201).json({ newAccount })
    } catch (error) {
        next(error)
    }
})

router.get(`/:id`, async (req, res, next) => {
    try {
        const bankSelected = await findAccountById(req.user.sub, req.params.id)
        return res.status(200).json({ bankSelected })
    } catch (error) {
        next(error)
    }
})

router.patch('/:id', async (req, res, next) => {
    try {
        const body = updateAccountSchema.parse(req.body)
        const [account] = await updateAccount(req.user.sub, req.params.id, body)
        return res.status(200).json({ account })

    } catch (err) {
        next(err)
    }
})

export default router