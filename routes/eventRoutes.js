const express=require('express');
const router=express.Router();
const {createEvent,getEvents,updateEvent,deleteEvent,updateEventSchedule,
    getEventAttendees, getEventById,getMyEvents,exportAttendees,updateEventStatus,getPendingEvents}=require("../controllers/eventController")
const {protect,authorizeRoles}=require("../middleware/auth");
const upload=require("../middleware/uploadMiddleware")
//create event with image uploads
router.post("/",protect,authorizeRoles("organiser"),upload.single("image"),createEvent);
//public routes
router.get("/",getEvents)
//pending event status
router.get("/pending", protect, authorizeRoles("admin"), getPendingEvents);
//get my events
router.get("/me", protect, authorizeRoles("organiser"), getMyEvents);
//get eventbyid
router.get("/:id",getEventById)
//protected routes
//updateEvent
router.put("/:id",protect,upload.single("image"),updateEvent)
//updateEvent status
router.put("/:id/status",protect,authorizeRoles("admin"),updateEventStatus)
//delete event
router.delete("/:id",protect,deleteEvent)
//update event schedule
router.put("/:id/schedule",protect,updateEventSchedule);
//get event attendees
router.get("/:id/attendees",protect,authorizeRoles("admin","organiser"),getEventAttendees)
router.get("/:id/attendees/export",protect,authorizeRoles("admin","organiser"),exportAttendees)
module.exports=router;