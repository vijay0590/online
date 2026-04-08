const mongoose=require('mongoose');
const userSchema=new mongoose.Schema(
    {
        name:{
            type:String,
            required:true,
            trim:true
        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowerCase:true,
            trim:true
        },
        password:{
            type:String,
            required:true,
            minLength:6
        },
        role:{
            type:String,
            enum:["user","organiser","admin"],
            default:"user"
        }

    },{timestamps:true}
);
module.exports=mongoose.model("User",userSchema);