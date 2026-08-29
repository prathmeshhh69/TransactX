const mongoose=require('mongoose')

const transactionSchema=new mongoose.Schema({
    fromAccount:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"account",
        required:[true,"Transaction should be associated with a from account"],
        index:true
    },
    toAccount:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"account",
        required:[true,"Transaction should be associated with a to account"],
        index:true
    },
    amount:{
        type:Number,
        required:[true,"Transaction amount is required"],
        min:[1,"Transaction amount should be greater than 0"]
    },
    idempotencyKey:{
        type:String,
        required:[true,"Idempotency key is required for transaction"],
        unique:true,
        index:true
    },
    status:{
        type:String,
        enum:["PENDING","COMPLETED","FAILED"],
        default:"PENDING",
        required:true,
        index:true
    }
},{timestamps:true})

const transactionModel=mongoose.model("transaction",transactionSchema);

module.exports=transactionModel;