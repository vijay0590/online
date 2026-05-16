const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const User = require("../models/User");
const sendEmail = require("../config/sendEmail");

// =======================
// BOOK TICKET
// =======================
const bookTicket = async (req, res) => {
  try {
    const { eventId, quantity, ticketType, paymentMethod } = req.body;

    if (!eventId || !quantity || !ticketType) {
      return res.status(400).json({ message: "eventId, quantity, and ticketType are required" });
    }

    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Only users can book tickets" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.status !== "APPROVED") {
      return res.status(400).json({ message: "Event is not available for booking" });
    }

    const selectedType = event.ticketTypes.find((t) => t.type === ticketType);
    if (!selectedType) {
      return res.status(404).json({ message: "Invalid ticket type" });
    }

    if (selectedType.available < quantity) {
      return res.status(400).json({ message: "Not enough tickets available" });
    }

    const totalPrice = selectedType.price * quantity;

    // Create the ticket tracker as PENDING
    const ticket = await Ticket.create({
      user: req.user._id,
      event: eventId,
      ticketType,
      quantity,
      paymentMethod: paymentMethod || "razorpay",
      totalPrice,
      status: "PENDING", 
      paymentStatus: "PENDING",
      razorpay_order_id: req.body.razorpay_order_id || "",
      razorpay_payment_id: req.body.razorpay_payment_id || ""
    });

    res.status(201).json({
      message: "Ticket initialization successful.",
      ticket,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// GET MY TICKETS
// =======================
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user._id })
      .populate("event", "title date time location price images")
      .sort({ createdAt: -1 });

    res.json({
      total: tickets.length,
      active: tickets.filter(t => t.status === "BOOKED").length,
      cancelled: tickets.filter(t => t.status === "CANCELLED").length,
      pending: tickets.filter(t => t.status === "PENDING").length,
      tickets,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// CONFIRM PAYMENT
// =======================
const confirmPayment = async (req, res) => {
  try {
    const { ticketId, razorpay_payment_id, razorpay_order_id } = req.body;

    if (!ticketId) {
      return res.status(400).json({ message: "ticketId parameter is required" });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket record not found" });
    }

    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to verify this transaction" });
    }

    if (ticket.paymentStatus === "COMPLETED") {
      return res.json({ message: "Payment already processed previously", ticket });
    }

    // 🔥 ATOMIC PROTECTION & BALANCED LOGIC LOGS
    // Deducts availability AND increments the booked property at the exact same time
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: ticket.event,
        "ticketTypes.type": ticket.ticketType,
        "ticketTypes.available": { $gte: ticket.quantity } 
      },
      {
        $inc: { 
          "ticketTypes.$.available": -ticket.quantity,
          "ticketTypes.$.booked": ticket.quantity 
        }
      },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(400).json({ 
        message: "Tickets sold out while transaction was processing. Please contact support for an immediate refund." 
      });
    }

    // Finalize state values since database row allocations match up safely
    ticket.paymentStatus = "COMPLETED";
    ticket.status = "BOOKED";
    ticket.razorpay_payment_id = razorpay_payment_id;
    ticket.razorpay_order_id = razorpay_order_id;
    await ticket.save();

    // Dispatches verification email copies
    const user = await User.findById(ticket.user);
    if (user && user.email) {
      await sendEmail(
        user.email,
        "Ticket Confirmation",
        `Your booking is confirmed! 🎉\nEvent Ticket: ${ticket.ticketType}\nQuantity: ${ticket.quantity}\nTotal Paid: ₹${ticket.totalPrice}`
      );
    }

    res.json({ message: "Payment validated and booking finalized successfully", ticket });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// CANCEL TICKET
// =======================
const cancelTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket details not found" });
    }

    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to modify this resource" });
    }

    if (ticket.status === "CANCELLED") {
      return res.status(400).json({ message: "Ticket is already cancelled" });
    }

    const wasPaid = ticket.paymentStatus === "COMPLETED";

    ticket.status = "CANCELLED";
    ticket.paymentStatus = "CANCELLED";
    await ticket.save();

    // If it was a paid booking, reverse allocations from both available and booked trackers
    if (wasPaid) {
      await Event.updateOne(
        { _id: ticket.event, "ticketTypes.type": ticket.ticketType },
        { 
          $inc: { 
            "ticketTypes.$.available": ticket.quantity,
            "ticketTypes.$.booked": -ticket.quantity
          } 
        }
      );
    }

    res.json({
      message: wasPaid 
        ? "Ticket cancelled successfully and capacities restored." 
        : "Unpaid temporary transaction record cancelled.",
      ticket,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// TRANSFER TICKET
// =======================
const transferTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { newUserEmail } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket asset not found" });
    }

    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Operation not authorized" });
    }

    if (ticket.status !== "BOOKED") {
      return res.status(400).json({ message: "Only fully paid and active tickets can be transferred" });
    }

    const newUser = await User.findOne({ email: newUserEmail });
    if (!newUser) {
      return res.status(404).json({ message: "Destination recipient user email not found" });
    }

    ticket.user = newUser._id;
    await ticket.save();

    res.json({
      message: "Ticket transfer processed successfully",
      ticket,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  bookTicket,
  getMyTickets,
  confirmPayment,
  cancelTicket,
  transferTicket,
};