const Razorpay=require("razorpay");
const crypto=require("crypto")
const razorpay=new Razorpay({
    key_id:process.env.RAZORPAY_KEY,
    key_secret:process.env.RAZORPAY_SECRET
});

const createOrder=async(req,res)=>{
   try{
    const{amount}=req.body
     
        const order=await razorpay.orders.create({
          amount:amount*100,
          currency:"INR",
           receipt: "order_" + Date.now(),
        })
       res.json(order)
}catch(error){
    console.log(error)
     res.status(500).json({ message: "Order creation failed" });
}


}
//verify payment
const verifyPayment=async(req,res)=>{
     console.log("VERIFY BODY:", req.body);
    try{
        const{
         razorpay_order_id,
         razorpay_payment_id,
         razorpay_signature
        }=req.body;
        const body= razorpay_order_id+"|"+razorpay_payment_id;
        const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
        
      res.json({ message: "Payment verified",
        razorpay_payment_id,  // ← add this
    razorpay_order_id 
       });
    } else {
      res.status(400).json({ message: "Invalid signature" });
    }
  } catch (error) {
    res.status(500).json({ message: "Verification failed",error });
  }
};

module.exports = { createOrder, verifyPayment };
        

        
