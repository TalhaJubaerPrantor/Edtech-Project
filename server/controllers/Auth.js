const User=require("../models/User")
const OTP=require("../models/OTP");
const Profile = require("../models/Profile");
const otpGenerator=require("otp-generator");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken")
const passwordUpdated=require('../mail/Template/passwordUpdateEmail')
require("dotenv").config();
const mailSender=require("../utils/mailSender")

//sendOTP controller
const sendOTP=async (req,res)=>{
    try {

        //fetch email from request ki body 
        const {email}=req.body;
        console.log(email);
        //Check if user exit/not 
        const checkUserPresent= await User.findOne({email});

        //check gmail format
        const gmailRegex = /^[a-zA-Z0-9._-]+@gmail\.com$/;
        if (!gmailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid Gmail address."
            });
        }
        
        //User exit 
        if(checkUserPresent){
            return res.status({
                success:false,
                msg:"User already registerd"
            })
        }

        //generate OTP
        var otp=otpGenerator.generate(6,{
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false,
        })

        console.log("OTP genarted",otp);
        
        //check unique otp or not
        let result=await OTP.findOne({otp:otp});

        while(result){
            otp=otpGenerator.generate(6,{
                upperCaseAlphabets:false,
                lowerCaseAlphabets:false,
                specialChars:false,
            });
            result=await OTP.findOne({otp:otp});
        }

        const otpPayload={email,otp};

        //create an entry for OTP
        const otpbody=await OTP.create(otpPayload);
        console.log("More otp information",otpbody);

        //return successful response
        res.status(200).json({
            success:true,
            message:"OTP Sent Successfully",
            otp:otp,
        })
    } 
    
    catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}

//signup controller
const signup=async (req,res)=>{
    try {
        
        //fetch data from req ki sbody
        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            accountType,
        }=req.body

        //validation check
        if(!firstName || !lastName || !email || !password || !confirmPassword){
            return res.status(403).json({
                success:false,
                message:"All fields are required",
            })
        }

        //email check
        const gmailRegex = /^[a-zA-Z0-9._-]+@gmail\.com$/;
        if (!gmailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid Gmail address."
            });
        }

        //passowrd match
        if(password !== confirmPassword){
            return res.status(400).json({
                success:false,
                message:"Password and confirm password do not match"
            })
        }

        //check user already exit or not 
        const existingUser=await User.findOne({email});
        if(existingUser){
            return res.status(400).json({
                success:false,
                message:"User is already registerd"
            })
        }

        
        //hash password
        const hashpassword=await bcrypt.hash(password,10);

        //create entry in DB

        const  profileDetails=await Profile.create({
            gender:null,
            dateOfBirth:null,
            about:null,
            contactNumber:null,
        })
        const newUser=await User.create({
            firstName,
            lastName,
            email,
            password:hashpassword,
            accountType,
            additionalDetails:profileDetails._id,
            image:`https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
        })
        console.log("New User Detail after Signup");
        console.log(newUser);
        //return res
        res.status(200).json({
            success:true,
            message:"User is registered Successfully",
            newUser,
        })
    } 
    catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"User cannot be registered .Please try again",
        })
    }
}

//login controller
const login=async (req,res)=>{
    try {
        //fetch data from body
        const {email,password}=req.body;

        //validation check
        if(!email || !password){
            return res.status(403).json({
                success:false,
                message:"All fields are required ",
            })
        }

        //email check
        const gmailRegex = /^[a-zA-Z0-9._-]+@gmail\.com$/;
        if (!gmailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid Gmail address."
            });
        }

        //User exit or not 
        const user=await User.findOne({email}).populate("additionalDetails")
        if(!user){
            return res.status(403).json({
                success:false,
                message:"Cant Login.... signup first",
            })
        }
        //console.log(email+" "+password);
        //generate JWT ,after password matching
        if(await bcrypt.compare(password,user.password)){
            
            const payload={
                email:user.email,
                id:user._id,
                accountType:user.accountType,
            }
            //console.log(payload);
            const token=jwt.sign(payload,process.env.JWT_SECRET,{
                expiresIn:"24h",// Token expires in 24 hours
            });
           //console.log(token);
            // Save token to user document in database
            user.token=token;
            user.password=undefined;
            
            //create cookie and send response
            const options={
                expires:new Date(Date.now()+3*24*60*60*1000),// Cookie expires in 3 days
                httpOnly:true,
            };
    
            // Send response to client
            res.cookie("token",token,options).status(200).json({
                success:true,
                message:"User Succesfully got login",
                token,
                user,
            });
        }
        else{
            return res.status(401).json({
                success:false,
                message:"Password is incorrect",
            })
        }

    } 
    catch (error) {
        return res.status(500).json({
            success:false,
            message:"Login Failure Please try again later",
        })
    }
    
}

//password change
const passwordChange=async (req,res)=>{
    try {
        // Get user data from req.user
        const userDetails = await User.findById(req.user.id)
    
        // Get old password, new password, and confirm new password from req.body
        const { oldPassword, newPassword } = req.body
    
        // Validate old password
        const isPasswordMatch = await bcrypt.compare(
          oldPassword,
          userDetails.password
        )
        if (!isPasswordMatch) {
          // If old password does not match, return a 401 (Unauthorized) error
          return res
            .status(401)
            .json({ success: false, message: "The password is incorrect" })
        }
    
        // Update password
        const encryptedPassword = await bcrypt.hash(newPassword, 10)
        const updatedUserDetails = await User.findByIdAndUpdate(
          req.user.id,
          { password: encryptedPassword },
          { new: true }
        )
    
        // Send notification email
        try {
          const emailResponse = await mailSender(
            updatedUserDetails.email,
            "Password for your account has been updated",
            passwordUpdated(
              updatedUserDetails.email,
              `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
            )
          )
          console.log("Email sent successfully:", emailResponse.response)
        } 
        catch (error) {
          // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
          console.error("Error occurred while sending email:", error)
          return res.status(500).json({
            success: false,
            message: "Error occurred while sending email",
            error: error.message,
          })
        }
    
        // Return success response
        return res
          .status(200)
          .json({ success: true, message: "Password updated successfully" })
      } 
      catch (error) {
        // If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
        console.error("Error occurred while updating password:", error)
        return res.status(500).json({
          success: false,
          message: "Error occurred while updating password",
          error: error.message,
        })
      }
}

module.exports={
    sendOTP,signup,login,passwordChange
}
