const express=require("express");
const router=express.Router();
const {getAllTickets,getAllUsers,paymentStats,getAdminStats,deleteUser}=require("../controllers/adminController");
const{protect,authorizeRoles}=require("../middleware/auth")

//admin only routes
router.get("/",protect,authorizeRoles("admin"),getAdminStats);
router.get("/users", protect, authorizeRoles("admin"), getAllUsers);
router.delete("/users/:id", protect, authorizeRoles("admin"), deleteUser);
router.get("/tickets", protect, authorizeRoles("admin"), getAllTickets);
router.get("/payments", protect, authorizeRoles("admin"), paymentStats);
module.exports=router;