const Ticket=require("../models/Ticket");
const Event=require("../models/Event");
const User=require("../models/User");
const sendEmail=require("../config/sendEmail")
//book ticket
const bookTicket=async(req,res)=>{
    try{
     const {eventId,quantity,ticketType,paymentMethod}=req.body;
     //validate
     if(!eventId || !quantity){
        return res.status(400).json({message:"eventId and quantity required"})
     }
     //find event
     const event=await Event.findById(eventId)
     if(!event){
        return res.status(404).json({message:"event not found"})
     }
     //check event is approved
     if(event.status !== "APPROVED"){
        return res.status(400).json({message:"event not available for booking"})
     }
     //find selected ticket type
     const selectedType= event.ticketTypes.find(
        (t)=>t.type===ticketType
     )
       if(!selectedType){
        return res.status(404).json({message:"invalid ticket type"})
       }
     //total price
     const totalPrice=selectedType.price*quantity;
     //create ticket
     const ticket=await Ticket.create({
        user:req.user._id,
        event:eventId,
        ticketType,
        quantity,
        paymentMethod,
        totalPrice,
         razorpay_payment_id: req.body.razorpay_payment_id, 
  razorpay_order_id: req.body.razorpay_order_id,   
  paymentStatus:"PENDING"
     });
  

     res.status(201).json({message:"Ticket booked succefully",
        ticket
        
     });
    }catch(error){
        res.status(500).json({message:error.message})
    }

}
const getMyTickets=async(req,res)=>{
    try{
        const tickets=await Ticket.find({user:req.user._id})
        .populate("event","title date time location price")
        .sort({createdAt:-1});
        res.json({count:tickets.length,tickets,});
    }catch(error){
        res.status(500).json({message:error.message})

    }
};
const confirmPayment = async (req, res) => {
  try {
    const { ticketId, razorpay_payment_id, razorpay_order_id } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "ticket not found" });
    }

    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "not authorised" });
    }

    // UPDATE PAYMENT
    ticket.paymentStatus = "COMPLETED";
    ticket.razorpay_payment_id = razorpay_payment_id;
    ticket.razorpay_order_id = razorpay_order_id;

    await ticket.save();

    // SEND EMAIL
    const user = await User.findById(ticket.user);

    await sendEmail(
      user.email,
      "Ticket Confirmation",
      `Your ticket is confirmed 🎉\nQuantity: ${ticket.quantity}`
    );

    res.json({ message: "payment successful", ticket });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// CANCEL TICKET
const cancelTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check ownership
    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Check if already cancelled
    if (ticket.paymentStatus === "CANCELLED") {
      return res.status(400).json({ message: "Ticket already cancelled" });
    }

    // Update status
    ticket.paymentStatus = "CANCELLED";
    await ticket.save();

    res.json({
      message: "Ticket cancelled successfully",
      ticket,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//transfer ticket
const transferTicket=async(req,res)=>{
    try{
        const ticketId = req.params.id;
    const { newUserEmail } = req.body;
    
    //find ticket
    const ticket=await Ticket.findById(ticketId)
    if(!ticket){
        return res.status(400).json(({message:"no ticket found"}))
    }
    //check ownership
   if(ticket.user.toString()!==req.user._id.toString()){
    return res.status(403).json({message:"not authorised"})
   }
   //find new user
   const newUser=await User.findOne({email:newUserEmail})
   if(!newUser){
    return res.status(400).json({message:"no user found"})
   }
   //transfer ticket
   ticket.user=newUser._id
   await ticket.save();
   res.json({message:"ticket transferred successfully,",ticket})
   }catch(error){
res.status(500).json({message:error.message})
   }

}
module.exports = { bookTicket,getMyTickets,confirmPayment, cancelTicket ,transferTicket};