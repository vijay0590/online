const express=require("express");
const router=express.Router();
const {getOverallAnalytics,getEventAnalytics}=require("../controllers/analyticsController");
const{protect,authorizeRoles}=require("../middleware/auth");
//admin only
router.get("/overall",protect,authorizeRoles("admin","organiser"),getOverallAnalytics);
router.get("/events",protect,authorizeRoles("admin","organiser"),getEventAnalytics);
module.exports=router