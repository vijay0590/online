const User=require("../models/User")
const Ticket=require("../models/Ticket");

const getAllUsers=async(req,res)=>{
    //get all users
    try{
        const users=await User.find().select("-password")
        res.json({count:users.length,users})
    }catch(error){
        res.status(500)({message:error.messge})
    }

};
//get all tickets
const getAllTickets=async(req,res)=>{
    try{
        const tickets=await Ticket.find()
        .populate("user","name email")
        .populate("event","title date");

        res.json({count:tickets.length,tickets});


    }catch(error){
        res.status(500).json({message:error.message})
    }
    
};
//payment status summary
const paymentStats=async(req,res)=>{
    try{
        const stats=await Ticket.aggregate([
            {
                $group:{
                    _id:'$paymentStatus',
                    count:{$sum:1}
                }
            }
        ]);
        res.json({stats});
    }catch(error){
        res.status(500).json({message:error.message})
    }
};
module.exports={getAllUsers,getAllTickets,paymentStats};
