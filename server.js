
const mongoose=require("mongoose");
const {MONGODB_URI, PORT}=require("./config/config")
const app=require("./app")

require("./models/User");
require("./models/Event");
require("./models/Ticket");

mongoose.connect
    (MONGODB_URI)

    .then(()=>{
        console.log("connected to mongodb")
         
        app.listen(PORT,()=>{
            console.log(`SEVER LISTENING TO PORT ${PORT}`)
        })
      
    }).catch((error)=>{
        console.log("error connection",error.message)
    })