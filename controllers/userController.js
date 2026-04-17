const User=require("../models/User");
//get my profile
const getMyProfile=async(req,res)=>{
    try{
        const user=await User.findById(req.user._id).select("-password");
        res.json({ user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role  
            }});
    }catch(error){
        res.status(500).json({message:error.message})
    }
}
//update profile
const updateProfile=async(req,res)=>{
    try{
        const {name,email}=req.body;
        const user=await User.findById(req.user._id);
        if(!user){
            return res.status(400).json({message:"user not found"})
        }
        //update fields
        if(name) user.name=name
        if(email)user.email=email;
        await user.save()
        res.json({message:"profile updated sucessfully",
            user:{
                id:user._id,
                name:user.name,
                email:user.email,
                role:user.role
            }
        
            })
             }catch(error){
                res.status(580).json({message:error.message})
       
         }
};
const updateUserRole=async(req,res)=>{
    try{
        const{role}=req.body;
        const user = await User.findByIdAndUpdate(req.params.id,
            {role},
            {new:true}
        )
        if(!user){
            return res.status(403).json("user not found")
        }
        res.status(200).json("user updated succesfully")
            
    }catch(error){
        res.status(500).json("server error")
    }
}
module.exports={getMyProfile,updateProfile,updateUserRole}