const mongoose=require('mongoose');
const ticketSchema= new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    
    },
    event:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Event",
        required:true,
    },
    ticketType:{
        type:String,
        default:"general"
    },
    quantity:{
        type:Number,
        required:true,
        min:1,
    },
    totalPrice:{
        type:Number,
        required:true,
    },
    paymentMethod: {
        type: String,
        enum: ["card", "upi", "wallet"],
        required: true,
},
    paymentStatus:{
        type:String,
        enum:["pending","completed","failed","cancelled"],
        default:"pending",
        required:true

    },

},{timestamps:true});
module.exports=mongoose.model("Ticket",ticketSchema);