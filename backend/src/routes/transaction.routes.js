const express=require('express')
const authMiddleware=require('../middlewares/auth.middleware')
const transactionController=require('../controllers/transaction.controller')

const router=express.Router()


router.post("/",authMiddleware.authenticate,transactionController.createTransaction)

//POst api/transactions/system/initial-funds
router.post("/system/intial-funds",authMiddleware.systemUserMiddleware)

module.exports=router