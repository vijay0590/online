const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const User = require("../models/User");
const sendEmail = require("../config/sendEmail");

// =======================
// BOOK TICKET (Initialization Step)
// =======================
const bookTicket = async (req, res) => {
  try {
    const { eventId, quantity, ticketType } = req.body;

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

    const selectedType = event.ticketTypes.find(
      (t) => t.type.toLowerCase() === ticketType.toLowerCase()
    );
    if (!selectedType) {
      return res.status(404).json({ message: "Invalid ticket type selection" });
    }

    if (selectedType.available < quantity) {
      return res.status(400).json({ message: "Not enough tickets available" });
    }

    const totalPrice = selectedType.price * quantity;

    // Create the initial baseline booking document marked as payment status PENDING
    const ticket = await Ticket.create({
      user: req.user._id,
      event: eventId,
      ticketType: selectedType.type, // Preserve database case integrity
      quantity,
      totalPrice,
      status: "BOOKED", 
      paymentStatus: "PENDING"
    });

    res.status(201).json({
      message: "Ticket initialized successfully. Complete payment integration verification.",
      ticket,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// CONFIRM PAYMENT (Secure Verification Step)
// =======================
const confirmPayment = async (req, res) => {
  try {
    const { ticketId, razorpay_payment_id, razorpay_order_id } = req.body;

    if (!ticketId) {
      return res.status(400).json({ message: "ticketId parameter is required" });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket tracking record not found" });
    }

    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to modify this resource" });
    }

    if (ticket.paymentStatus === "COMPLETED") {
      return res.json({ message: "Payment already processed", ticket });
    }

    // 🔥 ATOMIC CONCURRENCY GUARD: Decrement available seats & increment booked count simultaneously
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
      // If the event layout update returns null, it means inventory dried up during the payment step
      ticket.paymentStatus = "FAILED";
      await ticket.save();
      return res.status(400).json({ 
        message: "Tickets sold out while transaction was processing. Contact support for a refund." 
      });
    }

    // Finalize metrics on verified ticket document
    ticket.paymentStatus = "COMPLETED";
    ticket.paymentId = razorpay_payment_id || "";
    ticket.orderId = razorpay_order_id || "";
    await ticket.save();

    // Dispatch mail confirmation copies
    const user = await User.findById(ticket.user);
    if (user && user.email) {
      await sendEmail(
        user.email,
        "Ticket Confirmation Details",
        `Your booking is confirmed! 🎉\nTicket Category: ${ticket.ticketType}\nQuantity: ${ticket.quantity}\nTotal Paid: ₹${ticket.totalPrice}`
      );
    }

    res.json({ message: "Payment validated and tracking metrics synchronized.", ticket });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// GET MY TICKETS
// =======================
const getMyTickets = async (req, res) => {
  try {
    // Only fetch valid, completed bookings or user-canceled logs for their dashboard profile view
    const tickets = await Ticket.find({ 
      user: req.user._id,
      paymentStatus: { $in: ["COMPLETED", "CANCELLED"] }
    })
      .populate("event", "title date time location price images")
      .sort({ createdAt: -1 });

    res.json({
      total: tickets.length,
      active: tickets.filter(t => t.status === "BOOKED" && t.paymentStatus === "COMPLETED").length,
      cancelled: tickets.filter(t => t.status === "CANCELLED").length,
      tickets,
    });

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
      return res.status(404).json({ message: "Ticket instance not found" });
    }

    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Operation not authorized" });
    }

    if (ticket.status === "CANCELLED") {
      return res.status(400).json({ message: "Ticket already marked cancelled" });
    }

    const wasPaid = ticket.paymentStatus === "COMPLETED";

    ticket.status = "CANCELLED";
    ticket.paymentStatus = "CANCELLED";
    await ticket.save();

    // Revert database seat positions only if original transaction cleared successfully
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
        : "Unpaid transaction record discarded.",
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
      return res.status(404).json({ message: "Ticket record data asset missing" });
    }

    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    if (ticket.status !== "BOOKED" || ticket.paymentStatus !== "COMPLETED") {
      return res.status(400).json({ message: "Only fully verified tickets can be transferred" });
    }

    const newUser = await User.findOne({ email: newUserEmail });
    if (!newUser) {
      return res.status(404).json({ message: "Target user profile email structure not found" });
    }

    ticket.user = newUser._id;
    await ticket.save();

    res.json({ message: "Ticket transferred successfully", ticket });

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