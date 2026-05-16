const express = require('express');
const router = express.Router();
const {
  bookTicket,
  getMyTickets,
  confirmPayment,
  cancelTicket,
  transferTicket
} = require("../controllers/ticketController");
const { protect } = require("../middleware/auth");

// Map structural request routers
router.post("/book", protect, bookTicket);
router.post("/verify", protect, confirmPayment);
router.get("/my-tickets", protect, getMyTickets);
router.delete("/:id", protect, cancelTicket);
router.put("/transfer/:id", protect, transferTicket);

module.exports = router;