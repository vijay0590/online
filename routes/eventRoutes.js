const express= require('express');
const router=express.Router();
const {createEvent,getEvents,updateEvent,deleteEvent,updateEventSchedule,getEventAttendees}=require("../controllers/eventController")
const {protect,authorizeRoles}=require("../middleware/auth");
const upload=require("../middleware/uploadMiddleware")
//create event with image uploads
router.post("/",protect,authorizeRoles("organiser"),upload.single("image"),createEvent);
//public routes
router.get("/",getEvents)
//updateEvent
router.put("/:id",protect,updateEvent)
//delete event
router.delete("/:id",protect,deleteEvent)
//update event schedule
router.put("/:id/schedule",protect,updateEventSchedule);
//get event attendees
router.get("/:id/attendees",protect,authorizeRoles("admin","organiser"),getEventAttendees)
module.exports=router;