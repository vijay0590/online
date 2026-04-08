require('dotenv').config();

const MONGODB_URI=(process.env.MONGODB_URI||
    'mongodb://127.0.0.1:27017/event');
const PORT=(process.env.PORT||5001);
const JWT_SECRET=(process.env.JWT_SECRET);

module.exports={MONGODB_URI,PORT,JWT_SECRET};