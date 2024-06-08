const express = require("express")
const router =express.Router();

//Importing Middlewares
const { auth,isStudent} = require("../middlewares/Auth")
const {capturePayment,verifyPayment,sendPaymentSuccessEmail} = require("../controllers/Payment")

router.post("/capturePayment", auth, isStudent, capturePayment)
router.post("/verifyPayment",auth, isStudent, verifyPayment)
router.post("/sendPaymentSuccessEmail", auth, isStudent, sendPaymentSuccessEmail);

module.exports = router