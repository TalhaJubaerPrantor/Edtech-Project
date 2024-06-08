const Section=require("../models/Section");
const Course=require("../models/Course");
const SubSection = require("../models/SubSection");
const { login } = require("./Auth");
exports.createSection=async(req,res)=>{
    try {

        //data fetch 
        const {sectionName,courseId} = req.body;
        //data Validation
        if(!sectionName || !courseId){
            return res.status(400).json({
                success:false,
                message:"All properties of section are not present",
            })
        }
        //create Section
        const newSection = await Section.create({sectionName,courseId});
        //Update Course with section Object ID
        // Add the new section to the course's content array
		const updatedCourse = await Course.findByIdAndUpdate(
			courseId,
			{
				$push: {
                    courseContent: newSection._id,
				},
			},
			{ new: true }
		).populate({
				path: "courseContent",
				populate: {
					path: "subSection",
				},
			})
			.exec();

        
        return res.status(200).json({
            success:true,
            message:"Section Create Successfully",
            updatedCourse,
        })

    }   
    catch (error) {
        return res.json(500).json({
            success:false,
            message:"Internal Server Error",
            Error:error,
        })
    }
}

exports.updateSection = async(req,res)=>{
    try {
        //data fetch
        const { sectionName, sectionId} = req.body;
        if(!sectionName || !sectionName ){
            return res.status(400).json({
                success:false,
                message:"All properties of secction are not present",
            })
        }
        //Update in section
		await Section.findByIdAndUpdate(sectionId,
			{ sectionName },
			{ new: true }
		);

		const updatedCourse = await Course.find({courseContent:sectionId})
		.populate({
			path:"courseContent",
			populate:{
				path:"subSection",
			},
		})
		.exec();

		return res.status(200).json({
            success:true,
            message:"Section Updated Successfully",
            updatedCourse,
        })
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"Internal Server Error",
            Error:error,
        })
    }
}

exports.deleteSection = async(req,res)=>{
    try {
        //data fetch
        const { sectionId,courseId } = req.body;
        if(!sectionId|| !courseId){
            return res.status(400).json({
                success:false,
                message:"All properties of section are not present",
            })
        }
        console.log(sectionId,courseId);
        
        //deleteing the section id from course
        await Course.findByIdAndUpdate(courseId, {
			$pull: {
				courseContent: sectionId,
			}
		})
        
        //delete sub section
		await SubSection.deleteMany({_id: {$in: Section.subSection}});

        //Deleting the section
		await Section.findByIdAndDelete(sectionId);

        //find the updated course and return 
		const course = await Course.findById(courseId).populate({
			path:"courseContent",
			populate: {
				path: "subSection"
			}
		})
		.exec();

		return res.status(200).json({
            success:true,
            message:"Section Deleted Successfully",
            updatedCourse:course,
        })
    } 
    catch (error) {
        return res.status(500).json({
            success:false,
            message:"Internal Server Error",
            Error:error,
        })
    }
}