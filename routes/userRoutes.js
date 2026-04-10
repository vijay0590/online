const express=require("express");
const router=express.Router();
const {protect}=require("../middleware/auth")
const{getMyProfile,updateProfile}=require("../controllers/userController");
//get profile
router.get("/me",protect,getMyProfile);
//update profile
router.put("/me",protect,updateProfile);
module.exports=router;
