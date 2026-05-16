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
      // NOTE: Ensure these case types match what your Event creator uses!
      enum: ["general", "vip", "General", "VIP"], 
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
      default: "BOOKED" // Initial state is BOOKED, but paymentStatus tracks confirmation
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED"],
      default: "PENDING",
    },
    paymentId: {
      type: String,
      default: ""
    },
    orderId: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);