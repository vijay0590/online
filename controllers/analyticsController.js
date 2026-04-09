const Ticket=require('../models/Ticket');
const getOverallAnalytics=async(req,res)=>{
    try{
        const result=await Ticket.aggregate([
            {
                $match:{paymentStatus:"completed"}
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
        res.json(result[0])||{
            totalRevenue:0,
            totalTickets:0,
            totalBookings:0
        }
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