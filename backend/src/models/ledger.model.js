const mongoose=require('mongoose')

const ledgerSchema=new mongoose.Schema({
    account:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"account",
        required:[true,"Ledger should be associated with an account"],
        index:true,
        immutable:true
    },
    amount:{
        type:Number,
        required:[true,"Ledger amount is required"],
        immutable:true
    },
    transaction:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"transaction",
        required:[true,"Ledger should be associated with a transaction"],
        index:true,
        immutable:true
    },
    type:{
        type:String,
        enum:{
            values:["CREDIT","DEBIT"],
            required:[true,"Ledger type should be shown"],
        },
        immutable:true
    }
})

function preventLedgerModification(){
    throw new Error("Ledger modification is not allowed")
}

ledgerSchema.pre('findOneAndUpdate',preventLedgerModification);
ledgerSchema.pre('updateOne',preventLedgerModification);
ledgerSchema.pre('updateMany',preventLedgerModification);
ledgerSchema.pre('update',preventLedgerModification);
ledgerSchema.pre('delete',preventLedgerModification)
ledgerSchema.pre('deleteOne',preventLedgerModification)
ledgerSchema.pre('deleteMany',preventLedgerModification)

const ledgerModel=mongoose.model("ledger",ledgerSchema);

module.exports=ledgerModel;