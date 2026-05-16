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

    if (!eventId || !quantity) {
      return res.status(400).json({ message: "eventId and quantity required" });
    }

    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Only users can book tickets" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "event not found" });
    }

    if (event.status !== "APPROVED") {
      return res.status(400).json({ message: "event not available for booking" });
    }

    const selectedType = event.ticketTypes.find((t) => t.type === ticketType);
    if (!selectedType) {
      return res.status(404).json({ message: "invalid ticket type" });
    }

    if (selectedType.available < quantity) {
      return res.status(400).json({ message: "Not enough tickets available" });
    }

    const totalPrice = selectedType.price * quantity;

    // Creates the initial ticket tracker as PENDING
    const ticket = await Ticket.create({
      user: req.user._id,
      event: eventId,
      ticketType,
      quantity,
      paymentMethod,
      totalPrice,
      status: "PENDING", 
      paymentStatus: "PENDING",
      razorpay_payment_id: req.body.razorpay_payment_id,
      razorpay_order_id: req.body.razorpay_order_id,
    });

    res.status(201).json({
      message: "Ticket created. Complete payment to confirm.",
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
// CONFIRM PAYMENT (FIXED FOR RACE CONDITIONS)
// =======================
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

    if (ticket.paymentStatus === "COMPLETED") {
      return res.status(400).json({ message: "Payment already completed" });
    }

    // 🔥 FIX: ATOMIC INVENTORY REDUCTION & LOCK
    // This updates the count directly in MongoDB ONLY if there are enough seats left right now!
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: ticket.event,
        "ticketTypes.type": ticket.ticketType,
        "ticketTypes.available": { $gte: ticket.quantity } // Guard: Must be greater or equal to quantity
      },
      {
        $inc: { "ticketTypes.$.available": -ticket.quantity } // Subtract seats safely
      },
      { new: true }
    );

    // If no event matches, it means tickets sold out while the user was paying
    if (!updatedEvent) {
      return res.status(400).json({ 
        message: "Tickets sold out while transaction was processing. Contact support for refund." 
      });
    }

    // Now update payment records safely since inventory is secure
    ticket.paymentStatus = "COMPLETED";
    ticket.status = "BOOKED";
    ticket.razorpay_payment_id = razorpay_payment_id;
    ticket.razorpay_order_id = razorpay_order_id;
    await ticket.save();

    // Send confirmation mail
    const user = await User.findById(ticket.user);
    if (user && user.email) {
      await sendEmail(
        user.email,
        "Ticket Confirmation",
        `Your ticket is confirmed 🎉\nQuantity: ${ticket.quantity}`
      );
    }

    res.json({ message: "payment successful", ticket });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// CANCEL TICKET (FIXED FOR UNPAID SYSTEM)
// =======================
const cancelTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (ticket.status === "CANCELLED") {
      return res.status(400).json({ message: "Ticket already cancelled" });
    }

    // Check if the ticket was actually paid for
    const wasPaid = ticket.paymentStatus === "COMPLETED";

    // Update ticket state values
    ticket.status = "CANCELLED";
    ticket.paymentStatus = "CANCELLED";
    await ticket.save();

    // 🔥 FIX: Only add seats back if the user originally paid for them!
    if (wasPaid) {
      await Event.updateOne(
        { _id: ticket.event, "ticketTypes.type": ticket.ticketType },
        { $inc: { "ticketTypes.$.available": ticket.quantity } }
      );
    }

    res.json({
      message: wasPaid 
        ? "Ticket cancelled successfully and inventory restored." 
        : "Unpaid reservation cancelled successfully.",
      ticket,
    });

  } catch (error) {
    console.error(error);
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
      return res.status(400).json({ message: "No ticket found" });
    }

    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised" });
    }

    if (ticket.status !== "BOOKED") {
      return res.status(400).json({ message: "Only booked tickets can be transferred" });
    }

    const newUser = await User.findOne({ email: newUserEmail });
    if (!newUser) {
      return res.status(400).json({ message: "No user found" });
    }

    ticket.user = newUser._id;
    await ticket.save();

    res.json({
      message: "Ticket transferred successfully",
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