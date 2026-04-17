const express=require("express");
const router=express.Router();
const{getMyProfile,updateProfile,updateUserRole}=require("../controllers/userController");
const {protect,authorizeRoles}=require("../middleware/auth")
//get profile
router.get("/me",protect,getMyProfile);
//update profile
router.put("/me",protect,updateProfile);

//update role
router.put("/role/:id",protect,authorizeRoles("admin"),updateUserRole);
module.exports=router;