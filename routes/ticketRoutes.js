const express =require('express');
const router =express.Router();
const {bookTicket,getMyTickets,confirmPayment,cancelTicket,transferTicket}=require("../controllers/ticketController")
const {protect}=require("../middleware/auth")

//book ticket login user
router.post("/",protect,bookTicket);

//get my tickets
router.get("/my",protect,getMyTickets);

//pay
router.post("/pay",protect,confirmPayment)
//cancel ticket
router.delete("/:id",protect,cancelTicket)
//transfer ticket
router.put("/transfer/:id",protect,transferTicket)

module.exports=router;

