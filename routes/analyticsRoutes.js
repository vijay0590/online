const express=require("express");
const router=express.Router();
const {getOverallAnalytics,getEventAnalytics}=require("../controllers/analyticsController");
const{protect,authorizeRoles}=require("../middleware/auth");
//admin only
router.get("/overall",protect,authorizeRoles("admin"),getEventAnalytics);
router.get("/events",protect,authorizeRoles("admin"),getEventAnalytics);
module.exports=router