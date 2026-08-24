const express=require('express')
const authMiddleware=require('../middlewares/auth.middleware')
const transactionController=require('../controllers/transaction.controller')

const router=express.Router()


router.post("/",authMiddleware.authenticate,transactionController.createTransaction)

module.exports=router