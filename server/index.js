const express = require("express");
const app=express();

const userRoutes = require("./routes/User")
const courseRoutes = require("./routes/Course")
const profileRoutes = require("./routes/Profile")
const paymentRoutes = require("./routes/Payments")
const contactUsRoute = require("./routes/Contact");

const database = require("./config/database")
const cookieParser = require("cookie-parser")
const cors = require('cors');
const cloudinaryConnect  = require("./config/cloudinary")
const fileUpload = require("express-fileupload");
require("dotenv").config();

const PORT = process.env.PORT || 4000;

//database connect;
database();

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
    })
);
app.use(
    fileUpload({
        useTempFiles:true,
        tempFileDir:"/temp",
    })
)

//cloudinary connect
cloudinaryConnect();

//def routes
app.get("/",(req,res)=>{
    return res.json({
        success:true,
        message:"Server has started"
    })
})

//routes
app.use("/api/v1/auth",userRoutes);
app.use("/api/v1/profile",profileRoutes);
app.use("/api/v1/course",courseRoutes);
app.use("/api/v1/payment",paymentRoutes);
app.use("/api/v1/reach",contactUsRoute);

app.listen(PORT,()=>{
    console.log(`App is running on ${PORT}`);
})