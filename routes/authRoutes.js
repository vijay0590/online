const express=require('express');
const router =express.Router();
const{registerUser, loginUser}=require('../controllers/authController');
const {protect,authorizeRoles}=require("../middleware/auth");

//setup routes
router.post("/register",registerUser);
router.post("/login",loginUser);
router.get("/me",protect,(req,res)=>{
    res.json({message:"protected route accessed",user:req.user,})
});
// ADMIN ONLY
router.get("/admin", protect, authorizeRoles("admin"), (req, res) => {
  res.json({ message: "Welcome Admin" })
});

// ORGANIZER ONLY
router.get("/organizer", protect, authorizeRoles("organizer"), (req, res) => {
  res.json({ message: "Welcome Organizer" })
});
module.exports=router;
