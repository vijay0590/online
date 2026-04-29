const Event = require("../models/Event");
const Ticket = require("../models/Ticket");

// =======================
// CREATE EVENT
// =======================
const createEvent = async (req, res) => {
  try {
    let {
      title,
      description,
      date,
      time,
      location,
      category,
      ticketTypes,
      schedule,
    } = req.body;

    if (schedule && typeof schedule === "string") {
      schedule = JSON.parse(schedule);
    }

    if (typeof ticketTypes === "string") {
      ticketTypes = JSON.parse(ticketTypes);
    }

    //  INIT AVAILABLE = TOTAL
    ticketTypes = ticketTypes.map((t) => ({
      ...t,
      type: t.type.toLowerCase(),
      available: t.total,
    }));

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!title || !description || !date || !time || !location || !ticketTypes?.length) {
      return res.status(400).json({ message: "All fields required" });
    }

    const event = await Event.create({
      title,
      description,
      date,
      time,
      location,
      category,
      ticketTypes,
      schedule,
      images: imagePath ? [imagePath] : [],
      organiser: req.user._id,
    });

    res.json({
      message: "Event created (pending approval)",
      event,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// GET APPROVED EVENTS
// =======================
const getEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: "APPROVED" })
      .populate("organiser", "name email")
      .sort({ createdAt: -1 });

    res.json({ events });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// GET EVENT BY ID
// =======================
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("organiser", "name email");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ event });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// GET MY EVENTS
// =======================
const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ organiser: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ events });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// UPDATE EVENT
// =======================
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    //  Authorization
    if (
      event.organiser.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    let updateData = { ...req.body };

    //  Parse schedule
    if (req.body.schedule && typeof req.body.schedule === "string") {
      updateData.schedule = JSON.parse(req.body.schedule);
    }

    //  Parse ticketTypes
    if (req.body.ticketTypes && typeof req.body.ticketTypes === "string") {
      updateData.ticketTypes = JSON.parse(req.body.ticketTypes);
    }

    //  SAFE TICKET UPDATE
    if (updateData.ticketTypes) {
      updateData.ticketTypes = updateData.ticketTypes.map((newType, i) => {
        const oldType = event.ticketTypes[i];

        const oldTotal = oldType?.total || 0;
        const oldAvailable = oldType?.available ?? oldTotal; // 🔥 prevents NaN

        const sold = oldTotal - oldAvailable;

        //  Prevent reducing below sold tickets
        if (newType.total < sold) {
          throw new Error("Total cannot be less than sold tickets");
        }

        return {
          ...newType,
          type: newType.type.toLowerCase(),
          total: Number(newType.total),
          price: Number(newType.price),
          available: Number(newType.total) - sold,
        };
      });
    }

    //  Image update
    if (req.file) {
      updateData.images = [`/uploads/${req.file.filename}`];
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      message: "Event updated successfully",
      event: updatedEvent,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// =======================
// DELETE EVENT
// =======================
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (
      event.organiser.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await event.deleteOne();

    res.json({ message: "Event deleted" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// UPDATE EVENT STATUS
// =======================
const updateEventStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    event.status = status;
    await event.save();

    res.json({ message: `Event ${status}`, event });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// GET PENDING EVENTS
// =======================
const getPendingEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: "PENDING" })
      .sort({ createdAt: -1 });

    res.json({ events });

  } catch (error) {
    console.error("Pending error:", error);
    res.status(500).json({ message: error.message });
  }
};
// =======================
// GET ALL EVENTS (ADMIN)
// =======================
const getAllEventsAdmin = async (req, res) => {
  try {
    const events = await Event.find()
      .populate("organiser", "name email")
      .sort({ createdAt: -1 });

    res.json({ events });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// UPDATE SCHEDULE
// =======================
const updateEventSchedule = async (req, res) => {
  try {
    const { schedule } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    event.schedule = schedule;
    await event.save();

    res.json({ message: "Schedule updated", event });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// GET ATTENDEES
// =======================
const getEventAttendees = async (req, res) => {
  try {
    const tickets = await Ticket.find({
      event: req.params.id,
      status: "BOOKED",
    }).populate("user", "name email");

    res.json({ attendees: tickets });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// EXPORT ATTENDEES
// =======================
const exportAttendees = async (req, res) => {
  try {
    const tickets = await Ticket.find({
      event: req.params.id,
      status: "BOOKED",
    }).populate("user", "name email");

    let csv = "Name,Email,Quantity\n";

    tickets.forEach((t) => {
      csv += `${t.user?.name},${t.user?.email},${t.quantity}\n`;
    });

    res.header("Content-Type", "text/csv");
    res.attachment("attendees.csv");
    res.send(csv);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
module.exports = {
  createEvent,
  getEvents,
  getEventById,
  getMyEvents,
  updateEvent,
  deleteEvent,
  updateEventStatus,
  getPendingEvents,
  getAllEventsAdmin,
  updateEventSchedule,
  getEventAttendees,
  exportAttendees,
};