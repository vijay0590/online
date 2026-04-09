const express=require("express");
const cors=require('cors');
const authRoutes=require("./routes/authRoutes")
const eventRoutes = require("./routes/eventRoutes");



const app=express();
//middlewares
app.use(express.json());
app.use(cors());


app.use("/api/auth",authRoutes);
app.use("/api/events",eventRoutes)



app.get("/",(req,res)=>{
    res.send("api running")

})

//error handleing
app.use((err,req,res,next)=>{
    res.status(500).json({message:error.message})

})




module.exports=app;