const Event=require('../models/Event');
const Ticket=require("../models/Ticket")

//create event
const createEvent=async(req,res)=>{
    try{
        const {
            title,
            description,
            date,
            time,
            location,
            category,
            ticketTypes,
            images
        }=req.body;
            const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
        if(!title || !description ||!date ||!time ||!location ||!ticketTypes){
            return res.status(400).json({message:"All fields required"})
        }
        //create event
        const event=await Event.create({

             title,
            description,
            date,
            time,
            location,
            category,
            ticketTypes,
            images: imagePath ? [imagePath] : [],
            organiser:req.user._id,
        });

        //response
        res.status(200).json({message:"event created sucessfully(pending approval)",
            event,
        });

    }catch(error){
        res.status(500).json({message:error.message})
    }


}

const getEvents=async(req,res)=>{
    try{
        const {search,location,minPrice,maxPrice,date}=req.query;
        let query={status:"approved"};
        //search by title
        if(search){
            query.title={$regex :search, $options:"i"}
        }
        //filter by location
        if(location){
            query.location={$regex:location,$options:"i"}
        }
        //search by price
        if(minPrice||maxPrice){
            query.price={};
            if(minPrice) query.price.$gte=Number(minPrice)
           if(maxPrice) query.price.$lte=Number(maxPrice)
        }
     //filter by date
     if(date){
        query.date=new Date(date)
     }

        const events=await Event.find(query)
        .populate("organiser","name email")
        .sort({createdAt:-1});
        //response
        res.status(200).json({count:events.length,events})

        
    }catch(error){
        res.status(500).json({message:error.message})
    }
}
//get event by id
const getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id.trim())
            .populate("organiser", "name email");
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        res.status(200).json({ event });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
//update event
const updateEvent=async(req,res)=>{
    try{
        const event =await Event.findById(req.params.id)

        if(!event){
            return res.status(404).json({message:"No event fount"})
            //check ownership or admin
            if(
                event.organiser.toString() !==req.user._id.tostring() &&
                req.user.role !== "admin"
            )
            res.status(403).json({message:"not authorized to update this event"})
        }
        //updated event
        const updatedEvent=await Event.findByIdAndUpdate(
            req.params.id,
            req.body,
            {new:true}
        )
        res.json({message:"updated event successfully",event:updatedEvent})

    }catch(error){
        res.status(500).json({message:error.message})

    }

};
const deleteEvent=async(req,res)=>{
    try{
        const event= await Event.findById(req.params.id)
        if(!event){
            return res.status(404).json({message:"not event found"})
        }
       // check ownership or admin
       if(
        event.organiser.toString() !== req.user._id.toString() &&
        req.role.user !== "admin"
       ){
        return res.status(403).json({message:"not authorised to delete this event"})
       }
       await event.deleteOne();
       res.json({message:"event deleted succesfully"})

    }catch(error){
        res.status(500).json({message:error.message})
    }
};
const updateEventSchedule=async(req,res)=>{
    try{
        const {schedule} = req.body
        const event=await Event.findById(req.param.id)
        if(!event){
            return res.status(400).jao({message:"no event found"})
        }
        //chech ownership/admin
        if(event.organiser.toString() !== req.user._id &&
         req.user.role !== "admin"){
           return  res.status(403).json({meassage:"not authorised"})
         }
         event.schedule=schedule;
         await event.save();
         res.json({message:"event schedule updated",event})
         
    }catch(error){
        res.status(500).json({message:eror.message})
    }
};
//get attendees for event
const getEventAttendees=async(req,res)=>{
    try{
        const eventId=req.params.id;
        const tickets=await Ticket.find({
            event:eventId,
            paymentStatus:"completed"
        })
        .populate("user" ,"name email")
        .select("user quantity")
        const attendees=tickets.map((t)=>({
            name:t.user.name,
            email:t.user.email,
            tickets:t.quantity

        }))
        res.json({count:attendees.length,attendees})
    }catch(error){
        res.status(500).json({message:error.message})
    }
}




module.exports={createEvent, getEvents,getEventById,updateEvent,
    deleteEvent,updateEventSchedule,getEventAttendees};