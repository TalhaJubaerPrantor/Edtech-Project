const User=require("../models/User");
const Profile=require("../models/Profile");
const CourseProgress=require("../models/CourseProgress");
const Course = require("../models/Course");
const {uploadImageToCloudinary} =require("../utils/imageUploader")


exports.updateProfile=async(req,res)=>{
    try {
        //fetch data
        const {gender="",about="",dateOfBirth="",contactNumber=""}=req.body;
        const id=req.user.id;
        
        //fetch user details
        const userDetails= await User.findById(id);
        const profileId=userDetails.additionalDetails;

        //fetch profile detail of user by the id
        const profileDetails=await Profile.findById(profileId);
        
        //update details
        profileDetails.gender=gender;
        profileDetails.dateOfBirth=dateOfBirth;
        profileDetails.about=about;
        profileDetails.contactNumber=contactNumber;

        await profileDetails.save();
        //fetch updated details
        const updatedUserDetails=await User.findById(id).populate("additionalDetails")
        .exec()
        
        return res.status(200).json({
            success:true,
            message:"Profile updated successfully",
            updatedUserDetails,
        })
    }
    catch (error) {
        return res.status(500).json({
            success:false,
            message:"Server Error while updating the profile",
            Error:error
        })
    }
}

exports.deleteAccount=async(req,res)=>{
    try {
        //fetch the id
        const id=req.user.id;

        //fetch the user details
        const user=await User.findById({_id:id});
        if(!user){
            return res.status(404).json({
                success:false,
                message:"User not found",
            })
        }
        //Deleteing user profile section
        const profileId=user.additionalDetails;
        await Profile.findByIdAndDelete({_id:profileId});

        //Unenrolling the courses enrolled by user
        for(const courseId of user.courses){
            await Course.findByIdAndUpdate(
                courseId,
                {$pull:{studentsEnrolled:id}},
                {new:true}
            )
        }
        //User deleted
        await User.findByIdAndDelete({ _id: id })

        //return response
        res.status(200).json({
          success: true,
          message: "User deleted successfully",
        })
        await CourseProgress.deleteMany({ userId: id })

    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"Server Error while deleting the profile",
            Error:error
        })
    }
}

exports.getAllUserDetails=async(req,res)=>{
    try {
        //fetch data
        const id = req.user.id
        //get data 
        const userDetails = await User.findById(id)
          .populate("additionalDetails")
          .exec()
        console.log(userDetails)
        //return response
        res.status(200).json({
          success: true,
          message: "User Data fetched successfully",
          data: userDetails,
        })
    
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"Server Error Unable to fetch user detail",
            Error:error
        })
    }
}

exports.updateDisplayPicture = async (req, res) => {
    try {
      const displayPicture = req.files.displayPicture
      const userId = req.user.id
      const image = await uploadImageToCloudinary(
        displayPicture,
        process.env.FOLDER_NAME,
        1000,
        1000
      )
      console.log(image)
      const updatedProfile = await User.findByIdAndUpdate(
        { _id: userId },
        { image: image.secure_url },
        { new: true }
      )
      res.status(200).json({
        success: true,
        message: `Image Updated successfully`,
        data: updatedProfile,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
}