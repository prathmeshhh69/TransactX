const userModel=require('../models/user.model')
const jwt=require('jsonwebtoken')

async function authenticate(req,res,next){
    const token=req.cookies.token || req.headers.authorization?.split(" ")[1]

    if(!token){
        return res.status(401).json({
            message:"Unauthorised"
        })
    }
    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRETS)
        const user=await userModel.findById(decoded.id)

        req.user=user

        return next();
    }catch(err){
        return res.status(401).json({
            message:"Unauthorised, token is invalid"
        })
    }
}
async function systemUserMiddleware(req,res,next){
    const token=req.cookies.token || req.headers.authorization?.split(" ")[1]
    if(!token){
        return res.status(401).json({
            message:"Unauthorised, no token provided"
        })
    }

    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRETS)
        const user=await userModel.findById(decoded.id).select("+systemUser")


        if(!user.systemUser){
            return res.status(403).json({
                message:"Forbidden, user is not a system user"
            })
        }

        req.user=user;
        return next();


    }catch(err){
        return res.status(401).json({
            message:"Unauthorised, token is invalid"
        })
    }
}

module.exports={authenticate, systemUserMiddleware}