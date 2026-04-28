const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
{
    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        required: true
    },

    date: {
        type: Date,
        required: true
    },

    time: {
        type: String,
        required: true
    },

    location: {
        type: String,
        required: true
    },

    schedule: [
        {
            title: String,
            speaker: String,
            startTime: String,
            endTime: String
        }
    ],

    ticketTypes: [
        {
            type: {
                type: String,
                enum: ["general", "vip"],
                required: true
            },
            price: {
                type: Number,
                required: true
            },
              total: {      
      type: Number,
      required: true
    },
    available: {        
      type: Number,
      required: true
    },
             available: {              
      type: Number,
      required: true
    }
        }
    ],
    category:{
        type:String,
        required:true
    },

    images: [
        {
            type: String
        }
    ],

    organiser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING",
          index: true 
    }

},
{ timestamps: true }   
);

module.exports = mongoose.model("Event", eventSchema);