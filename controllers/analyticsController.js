const Ticket=require('../models/Ticket');
const Event=require("../models/Event")
const getOverallAnalytics=async(req,res)=>{
    try{
        const totalEvents= await Event.countDocuments({
            organiser:req.user._id
        });
        
        const result=await Ticket.aggregate([
            {
                $lookup:{
                    from:"events",
                    localField:"event",
                    foreignField:"_id",
                    as:"eventData"
                }
            },
            {
                $unwind:"$eventData"
            },
            {
                $match:{paymentStatus:"COMPLETED",
               "eventData.organiser":req.user._id}
            },
            {
                $group:{
                    _id:null,
                    totalRevenue:{$sum:"$totalPrice"},
                    totalTickets:{$sum:"$quantity"},
                    totalBookings:{$sum:1}

                }
            }
        ]);
         const data = result[0] || {
        
            totalRevenue: 0,
            totalTickets: 0,
            totalBookings: 0
        };
     res.json({
     totalEvents,
     ...data
     })
    }catch(error){
        res.status(500).json({message:error.message})
    }
};
const getEventAnalytics=async(req,res)=>{
    try{
        const result=await Ticket.aggregate([
            {
            $match:{paymentStatus:"completed"}
            },
            {
                $group:{
                    _id:"$event",
                    totalRevenue:{$sum:"$totalPrice"},
                    ticketSold:{$sum:"$quantity"},
                }
            }
        ]);
        res.json(result);
    }catch(error){
        res.status(500).json({message:error.message})
}
};
module.exports={getEventAnalytics,getOverallAnalytics};