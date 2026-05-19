const Ticket = require('../models/Ticket');
const Event = require("../models/Event");
const mongoose = require('mongoose');

const getOverallAnalytics = async (req, res) => {
    try {
        const organizerId = new mongoose.Types.ObjectId(req.user._id);

        // 1. Get total events count for this organizer
        const totalEvents = await Event.countDocuments({ organiser: organizerId });

        // 2. Unwind the nested ticketTypes array to sum capacity and availability correctly
        const capacityMetrics = await Event.aggregate([
            { $match: { organiser: organizerId } },
            { $unwind: "$ticketTypes" },
            {
                $group: {
                    _id: null,
                    totalCapacity: { $sum: "$ticketTypes.total" },
                    totalAvailable: { $sum: "$ticketTypes.available" }
                }
            }
        ]);

        const capacityData = capacityMetrics[0] || { totalCapacity: 0, totalAvailable: 0 };

        // 3. Aggregate Sales Metrics from completed tickets
        const salesResult = await Ticket.aggregate([
            {
                $lookup: {
                    from: "events",
                    localField: "event",
                    foreignField: "_id",
                    as: "eventData"
                }
            },
            { $unwind: "$eventData" },
            {
                $match: {
                    paymentStatus: "COMPLETED",
                    "eventData.organiser": organizerId
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalPrice" },
                    totalTicketsSold: { $sum: "$quantity" },
                    totalBookings: { $sum: 1 }
                }
            }
        ]);

        const salesData = salesResult[0] || {
            totalRevenue: 0,
            totalTicketsSold: 0,
            totalBookings: 0
        };

        res.json({
            totalEvents,
            totalCapacity: capacityData.totalCapacity,
            totalAvailableTickets: capacityData.totalAvailable,
            ...salesData
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getEventAnalytics = async (req, res) => {
    try {
        const organizerId = new mongoose.Types.ObjectId(req.user._id);

        const result = await Ticket.aggregate([
            { $match: { paymentStatus: "COMPLETED" } },
            {
                $lookup: {
                    from: "events",
                    localField: "event",
                    foreignField: "_id",
                    as: "eventData"
                }
            },
            { $unwind: "$eventData" },
            { $match: { "eventData.organiser": organizerId } },
            {
                $group: {
                    _id: "$event",
                    eventName: { $first: "$eventData.title" },
                    totalRevenue: { $sum: "$totalPrice" },
                    ticketSold: { $sum: "$quantity" },
                    // Calculate totals from the event's nested array structures
                    ticketTypesSnapshot: { $first: "$eventData.ticketTypes" }
                }
            },
            {
                $project: {
                    _id: 1,
                    eventName: 1,
                    totalRevenue: 1,
                    ticketSold: 1,
                    // Sum up availability across general and vip properties for this single event
                    availableTickets: {
                        $sum: "$ticketTypesSnapshot.available"
                    }
                }
            }
        ]);

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getEventAnalytics, getOverallAnalytics };