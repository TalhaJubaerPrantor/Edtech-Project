const mongoose=require("mongoose");
require("dotenv").config();

function connect() {
    // Connection URL
    const uri = process.env.MONGODB_URL; // Change this URI according to your MongoDB setup

    // Connect to MongoDB
    mongoose.connect(uri)
    .then(() => {
            console.log('Connected to MongoDB');
        })
        .catch((error) => {
            console.error('Error while connecting to MongoDB Connnection failed:', error);
            process.exit(1);
        });
}

module.exports = connect;