const userModel = require('../models/user.model');
const emailService = require('../services/email.service');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const blacklistModel=require('../models/blacklist.model')

async function registerUser(req, res) {
  try {
    const { name, email, password,systemUser } = req.body;

    const isUserExists = await userModel.findOne({
      $or: [{ email }, { name }]
    });

    if (isUserExists) {
      return res.status(422).json({
        message: "User already exists with this email or name"
      });
    }

    const user = await userModel.create({
      name,
      email,
      password,
      systemUser
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRETS
    );

    res.cookie("token", token);

    // Send email BEFORE sending response
    await emailService.sendRegisteremail(user.email, user.name);

    return res.status(201).json({
      message: "User registered successfully",
      email: user.email,
      name: user.name
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Internal Server error"
    });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email }).select("+password");

    if (!user) {
      // Fixed: added status code (404)
      return res.status(404).json({
        message: "User does not exist with this email"
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(403).json({
        message: "Password is Invalid"
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRETS
    );

    res.cookie('token', token);

    return res.status(200).json({
      message: "User logged in successfully",
      name: user.name,
      email: user.email
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Internal Server error"
    });
  }
}

async function logoutUser(req,res){
    const token=req.cookies.token || req.headers.authorization?.split(" ")[1];
    if(!token){
        return res.status(401).json({error:"User is not logged in"})
    }
    await blacklistModel.create({token});
    res.clearCookie("token");
    return res.status(200).json({message:"User logged out successfully"});
}

module.exports = { registerUser, loginUser ,logoutUser};