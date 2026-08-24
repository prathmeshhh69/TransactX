const mongoose=require('mongoose')
const ledgerModel=require('../models/ledger.model')

const accountSchema=new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
        required:[true,"Account should be associated with a user"],
        index:true
    },
    status:{
        type:String,
        enum:{
            values:["ACTIVE","FROZEN","CLOSED"],
            required:[true,"Account's status should be shown"],
        },
         default:"ACTIVE"
    },
    currency:{
        type:String,
        required:[true,"Currency is required for account"],
        default:"INR"
    }
},{
    timestamps:true
})

accountSchema.index({user:1,status:1})
accountSchema.methods.getBalance=async function(){
    const balancedata=await ledgerModel.aggregate([
        {$match:{account:this._id}},
        {$group:{
            _id:null,
            totalDebit:{$sum:{$cond:[{$eq:["$type","DEBIT"]},"$amount",0]}},
            totalCredit:{$sum:{$cond:[{$eq:["$type","CREDIT"]},"$amount",0]}}
        }},
        {$project:{
            _id:0,
            balance:{$subtract:["$totalCredit","$totalDebit"]}
        }}
    ])
    if(balancedata.length==0){
        return 0;
    }
    return balancedata[0].balance;
}
const accountModel=mongoose.model("account", accountSchema)

module.exports=accountModel;