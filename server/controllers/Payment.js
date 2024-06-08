const { instance } = require("../config/Razorpay");
const Course = require("../models/Course");
const User = require("../models/User");
const CourseProgress = require("../models/CourseProgress");
const mailSender = require("../utils/mailSender");
const crypto = require("crypto");
const paymentSuccessEmail = require("../mail/Template/paymentSuccessEmail");
const courseEnrollmentEmail = require("../mail/Template/courseEnrollmentEmail");
const mongoose = require("mongoose");
require("dotenv").config();

// Capture the payment and initiate the Razorpay order
exports.capturePayment = async (req, res) => {
  //get courseId and userID
  const { courseId } = req.body;
  const userId = req.user.id;

  //Validation
  if (!courseId) {
    return res.json({
      success: false,
      message: "Please Provide the valid course id",
    });
  }

  let total_amount = 0;
  try {
    //to see whether the id is valid or not
    let course = await Course.findById(courseId);
    if (!course) {
      return res.json({
        success: false,
        message: "Could not find the course",
      });
    }

    //to check whether the user had already buyed or not
    const uid = new mongoose.Types.ObjectId(userId);
    if (course.studentsEnrolled.includes(uid)) {
      return res.json({
        success: false,
        message: "Student had already registered/buyed the course",
      });
    }

    total_amount = course.price;
  } catch (error) {
    return res.json(500).json({
      success: false,
      message: "Internal Server Error while capture the payment",
      Error: error,
    });
  }

  //creating order
  const options = {
    amount: total_amount * 100, // amount in the smallest currency unit
    currency: "INR",
    receipt: Math.random(Date.now()).toString(),
  };

  try {
    // Initiate the payment using Razorpay
    const paymentResponse = await instance.orders.create(options);
    console.log(paymentResponse);

    return res.status(200).json({
      success: true,
      description: Course.description,
      thumbnail: Course.thumbnail,
      courseName: Course.courseName,
      orderId: paymentResponse.id,
      amount: paymentResponse.amount,
      currency: paymentResponse.currency,
    });
  } catch (error) {
    return res.json(500).json({
      success: false,
      message: "Internal Server Error Could not initiate order",
      Error: error,
    });
  }
};

//verify the signature of Razorpay and server
exports.verifyPayment = async (req, res) => {
  try {
    // Extracting required fields from the request body
    const { razorpay_order_id, razorpay_payment_id, courses } = req.body;
    const userId = req.user.id;
    const razorpay_signature = req.headers["x-razorpay-signature"];

    // Check if all required fields are present
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !courses ||
      !userId
    ) {
      return res.status(200).json({
        success: false,
        message: "Payment Failed",
      });
    }

    // Create the body string that needs to be hashed
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    // Generate the expected signature using HMAC SHA256 with your Razorpay secret
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    // Compare the generated signature with the signature sent by Razorpay
    if (expectedSignature === razorpay_signature) {
      console.log("Payment is Authorized");
      await enrollStudents(courses, userId, res);
      return res.status(200).json({
        success: true,
        message: "Payment Verified",
      });
    }
  } catch (error) {
    return res.json(500).json({
      success: false,
      message: "Internal Server Error Payment Failed",
      Error: error,
    });
  }
};

// Send Payment Success Email
exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId, amount } = req.body;
  const userId = req.user.id;

  if (!orderId || !paymentId || !amount || !userId) {
    return res.status(400).json({
      success: false,
      message: "Please provide all the details",
    });
  }

  try {
    const enrolledStudent = await User.findById(userId);

    await mailSender(
      enrolledStudent.email,
      `Payment Received`,
      paymentSuccessEmail(
        `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
        amount / 100,
        orderId,
        paymentId
      )
    );
  } catch (error) {
    return res.json(500).json({
      success: false,
      message: "Could not send email",
      Error: error,
    });
  }
};

const enrollStudents = async (courses, userId, res) => {
  if (!courses || !userId) {
    return res.status(400).json({
      success: false,
      message: "Please Provide Course ID and User ID",
    });
  }

  for (const courseId of courses) {
    try {
      // Find the course and enroll the student in it
      const enrolledCourse = await Course.findOneAndUpdate(
        { _id: courseId },
        { $push: { studentsEnroled: userId } },
        { new: true }
      );

      if (!enrolledCourse) {
        return res.status(500).json({
          success: false,
          error: "Course not found",
        });
      }
      console.log("Updated course: ", enrolledCourse);

      const courseProgress = await CourseProgress.create({
        courseID: courseId,
        userId: userId,
        completedVideos: [],
      });
      // Find the student and add the course to their list of enrolled courses
      const enrolledStudent = await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            courses: courseId,
            courseProgress: courseProgress._id,
          },
        },
        { new: true }
      );

      console.log("Enrolled student: ", enrolledStudent);
      // Send an email notification to the enrolled student
      const emailResponse = await mailSender(
        enrolledStudent.email,
        `Successfully Enrolled into ${enrolledCourse.courseName}`,
        courseEnrollmentEmail(
          enrolledCourse.courseName,
          `${enrolledStudent.firstName} ${enrolledStudent.lastName}`
        )
      );

      console.log("Email sent successfully: ", emailResponse.response);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }
};
