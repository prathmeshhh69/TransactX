const mongoose=require('mongoose')
const bcrypt=require('bcrypt')

const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:[true,"Name is required"]
    },
email: {
    type: String,
    trim: true,
    lowercase: true,
    required: [true, "Email must be provided"],
    match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid email"
    ],
        unique:[true,"Email already exists"]
    },
    password:{
        type:String,
        required:[true,"Password is required"],
        minlength:[6,"Password should contain minimum 6 characters"],
        select:false
    }
},{timestamps:true})
userSchema.pre("save", async function (){
    if(!this.isModified("password")){
        return
    }
    const hash=await bcrypt.hash(this.password,10);
    this.password=hash;

  
})

userSchema.methods.comparePassword=async function (password){
    return await bcrypt.compare(password,this.password);
}
const userModel=mongoose.model("user",userSchema)

module.exports=userModel;