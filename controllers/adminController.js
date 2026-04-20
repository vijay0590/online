const User=require("../models/User")
const Ticket=require("../models/Ticket");
const Event=require("../models/Event");

const getAllUsers=async(req,res)=>{
    //get all users
    try{
        const users=await User.find().select("-password")
        res.json({count:users.length,users})
    }catch(error){
        res.status(500).json({message:error.message})
    }

};
//delete users
const deleteUser=async(req,res)=>{
    try{
        const user= await User.findByIdAndDelete(req.params.id);
        if(!user){
            return res.staus(404).json("user not found")
        }
        res.status(200).json({message:"user deleted succesfully"})
    }catch(error){
        console.log(error.message)
    }

}
//get all tickets
const getAllTickets=async(req,res)=>{
    try{
        const tickets=await Ticket.find({paymentStatus:"completed"})  
        .populate("user","name email")
        .populate("event","title date")
        .select("user event totalPrice paymentId paymentStatus createdAt")

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
//adminstats
const getAdminStats=async(req,res)=>{
    
   try{
const totalUsers=await User.countDocuments();
const totalEvents=await Event.countDocuments();
const revenueData=await Ticket.aggregate([
    {
        $match:{paymentStatus:"COMPLETED"}
    },
    {
        $group:{
            _id:null,
            totalRevenue:{$sum:"$totalPrice"}
        }
    }
       ]);
 const totalRevenue = revenueData[0]?.totalRevenue || 0;
    res.json({
        users:totalUsers,
        events:totalEvents,
        revenue:totalRevenue,
    })
   }catch(err){
    res.status(500).json({message:err.message})

   }
}
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Ticket.find()
      .populate("user", "name email")
      .populate("event", "title date")
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
module.exports={getAllUsers,getAllTickets,paymentStats,getAdminStats,deleteUser,getAllTransactions};
