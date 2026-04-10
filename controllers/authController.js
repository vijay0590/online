const User=require("../models/User")
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const { JWT_SECRET } = require("../config/config");
//register
const authController={
    //register
    registerUser:async(req,res)=>{
        try{
            const{name,email,password}=req.body
             //check all fields
        if(!name || !email || !password){
            return res.status(500).json({message:"required all fields"})
        }
        //check if user exists
        
        const existingUser=await User.findOne({email});
        if(existingUser){
            return res.status(500).json({message:"user already exists"})
        }
        //hash password
        const hashedPassword=await bcrypt.hash(password,10);
        //create user
        const user=await User.create({
            name,
            email,
            password:hashedPassword
        });
      
        //response
        res.status(200).json({message:"user registerd succesfully",user:{
            id:user._id,
            name:user.name,
            email:user.email
        }})
        } catch(error){
            return res.status(500).json({message:error.message})

        };
    
       

    },
    //login user
    loginUser:async(req,res)=>{
        try{
            //check fields
            const {email,password}=req.body;
            if(!email || !password){
                return res.status(500).json({message:"Required all fields",error:err.message});
            }
            //Find user
            const user=await User.findOne({email});
            if(!user){
                return res.status(500).json({message:"Invalid credentials"});

            }
            //compare password
            const isValidate= await bcrypt.compare(password,user.password);
            if(!isValidate){
                return res.status(500).json({message:"Invalid credentials",error:error.message});
            }
            //Generate token
            const token=jwt.sign({
                userId:user._id,
                role:user.role,},
                JWT_SECRET,
                {expiresIn:'7d'}
            )
            //RESPONSE
          res.status(200).json({
            message:"login succcessfull",token,
            user:{
                id:user._id,
                name:user.name,
                email:user.email
                }
          })
        }catch(error){
             res.status(500).json({message:error.message})

        }

    }
};
    module.exports=authController;