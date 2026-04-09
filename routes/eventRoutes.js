const express= require('express');
const router=express.Router();
const {createEvent,getEvents,updateEvent,deleteEvent}=require("../controllers/eventController")
const {protect,authorizeRoles}=require("../middleware/auth");
//create event
router.post("/",protect,authorizeRoles("organiser"),createEvent);
//public routes
router.get("/",getEvents)
//updateEvent
router.put("/:id",protect,updateEvent)
//delete event
router.delete("/:id",protect,deleteEvent)


module.exports=router;