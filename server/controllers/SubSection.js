const Section=require("../models/Section");
const SubSection=require("../models/SubSection");
const {uploadImageToCloudinary}=require("../utils/imageUploader");

exports.createSubSection=async(req,res)=>{
    try {
        // Extract necessary information from the request body
        const { sectionId, title, description } = req.body;
        const video = req.files.video;

        //console.log(sectionId, title, description ,video);
        // Check if all necessary fields are provided
        if (!sectionId || !title || !description || !video) {
        return res
            .status(404)
            .json({ success: false, message: "All Fields are Required" })
        };

        //video uploading on Cloudinary
        const uploadDetails = await uploadImageToCloudinary(
            video,
            process.env.FOLDER_NAME
        );
       // console.log(uploadDetails);

        // Create a new sub-section with the necessary information
        const SubSectionDetails = await SubSection.create({
            title: title,
            timeDuration: `${uploadDetails.duration}`,
            description: description,
            videoUrl: uploadDetails.secure_url,
        });

        // Update the corresponding section with the newly created sub-section
        const updateSection= await Section.findByIdAndUpdate(
            {_id:sectionId},
            {$push:{subSection:SubSectionDetails._id}},
            {new:true}
        ).populate("subSection");
    
        return res.status(200).json({
            success: true, 
            message:"Subsection created successfully",
            data: updateSection,
        })
    } 
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        })
    }
}

exports.updateSubSection=async(req,res)=>{
    try {
        //fetch data
        const { sectionId, subSectionId, title, description } = req.body;
        //Searching that subsection
        const subSection = await SubSection.findById(subSectionId);
        //Subsection not found/present
        if (!subSection) {
        return res.status(404).json({
            success: false,
            message: "SubSection not found",
            })
        }
        
        //why parameter to be updated
        if (title !== undefined) {
            subSection.title = title
        }
      
        if (description !== undefined) {
            subSection.description = description
        }

        if (req.files && req.files.video !== undefined) {
            const video = req.files.video
            const uploadDetails = await uploadImageToCloudinary(
              video,
              process.env.FOLDER_NAME
            )
            subSection.videoUrl = uploadDetails.secure_url;
            subSection.timeDuration = `${uploadDetails.duration}`;
        }

        await subSection.save()

        // find updated section and return it
        const updatedSection = await Section.findById(sectionId).populate(
          "subSection"
        )
    
        console.log("updated section", updatedSection)
    
        return res.status(200).json({
          success: true,
          message: "Section updated successfully",
          data: updatedSection,
        })
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        })
    }
}

exports.deleteSubSection = async (req, res) => {
    try {
    //fetch data
      const { subSectionId, sectionId } = req.body

      //delete the id from section
      await Section.findByIdAndUpdate(
        { _id: sectionId },
        {
          $pull: {
            subSection: subSectionId,
          },
        }
      )

      //subsection deleteion
      const subSection = await SubSection.findByIdAndDelete({ _id: subSectionId })
  
      if (!subSection) {
        return res
          .status(404)
          .json({ success: false, message: "SubSection not found" })
      }
  
      // find updated section and return it
      const updatedSection = await Section.findById(sectionId).populate(
        "subSection"
      )
      
      //return response
      return res.status(200).json({
        success: true,
        message: "SubSection deleted successfully",
        data: updatedSection,
      })
    } catch (error) {
      
      return res.status(500).json({
        success: false,
        message: "An error occurred while deleting the SubSection",
      })
    }
}