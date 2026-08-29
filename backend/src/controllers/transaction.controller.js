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
    const fromAcc=await accountModel.findById(fromAccount)
    const toAcc=await accountModel.findById(toAccount)
    //account not found status code 404
    if(!fromAcc || !toAcc){
        return res.status(404).json({error:"Account not found"})
    }
    //Idempotency check to prevent duplicate transactions
    const isTransactionExist=await transactionModel.findOne({
        idempotencyKey:idempotencyKey
    })
    if(isTransactionExist){
        if(isTransactionExist.status==="COMPLETED"){
            return res.status(200).json({
                message:"Transaction already processed successfully",
                transaction:isTransactionExist
            })
        }
        else if(isTransactionExist.status==="FAILED"){
            return res.status(400).json({
                error:"Transaction failed previously, please try again"
            })
        }
        else if(isTransactionExist.status==="PENDING"){
            return res.status(202).json({
                message:"Transaction is still pending, please wait"
            })
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
    const session=await mongoose.startSession();
    session.startTransaction();
    //yaa toh charo kaam ek saath hoga yaa fir kuch bhi nahi hoga, ye transaction ka fayda hia
    try{
        const transaction=(await transactionModel.create([{
            fromAccount:fromAcc._id,
            toAccount:toAcc._id,
            amount,
            idempotencyKey,
            status:"PENDING"
        }],{session}))[0]
        const debitLedgerentry=await ledgerModel.create([{
            account:fromAcc._id,
            amount:amount,
            type:"DEBIT",
            transaction:transaction._id
        }],{session})
        await(()=>{
            return new Promise((resolve)=>setTimeout(resolve,15*1000))//15 seconds delay to simulate a long-running transaction
        })()
        const creditLedgerentry=await ledgerModel.create([{
            account:toAcc._id,
            amount:amount,
            type:"CREDIT",
            transaction:transaction._id
        }],{session})
        await transactionModel.findOneAndUpdate(
            {_id:transaction._id},
            {status:"COMPLETED"},
            {session}
        )
        await session.commitTransaction()
        //send email notification to both sender and receiver
        try{
            await emailService.sendTransactionEmail(fromAcc.user.email,fromAcc.user.name,amount,fromAccount,toAccount)
        }catch(emailError){
            console.log("Email failed:",emailError)
        }
        return res.status(200).json({
            message:"Transaction successful",
            transaction:{
                ...transaction.toObject(),
                status:"COMPLETED"
            }
        })
    }catch(err){
        await session.abortTransaction()
        if(err.code===11000){
            const existingTransaction=await transactionModel.findOne({
                idempotencyKey:idempotencyKey
            })
            if(existingTransaction){
                if(existingTransaction.status==="COMPLETED"){
                    return res.status(200).json({
                        message:"Transaction already processed successfully",
                        transaction:existingTransaction
                    })
                }
                else if(existingTransaction.status==="PENDING"){
                    return res.status(202).json({
                        message:"Transaction is still pending, please wait"
                    })
                }
                else if(existingTransaction.status==="FAILED"){
                    return res.status(400).json({
                        error:"Transaction failed previously, please try again"
                    })
                }
            }
        }
        console.log(err)
        return res.status(500).json({error:"Transaction failed, please try again"})
    }finally{
        session.endSession()
    }
}
async function createInitialFundsTransaction(req,res){
    const {toAccount,amount,idempotencyKey}=req.body;
    if(!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({error:"Missing required fields"})
    }
    const touserAccount=await accountModel.findOne({
        _id:toAccount
    })   
    if(!touserAccount){
        return res.status(404).json({error:"Account not found"})
    }
    const fromUserAccount=await accountModel.findOne({
        user:req.user._id
    })
    if(!fromUserAccount){
        return res.status(404).json({error:"System account not found"})
    }
    const isTransactionExist=await transactionModel.findOne({
        idempotencyKey:idempotencyKey
    })
    if(isTransactionExist){
        if(isTransactionExist.status==="COMPLETED"){
            return res.status(200).json({
                message:"Transaction already processed successfully",
                transaction:isTransactionExist
            })
        }
        else if(isTransactionExist.status==="PENDING"){
            return res.status(202).json({
                message:"Transaction is still pending, please wait"
            })
        }
        else if(isTransactionExist.status==="FAILED"){
            return res.status(400).json({
                error:"Transaction failed previously, please try again"
            })
        }
    }
    const session=await mongoose.startSession();
    session.startTransaction();
    try{
        const transaction=(await transactionModel.create([{
            fromAccount:fromUserAccount._id,
            toAccount:touserAccount._id,
            amount,
            idempotencyKey,
            status:"PENDING"
        }],{session}))[0]
        const debitLedgerentry=await ledgerModel.create([{
            account:fromUserAccount._id,
            amount:amount,
            transaction:transaction._id,
            type:"DEBIT"
        }],{session})
        const creditLedgerentry=await ledgerModel.create([{
            account:touserAccount._id,
            amount:amount,
            transaction:transaction._id,
            type:"CREDIT"
        }],{session})
        await transactionModel.findOneAndUpdate(
            {_id:transaction._id},
            {status:"COMPLETED"},
            {session}
        )
        await session.commitTransaction()
        return res.status(200).json({
            message:"Initial funds transaction successful"
        })
    }catch(err){
        await session.abortTransaction()
        if(err.code===11000){
            const existingTransaction=await transactionModel.findOne({
                idempotencyKey:idempotencyKey
            })
            if(existingTransaction){
                if(existingTransaction.status==="COMPLETED"){
                    return res.status(200).json({
                        message:"Transaction already processed successfully",
                        transaction:existingTransaction
                    })
                }
                else if(existingTransaction.status==="PENDING"){
                    return res.status(202).json({
                        message:"Transaction is still pending, please wait"
                    })
                }
            }
        }
        console.log(err)
        return res.status(500).json({error:"Initial funds transaction failed"})
    }finally{
        session.endSession()
    }
}
module.exports={createTransaction,createInitialFundsTransaction};