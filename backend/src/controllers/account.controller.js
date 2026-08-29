const accountModel=require('../models/account.model')

async function createAccount(req,res){
    const user=req.user;

    const account=await accountModel.create({
        user:user._id
    })
    return res.status(201).json({
        message:"Account created successfully",
        account
    })
}
async function getAccounts(req,res){
    const accounts=await accountModel.find({
        user:req.user._id
    })
    return res.status(200).json({
        accounts
    })
}

async function getAccountBalance(req,res){
    const {accountId}=req.params;
    const account=await accountModel.findOne({
        _id:accountId,
        user:req.user._id
    })
    if(!account){
        return res.status(404).json({error:"Account not found"})
    }
    const balance =await account.getBalance();
    return res.status(200).json({
        accountId:account._id,
        balance:balance
    })
}
module.exports={createAccount,getAccounts,getAccountBalance}