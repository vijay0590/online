const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },

  ticketType: {
    type: String,
    enum: ["general", "vip"],
    default: "general",
    required: true,
  },

  quantity: {
    type: Number,
    required: true,
    min: 1,
  },

  totalPrice: {
    type: Number,
    required: true,
  },
status: {
  type: String,
  enum: ["BOOKED", "CANCELLED", "USED"],
  default: "BOOKED"
},
  paymentStatus: {
    type: String,
    enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED"],
    default: "PENDING",
   
  },
  paymentId:{
    type:String
  },
},
 
{ timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);