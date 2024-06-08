const nodemailer=require("nodemailer")
require("dotenv").config();

const mailSender=async(email,title,body)=>{
    try {
        
        let transporter=nodemailer.createTransport({
            host:process.env.MAIL_HOST,
            auth:{
                user:process.env.MAIL_USER,
                pass:process.env.MAIL_PASSWORD,
            }
        })

        const mailOptions = await transporter.sendMail({
            from: 'Study Notion',
            to: `${email}`,
            subject: `${title}`,
            text: `${body}`,
        });

        console.log(mailOptions);
        return mailOptions

    } catch (error) {
        console.log(error.message);
    }
}

module.exports=mailSender;