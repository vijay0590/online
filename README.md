# 🎟️ Event Management Backend (MERN)

Backend for an Event Management Platform built using **Node.js, Express, and MongoDB**.

---

## 🔐 Demo Credentials

### 👑 Admin

Email: [vijay@gmail.com](mailto:vijay@gmail.com)
Password: 123456

### 🎤 Organizer

Email: [baskar06@gmail.com](mailto:baskar06@gmail.com)
Password: 123456

### 👤 User

Email: [vthil4676@gmail.com](mailto:vthil4676@gmail.com)
Password: 123456

---

## 🚀 Features

* 🔐 Authentication (JWT, roles: user / organizer / admin)
* 🎤 Event management (create, update, delete, approve)
* 🔍 Search & filter events
* 🎟️ Ticket booking (VIP / General pricing)
* 💳 Payment (Razorpay integration) + email confirmation
* 🔁 Cancel & transfer tickets
* 👥 Attendee management (export list)
* 📅 Event schedule
* 📊 Analytics (revenue, tickets, bookings)
* 🛠️ Admin APIs (users, tickets, payments)
* 🖼️ Image upload (Multer)

---

## 🧱 Tech Stack

* Node.js
* Express.js
* MongoDB (Mongoose)
* JWT
* Multer
* Nodemailer
* Razorpay

---

## ⚙️ Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

PORT=3001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
RAZORPAY_KEY=rzp_test_xxxxxxxxxxxx
RAZORPAY_SECRET=xxxxxxxxxxxxxxxxxxxx

### 3. Run server

```bash
npm run dev
```

---

## 🌐 API Base URL

```
http://localhost:3001/api
```

---

## 📌 Notes

* Razorpay payment integration added
* Email confirmation is sent after booking

---

## 👨‍💻 Author

Vijaya Baskar
