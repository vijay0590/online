const express = require("express");
const router = express.Router();

const {
  createEvent,
  getEvents,
  updateEvent,
  deleteEvent,
  updateEventSchedule,
  getEventAttendees,
  getEventById,
  getMyEvents,
  exportAttendees,
  updateEventStatus,
  getPendingEvents,
  getAllEventsAdmin, // ✅ make sure you added this in controller
} = require("../controllers/eventcontroller");

const { protect, authorizeRoles } = require("../middleware/auth");
const upload = require("../middleware/uploadMiddleware");

// =======================
// PUBLIC ROUTES
// =======================
router.get("/", getEvents);

// =======================
// ADMIN ROUTES
// =======================
router.get("/admin/pending", protect, authorizeRoles("admin"), getPendingEvents);

router.get("/admin/all", protect, authorizeRoles("admin"), getAllEventsAdmin);

router.put(
  "/admin/:id/status",
  protect,
  authorizeRoles("admin"),
  updateEventStatus
);

// =======================
// ORGANISER ROUTES
// =======================
router.post(
  "/",
  protect,
  authorizeRoles("organiser"),
  upload.single("image"),
  createEvent
);

router.get("/me", protect, authorizeRoles("organiser"),getMyEvents);

// =======================
// ATTENDEES (ADMIN + ORGANISER)
// =======================
router.get(
  "/:id/attendees",
  protect,
  authorizeRoles("admin", "organiser"),
  getEventAttendees
);

router.get(
  "/:id/attendees/export",
  protect,
  authorizeRoles("admin", "organiser"),
  exportAttendees
);


// =======================
// GENERAL ROUTES
// =======================
router.get("/:id", getEventById);

// =======================
// PROTECTED ROUTES
// =======================
router.put("/:id", protect, upload.single("image"), updateEvent);

router.delete("/:id", protect, deleteEvent);

router.put("/:id/schedule", protect, updateEventSchedule);

module.exports = router;