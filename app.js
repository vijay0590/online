const express = require("express");
const cors = require('cors');
const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// middlewares
app.use(express.json());

app.use(cors({
    origin: "*", 
    exposedHeaders: ["request-id"] 
}));

// img uploads
app.use("/uploads", express.static("uploads"));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payment", paymentRoutes);

app.get("/", (req, res) => {
    res.send("api running");
});

// error handling
app.use((err, req, res, next) => {
    console.error(err.stack); // Added console log for better debugging in live
    res.status(500).json({ message: err.message });
});

module.exports = app;