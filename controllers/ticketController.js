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

    // Validate inputs
    if (!eventId || !quantity) {
      return res.status(400).json({ message: "eventId and quantity required" });
    }

    // Role verification
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Only users can book tickets" });
    }

    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check approval status
    if (event.status !== "APPROVED") {
      return res.status(400).json({ message: "Event not available for booking" });
    }

    // Find ticket type within array
    const selectedType = event.ticketTypes.find((t) => t.type === ticketType);
    if (!selectedType) {
      return res.status(404).json({ message: "Invalid ticket type" });
    }

    // Check temporary or immediate availability pool constraints
    if (selectedType.available < quantity) {
      return res.status(400).json({ message: "Not enough tickets available" });
    }

    // Calculate dynamic total price
    const totalPrice = selectedType.price * quantity;

    // Create tracking ticket document (Initial reservation state)
    const ticket = await Ticket.create({
      user: req.user._id,
      event: eventId,
      ticketType,
      quantity,
      paymentMethod,
      totalPrice,
      status: "PENDING", // Correct initialization state tracking
      paymentStatus: "PENDING",
      razorpay_payment_id: req.body.razorpay_payment_id,
      razorpay_order_id: req.body.razorpay_order_id,
    });

    res.status(201).json({
      message: "Ticket initialized. Complete payment validation to confirm seat allocations.",
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

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket documentation not found" });
    }

    // Tenant Access Protection Check
    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to modify this resource" });
    }

    // Block double execution workflows
    if (ticket.paymentStatus === "COMPLETED") {
      return res.status(400).json({ message: "Payment tracking records show complete history already" });
    }

    // Atomic Capacity Verification Guard Check
    const event = await Event.findById(ticket.event);
    if (!event) {
      return res.status(404).json({ message: "Associated event model reference could not be located" });
    }

    const selectedType = event.ticketTypes.find((t) => t.type === ticket.ticketType);
    if (!selectedType || selectedType.available < ticket.quantity) {
      return res.status(400).json({ message: "The remaining ticket pool allocation was fully depleted before execution finalized" });
    }

    // Finalize state allocations
    ticket.paymentStatus = "COMPLETED";
    ticket.status = "BOOKED";
    ticket.razorpay_payment_id = razorpay_payment_id;
    ticket.razorpay_order_id = razorpay_order_id;
    await ticket.save();

    // Deduct standard capacity parameters from structural event layout
    selectedType.available -= ticket.quantity;
    await event.save();

    // Outbound distribution receipt execution
    const user = await User.findById(ticket.user);
    if (user && user.email) {
      await sendEmail(
        user.email,
        "Ticket Confirmation",
        `Your ticket registration has been fully confirmed 🎉\nQuantity: ${ticket.quantity}\nTicket Category Type: ${ticket.ticketType}`
      );
    }

    res.json({ message: "Payment processed successfully and inventory updated", ticket });

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
      return res.status(404).json({ message: "Ticket context could not be located" });
    }

    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Resource modification access rejected" });
    }

    if (ticket.status === "CANCELLED") {
      return res.status(400).json({ message: "Ticket entity historical states show cancel records already" });
    }

    // Determine state structure properties
    const wasPaidTicket = ticket.paymentStatus === "COMPLETED";

    // Reassign context structural values safely
    ticket.status = "CANCELLED";
    ticket.paymentStatus = "CANCELLED";
    await ticket.save();

    // INVENTORY RESTORATION: Run ONLY if the ticket was paid for and seats were subtracted
    if (wasPaidTicket) {
      const event = await Event.findById(ticket.event);
      if (event) {
        const selectedType = event.ticketTypes.find((t) => t.type === ticket.ticketType);
        if (selectedType) {
          selectedType.available += ticket.quantity;

          // Boundary constraint safety logic
          if (selectedType.available > selectedType.total) {
            selectedType.available = selectedType.total;
          }

          await event.save();
        }
      }
    }

    res.json({
      message: wasPaidTicket 
        ? "Ticket cancelled successfully and inventory seat pools restored." 
        : "Unpaid temporary booking registration has been completely flushed out.",
      ticket,
    });

  } catch (error) {
    console.error("Cancellation routing error:", error);
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
      return res.status(404).json({ message: "No ticket tracking instance matches ID description" });
    }

    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Operation ownership credentials not verified" });
    }

    if (ticket.status !== "BOOKED") {
      return res.status(400).json({ message: "Only fully confirmed and paid ticket assets qualify for cross-profile assignments" });
    }

    const newUser = await User.findOne({ email: newUserEmail });
    if (!newUser) {
      return res.status(404).json({ message: "Destination recipient profile cannot be located by registration email tracking fields" });
    }

    ticket.user = newUser._id;
    await ticket.save();

    res.json({
      message: "Ticket property context successfully linked to new user registration profiles.",
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