const mongoose=require('mongoose');
const eventSchema=new mongoose.Schema(
    {
        title:{
            type:String,
            required:true,
            trim:true

        },
        description:{
           type:String,
           required:true
        },

        date:{
            type:Date,
            required:true
        },
        time:{
            type:String,
            required:true
        },
        location:{
            type:String,
            required:true

        },
        category:{
            type:String,
            default:"general"
        },
        price:{
            type:Number,
            required:true
        },
        images:[
            {type:String}
        ],
        organiser:{
            type:mongoose.Schema.Types.ObjectId,
            ref:User,
            required:true
        },
        status:{
            type:String,
            enum:["pending","approved","rejected"],
            default:"pending"

        }

        
       


    },{timeatamps:true}
);
module.exports=mongoose.model("event",eventSchema);