const express=require('express')
const authMiddleware=require('../middlewares/auth.middleware')
const accountController=require('../controllers/account.controller')

const router=express.Router()
router.post('/',authMiddleware.authenticate,accountController.createAccount);
module.exports=router;