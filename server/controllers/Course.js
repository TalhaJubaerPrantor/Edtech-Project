const Course=require("../models/Course");
const User=require("../models/User");
const CourseProgress=require("../models/CourseProgress")
const Section=require("../models/Section");
const Category = require("../models/Category")
const SubSection=require("../models/SubSection");
const {uploadImageToCloudinary}=require("../utils/imageUploader");
const {convertSecondsToDuration}=require("../utils/secToDuration");
require("dotenv").config();

//create course
exports.createCourse=async(req,res)=>{
    try {
        // Get user ID from request object
        const userId = req.user.id

        // Get all required fields from request body
        let {
          courseName,
          courseDescription,
          whatYouWillLearn,
          price,
          tag: _tag,
          category,
          status,
          instructions: _instructions,
        } = req.body;

        //get thumbnial
        const thumbnail=req.files.thumbnail;
        // Convert the tag and instructions from stringified Array to Array
        const tag = JSON.parse(_tag)
        const instructions = JSON.parse(_instructions)

        console.log("tag", tag)
        console.log("instructions", instructions)
        console.log("courseName",courseName )
        console.log("courseDescription", courseDescription)
        console.log("whatYouWillLearn", whatYouWillLearn)
        console.log("price", price)
        console.log("status", status)
        console.log("category", category)
        console.log("thumbnail", thumbnail)
        //validation
        if (
          !courseName ||
          !courseDescription ||
          !whatYouWillLearn ||
          !price ||
          !tag.length ||
          !thumbnail ||
          !category ||
          !instructions.length
        ){
            return res.status(400).json({
                succes:false,
                message:"All fields are required/Mandatory",
            })
        }

        if (!status || status === undefined) {
          status = "Draft"
        }    
        
        //Check if the user is an instructor
        const instructorDetails = await User.findOne({
          _id: userId,
          accountType: "Instructor"
        });
              
        if(!instructorDetails){
            return res.status(400).json({
                succes:false,
                message:"Instructor Details not found",
            })
        }

        //check given tag is valid or not
        const categoryDetails = await Category.findById(category)
        if (!categoryDetails) {
          return res.status(404).json({
            success: false,
            message: "Category Details Not Found",
          })
        }

        //upload Image top Cloudinary
        const thumbnailImage=await uploadImageToCloudinary(thumbnail,process.env.FOLDER_NAME)

        //Create a new Course
        const newCourse = await Course.create({
          courseName,
          courseDescription,
          instructor: instructorDetails._id,
          whatYouWillLearn: whatYouWillLearn,
          price,
          tag,
          category: categoryDetails._id,
          thumbnail: thumbnailImage.secure_url,
          status: status,
          instructions,
        })

        // Add the new course to the User Schema of the Instructor
        await User.findByIdAndUpdate(
          {
            _id: instructorDetails._id,
          },
          {
            $push: {
              courses: newCourse._id,
            },
          },
          { new: true }
        )

        // Add the new course to the Categories
        const categoryDetails2 = await Category.findByIdAndUpdate(
          { _id: category },
          {
            $push: {
              courses: newCourse._id,
            },
          },
          { new: true }
        )

        //update the tag ka schema
        console.log("HEREEEEEEEE", categoryDetails2);
        return res.status(200).json({
            success:true,
            message:"Course Created Successfully",
            data:newCourse,
        })
    } 
    catch (error) {
        return res.status(500).json({
            success:false,
            message:"Failed to create course",
            error:error.message,
        })
    }
}

//edit course
exports.editCourse = async (req, res) => {
    try {
      const { courseId } = req.body
      const updates = req.body
      const course = await Course.findById(courseId)
  
      if (!course) {
        return res.status(404).json({ error: "Course not found" })
      }
  
      // If Thumbnail Image is found, update it
      if (req.files) {
        console.log("thumbnail update")
        const thumbnailimage = req.files.thumbnail
        const thumbnail = await uploadImageToCloudinary(
          thumbnailimage ,
          process.env.FOLDER_NAME
        )
        course.thumbnail = thumbnail.secure_url
      }
  
      // Update only the fields that are present in the request body
      for (const key in updates) {
        if (updates.hasOwnProperty(key)) {
          if (key === "tag" || key === "instructions") {
            course[key] = JSON.parse(updates[key])
          } else {
            course[key] = updates[key]
          }
        }
      }
  
      await course.save()
  
      const updatedCourse = await Course.findOne({
        _id: courseId,
      })
        .populate({
          path: "instructor",
          populate: {
            path: "additionalDetails",
          },
        })
        .populate("category")
        //.populate("ratingAndReviews")
        .populate({
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        })
        .exec()
  
      res.json({
        success: true,
        message: "Course updated successfully",
        data: updatedCourse,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      })
    }
}

//getAllCourses handler function
exports.getAllCourses=async(req,res)=>{
    try {
        
        const allCourses=await Course.find({},{
            courseName:true,
            price:true,
            thumbnail:true,
            instructor:true,
            ratingAndReviews:true,
            studentsEnrolled:true,
        }).populate("instructor").exec();

        console.log("All Cousress",allCourses);
        return res.status(200).json({
            success:true,
            message:"Data for all courses fetched successfully",
            data:allCourses,
        })
    } 
    catch (error) {
        return res.status(500).json({
            success:false,
            message:"Cannot fetch the course data",
            error:error.message,
        })
    }
}

exports.getCourseDetails = async (req, res) => {
    try {
        const { courseId } = req.body
        if(!courseId){
            return res.status(500).json({
                success:false,
                message:"Wrong course id",
            })
        }

        const courseDetails = await Course.findOne({_id:courseId})
            .populate({
                path:"instructor",
                populate: {
                    path: "additionalDetails",
                  },
            })
            .populate("category")
            //.populate("ratingAndReviews")
            .populate({
                path:"courseContent",
                populate:{
                    path:"subSection",
                    select:"-videoUrl",
                }
            })
            .exec()

        if(!courseDetails){
            return res.status(500).json({
                success:false,
                message:`Could not find the course with id: ${courseId}`,
            })
        }

        let totalDurationInSeconds = 0
        courseDetails.courseContent.forEach((content) => {
        content.subSection.forEach((subSection) => {
            const timeDurationInSeconds = parseInt(subSection.timeDuration)
            totalDurationInSeconds += timeDurationInSeconds
        })
        })

        const totalDuration = convertSecondsToDuration(totalDurationInSeconds);

        return res.status(200).json({
            success: true,
            message:"Course Detail with Total Course Time",
            data: {
              courseDetails,
              totalDuration,
            },
          })

    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"Cannot fetch the course data",
            error:error.message,
        })
    }
}

exports.getFullCourseDetails = async (req, res) => {
    try {
      const { courseId } = req.body
      const userId = req.user.id
      const courseDetails = await Course.findOne({
        _id: courseId,
      })
        .populate({
          path: "instructor",
          populate: {
            path: "additionalDetails",
          },
        })
        .populate("category")
        .populate("ratingAndReviews")
        .populate({
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        })
        .exec()
  
      let courseProgressCount = await CourseProgress.findOne({
        courseID: courseId,
        userId: userId,
      })
  
      console.log("courseProgressCount : ", courseProgressCount)
  
      if (!courseDetails) {
        return res.status(400).json({
          success: false,
          message: `Could not find course with id: ${courseId}`,
        })
      }
      let totalDurationInSeconds = 0
      courseDetails.courseContent.forEach((content) => {
        content.subSection.forEach((subSection) => {
          const timeDurationInSeconds = parseInt(subSection.timeDuration)
          totalDurationInSeconds += timeDurationInSeconds
        })
      })
  
      const totalDuration = convertSecondsToDuration(totalDurationInSeconds)
  
      return res.status(200).json({
        success: true,
        data: {
          courseDetails,
          totalDuration,
          completedVideos: courseProgressCount?.completedVideos
            ? courseProgressCount?.completedVideos
            : [],
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
}

// Get a list of Course for a given Instructor
exports.getInstructorCourses = async (req, res) => {
    try {
      // Get the instructor ID from the authenticated user or request body
      const instructorId = req.user.id
  
      // Find all courses belonging to the instructor
      const instructorCourses = await Course.find({
        instructor: instructorId,
      }).sort({ createdAt: -1 })
  
      // Return the instructor's courses
      res.status(200).json({
        success: true,
        data: instructorCourses,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({
        success: false,
        message: "Failed to retrieve instructor courses",
        error: error.message,
      })
    }
}
  
exports.deleteCourse = async (req, res) => {
    try {
      const { courseId } = req.body
  
      // Find the course
      const course = await Course.findById(courseId)
      if (!course) {
        return res.status(404).json({ message: "Course not found" })
      };
  
      // Unenroll students from the course
      const studentsEnrolled = course.studentsEnrolled;
      for (const studentId of studentsEnrolled) {
        await User.findByIdAndUpdate(studentId, {
          $pull: { courses: courseId },
        })
      }
  
      // Delete sections and sub-sections
      const courseSections = course.courseContent
      for (const sectionId of courseSections) {
        // Delete sub-sections of the section
        const section = await Section.findById(sectionId)
        if (section) {
          const subSections = section.subSection
          for (const subSectionId of subSections) {
            await SubSection.findByIdAndDelete(subSectionId)
          }
        }
  
        // Delete the section
        await Section.findByIdAndDelete(sectionId)
      }
      
      //Course Deleting from Category
      const categoryid=course.category;
      await Category.findByIdAndUpdate(categoryid, {
        $pull: { courses: courseId },
      })

      // Delete the course
      await Course.findByIdAndDelete(courseId)
  
      return res.status(200).json({
        success: true,
        message: "Course deleted successfully",
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      })
    }
}