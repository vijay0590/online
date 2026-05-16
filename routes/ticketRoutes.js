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

// 1. Initialize ticket booking (PENDING state)
// WAS: router.post("/", protect, bookTicket);
router.post("/book", protect, bookTicket); 

// 2. Get logged-in user's tickets
// WAS: router.get("/my", protect, getMyTickets);
router.get("/my-tickets", protect, getMyTickets); 

// 3. Verify Razorpay payment and finalize booking (COMPLETED state)
// WAS: router.post("/pay", protect, confirmPayment);
router.post("/verify", protect, confirmPayment); 

// 4. Cancel ticket
router.delete("/:id", protect, cancelTicket);

// 5. Transfer ticket
router.put("/transfer/:id", protect, transferTicket);

module.exports = router;