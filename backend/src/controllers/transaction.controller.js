const transactionModel=require('../models/transaction.model')
const ledgerModel=require('../models/ledger.model')
const accountModel=require('../models/account.model')
const emailService=require('../services/email.service')
const mongoose=require('mongoose')
async function createTransaction(req,res){
    const {fromAccount,toAccount,amount,idempotencyKey}=req.body;
 //client side error status code 400
    if(!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({error:"Missing required fields"})
    }

    const fromAcc=await accountModel.findOne({
        id:fromAccount
    })

    const toAcc=await accountModel.findOne({
        id:toAccount
    })
 //account not found status code 404
    if(!fromAcc || !toAcc){
        return res.status(404).json({error:"Account not found"})
    }
  //Idempotency check to prevent duplicate transactions
   const isTransactionExist=await transactionModel.findOne({
    idempotencyKey:idempotencyKey
   })

   if(isTransactionExist){
     if(isTransactionExist.status==="SUCCESS"){
        return res.status(200).json({message:"Transaction already processed successfully"})
     }
     else if(isTransactionExist.status==="FAILED"){
        return res.status(400).json({error:"Transaction failed previously, please try again"})
     }
     else if(isTransactionExist.status==="PENDING"){
        return res.status(202).json({message:"Transaction is still pending, please wait"})
     }
   }
   //check account status before proceeding with the transaction
   if(fromAcc.status!=="ACTIVE" || toAcc.status!=="ACTIVE"){
    return res.status(400).json({error:"One or both accounts are not active"})
   }

   //drive sender balance to ledger and check if sufficient balance is available
   const balance=await fromAcc.getBalance();
   if(balance<amount){
    return res.status(400).json({error:`Insufficient balance in the sender's account. Available balance: ${balance}`})
   }

   //Create a new transaction with status PENDING
   const session = await mongoose.startSession();
   session.startTransaction();
   //yaa toh charo kaam ek saath hoga yaa fir kuch bhi nahi hoga, ye transaction ka fayda hia

   try{
      const transaction=await transactionModel.create({
             fromAcc,
             toAcc,
             amount,
             idempotencyKey,
               status:"PENDING"
      },{session})
      const debitLedgerentry=await ledgerModel.create({
         account:fromAcc._id,
         amount:amount,
         type:"DEBIT",
         transaction:transaction._id
      },{session})
      const creditLedgerentry=await ledgerModel.create({
         account:toAcc._id,
         amount:amount,
         type:"CREDIT",
         transaction:transaction._id
      },{session})

      transaction.status="SUCCESS"
      await transaction.save({session})

      await session.commitTransaction()
      session.endSession()

      //send email notification to both sender and receiver
      await emailService.sendTransactionEmail(fromAcc.user.email,fromAcc.user.name,amount,fromAccount,toAccount)
      return res.status(200).json({
         message:"Transaction successful",
         transaction:transaction
      })
   }catch(err){
      return res.status(500).json({error:"Transaction failed, please try again"})
   }
 

}

async function createInitialFundsTransaction(req,res){
    const {toAccount,amount,idempotencyKey}=req.body;
    
}

module.exports={createTransaction};


