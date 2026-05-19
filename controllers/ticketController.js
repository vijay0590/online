const crypto = require("crypto");
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const User = require("../models/User");
const sendEmail = require("../config/sendEmail");

// =======================
// BOOK TICKET
// =======================
const bookTicket = async (req, res) => {
  try {

    const { eventId, quantity, ticketType } = req.body;

    if (!eventId || !quantity || !ticketType) {
      return res.status(400).json({
        message: "eventId, quantity, and ticketType are required"
      });
    }

    if (req.user.role !== "user") {
      return res.status(403).json({
        message: "Only users can book tickets"
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    if (event.status !== "APPROVED") {
      return res.status(400).json({
        message: "Event is not available for booking"
      });
    }

    const selectedType = event.ticketTypes.find(
      (t) => t.type.toLowerCase() === ticketType.toLowerCase()
    );

    if (!selectedType) {
      return res.status(404).json({
        message: "Invalid ticket type selection"
      });
    }

    if (selectedType.available < quantity) {
      return res.status(400).json({
        message: "Not enough tickets available"
      });
    }

    const totalPrice = selectedType.price * quantity;

    // CREATE PENDING TICKET
    const ticket = await Ticket.create({
      user: req.user._id,
      event: eventId,
      ticketType: selectedType.type,
      quantity,
      totalPrice,
      status: "BOOKED",
      paymentStatus: "PENDING"
    });

    res.status(201).json({
      message: "Ticket initialized successfully",
      ticket
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: error.message
    });

  }
};

// =======================
// CONFIRM PAYMENT
// =======================
const confirmPayment = async (req, res) => {
  try {

    const {
      ticketId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    } = req.body;

    if (!ticketId) {
      return res.status(400).json({
        message: "ticketId parameter is required"
      });
    }

    // VERIFY RAZORPAY SIGNATURE
    const body =
      razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        message: "Invalid payment signature"
      });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket tracking record not found"
      });
    }

    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to modify this resource"
      });
    }

    // PREVENT DOUBLE PAYMENT
    if (ticket.paymentStatus === "COMPLETED") {
      return res.json({
        message: "Payment already processed",
        ticket
      });
    }

    // REDUCE AVAILABLE SEATS
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: ticket.event,
        "ticketTypes.type": ticket.ticketType,
        "ticketTypes.available": {
          $gte: ticket.quantity
        }
      },
      {
        $inc: {
          "ticketTypes.$.available": -ticket.quantity,
          "ticketTypes.$.booked": ticket.quantity
        }
      },
      { new: true }
    );

    // SOLD OUT DURING PAYMENT
    if (!updatedEvent) {

      ticket.paymentStatus = "FAILED";

      await ticket.save();

      return res.status(400).json({
        message:
          "Tickets sold out while transaction was processing"
      });
    }

    // FINALIZE PAYMENT
    ticket.paymentStatus = "COMPLETED";
    ticket.paymentId = razorpay_payment_id || "";
    ticket.orderId = razorpay_order_id || "";

    await ticket.save();

    // SEND EMAIL
    const user = await User.findById(ticket.user);

    if (user && user.email) {

      sendEmail(
        user.email,
        "Ticket Confirmation Details",
        `Your booking is confirmed! 🎉
Ticket Category: ${ticket.ticketType}
Quantity: ${ticket.quantity}
Total Paid: ₹${ticket.totalPrice}`
      ).catch(console.error);

    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      ticket
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: error.message
    });

  }
};

// =======================
// GET MY TICKETS
// =======================
const getMyTickets = async (req, res) => {
  try {

    const tickets = await Ticket.find({
      user: req.user._id,
      paymentStatus: {
        $in: ["COMPLETED", "CANCELLED"]
      }
    })
      .populate(
        "event",
        "title date time location price images"
      )
      .sort({ createdAt: -1 });

    res.json({
      total: tickets.length,
      active: tickets.filter(
        (t) =>
          t.status === "BOOKED" &&
          t.paymentStatus === "COMPLETED"
      ).length,
      cancelled: tickets.filter(
        (t) => t.status === "CANCELLED"
      ).length,
      tickets
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};

// =======================
// CANCEL TICKET
// =======================
const cancelTicket = async (req, res) => {
  try {

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found"
      });
    }

    if (
      ticket.user.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    if (ticket.status === "CANCELLED") {
      return res.status(400).json({
        message: "Ticket already cancelled"
      });
    }

    const wasPaid =
      ticket.paymentStatus === "COMPLETED";

    ticket.status = "CANCELLED";
    ticket.paymentStatus = "CANCELLED";

    await ticket.save();

    // RESTORE TICKETS
    if (wasPaid) {

      await Event.updateOne(
        {
          _id: ticket.event,
          "ticketTypes.type": ticket.ticketType
        },
        {
          $inc: {
            "ticketTypes.$.available":
              ticket.quantity,
            "ticketTypes.$.booked":
              -ticket.quantity
          }
        }
      );

    }

    res.json({
      message: "Ticket cancelled successfully",
      ticket
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

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
      return res.status(404).json({
        message: "Ticket not found"
      });
    }

    if (
      ticket.user.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "Unauthorized action"
      });
    }

    if (
      ticket.status !== "BOOKED" ||
      ticket.paymentStatus !== "COMPLETED"
    ) {
      return res.status(400).json({
        message:
          "Only completed tickets can be transferred"
      });
    }

    const newUser = await User.findOne({
      email: newUserEmail
    });

    if (!newUser) {
      return res.status(404).json({
        message: "Target user not found"
      });
    }

    // PREVENT SELF TRANSFER
    if (
      newUser._id.toString() ===
      req.user._id.toString()
    ) {
      return res.status(400).json({
        message:
          "Cannot transfer ticket to yourself"
      });
    }

    ticket.user = newUser._id;

    await ticket.save();

    res.json({
      message: "Ticket transferred successfully",
      ticket
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};

module.exports = {
  bookTicket,
  getMyTickets,
  confirmPayment,
  cancelTicket,
  transferTicket
};