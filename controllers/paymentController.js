const Razorpay = require("razorpay");
const crypto = require("crypto");
const Ticket = require("../models/Ticket");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET
});

// CREATE ORDER
const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "order_" + Date.now(),
    });

    res.json(order);

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Order creation failed"
    });
  }
};

// VERIFY PAYMENT
const verifyPayment = async (req, res) => {

  console.log("VERIFY BODY:", req.body);

  try {

    const {
      ticketId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const body =
      razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    // VERIFY SIGNATURE
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        message: "Invalid signature"
      });
    }

    // UPDATE TICKET STATUS
    await Ticket.findByIdAndUpdate(ticketId, {
      paymentStatus: "COMPLETED",
      razorpay_payment_id,
      razorpay_order_id
    });

    res.json({
      success: true,
      message: "Payment verified successfully",
      razorpay_payment_id,
      razorpay_order_id
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Verification failed",
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment
};