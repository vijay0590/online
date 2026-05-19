const express = require("express");
const router = express.Router();

const {
  bookTicket,
  getMyTickets,
  confirmPayment,
  cancelTicket,
  transferTicket
} = require("../controllers/ticketController");

const { protect } = require("../middleware/auth");

// BOOK TICKET
router.post("/book", protect, bookTicket);

// VERIFY PAYMENT
router.post("/verify", protect, confirmPayment);

// GET USER TICKETS
router.get("/my", protect, getMyTickets);

// CANCEL TICKET
router.delete("/:id", protect, cancelTicket);

// TRANSFER TICKET
router.put("/transfer/:id", protect, transferTicket);

module.exports = router;