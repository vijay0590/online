const jwt = require('jsonwebtoken');
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2. If no token
    if (!token) {
      return res.status(401).json({ message: "No token found" });
    }

    // 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Get user from DB
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "No user found" });
    }

    // 5. Attach user
    req.user = user;

    next();
  } catch (error) {
    res.status(401).json({ message: "Token failed" });
  }
};
// ROLE CHECK MIDDLEWARE
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied: ${req.user.role} not allowed`,
      });
    }
    next();
  };
};

module.exports = {protect,authorizeRoles};