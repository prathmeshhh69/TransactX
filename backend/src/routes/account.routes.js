const express=require('express')
const authMiddleware=require('../middlewares/auth.middleware')
const accountController=require('../controllers/account.controller')

const router=express.Router()
router.post('/',authMiddleware.authenticate,accountController.createAccount);

//get accounts
router.get("/",authMiddleware.authenticate,accountController.getAccounts);

//get account balance
router.get("/balance/:accountId",authMiddleware.authenticate,accountController.getAccountBalance)
module.exports=router;