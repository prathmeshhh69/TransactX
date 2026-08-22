const mongoose=require('mongoose')
const dns=require('dns')

dns.setServers([
    '1.1.1.1',
    '8.8.8.8'
])

async function connectDB(){
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected')
    }catch(err){
        console.log(err)
        console.log('MongoDB connection failed')
    }
}
module.exports=connectDB;