const Ticket=require("../models/Ticket");
const Event=require("../models/Event");
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
     if(event.status !== "approved"){
        return res.status(400).json({message:"event not available for booking"})
     }
     //total price
     const totalPrice=event.price*quantity;
     //create ticket
     const ticket=await Ticket.create({
        user:req.user._id,
        event:eventId,
        ticketType,
        quantity,
        paymentMethod,
        totalPrice
     });

     res.status(201).json({message:"Ticket booked succefully(payment pending)",
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
const confirmPayment=async(req,res)=>{
    try{
        const {ticketId}=req.body;
        const ticket = await Ticket.findById(ticketId)
        if(!ticket){
            return res.status(404).json({message:"ticket not found"})
        }
        //only owner can confirm
        if(ticket.user.toString()!==req.user._id.toString()){
            return res.status(403).json({message:"not authorised"})
        }
        //update payment status
        ticket.paymentStatus="completed"
        await ticket.save();
        res.json({message:"payment succesful",ticket,})

    }catch(error){
        res.status(500).json({message:error.message})

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
    if (ticket.paymentStatus === "cancelled") {
      return res.status(400).json({ message: "Ticket already cancelled" });
    }

    // Update status
    ticket.paymentStatus = "cancelled";
    await ticket.save();

    res.json({
      message: "Ticket cancelled successfully",
      ticket,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
module.exports = { bookTicket,getMyTickets,confirmPayment, cancelTicket };