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

    // Validate
    if (!eventId || !quantity) {
      return res.status(400).json({ message: "eventId and quantity required" });
    }
 //user check
    if (req.user.role !== "user") {
  return res.status(403).json({ message: "Only users can book tickets" });
}
    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "event not found" });
    }

    // Check approval
    if (event.status !== "APPROVED") {
      return res.status(400).json({ message: "event not available for booking" });
    }

    // Find ticket type
    const selectedType = event.ticketTypes.find(
      (t) => t.type === ticketType
    );

    if (!selectedType) {
      return res.status(404).json({ message: "invalid ticket type" });
    }

    // Check availability
    if (selectedType.available < quantity) {
      return res.status(400).json({ message: "Not enough tickets available" });
    }
   

    // Total price
    const totalPrice = selectedType.price * quantity;

    // Create ticket (PENDING until payment)
    const ticket = await Ticket.create({
      user: req.user._id,
      event: eventId,
      ticketType,
      quantity,
      paymentMethod,
      totalPrice,
      status: "BOOKED",
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
    const tickets = await Ticket.find({
      user: req.user._id,
    })
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

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "ticket not found" });
    }

    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "not authorised" });
    }

    // Prevent duplicate payment
    if (ticket.paymentStatus === "COMPLETED") {
      return res.status(400).json({ message: "Payment already completed" });
    }

    // Update payment + status
    ticket.paymentStatus = "COMPLETED";
    ticket.status = "BOOKED";
    ticket.razorpay_payment_id = razorpay_payment_id;
    ticket.razorpay_order_id = razorpay_order_id;

    await ticket.save();

    // Reduce ticket availability ONLY AFTER PAYMENT
    const event = await Event.findById(ticket.event);
    const selectedType = event.ticketTypes.find(
      (t) => t.type === ticket.ticketType
    );

    if (selectedType) {
      selectedType.available -= ticket.quantity;
      await event.save();
    }

    // Send email
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

// =======================
// CANCEL TICKET
// =======================
const cancelTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    //  Ticket not found
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    //  Ownership check
    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Only paid tickets can be cancelled
    if (ticket.paymentStatus !== "COMPLETED") {
      return res.status(400).json({ message: "Cannot cancel unpaid ticket" });
    }

    //  Prevent double cancel
    if (ticket.status === "CANCELLED") {
      return res.status(400).json({ message: "Ticket already cancelled" });
    }

    // Update ticket status
    ticket.status = "CANCELLED";
    await ticket.save();

    // Restore ticket availability
    const event = await Event.findById(ticket.event);

    if (event) {
      const selectedType = event.ticketTypes.find(
        (t) => t.type === ticket.ticketType
      );

      if (selectedType) {
        selectedType.available += ticket.quantity;

        // 🔥 safety: don't exceed total
        if (selectedType.available > selectedType.total) {
          selectedType.available = selectedType.total;
        }

        await event.save();
      }
    }

    res.json({
      message: "Ticket cancelled successfully",
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

    // Ownership check
    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised" });
    }

    // Only BOOKED tickets can be transferred
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