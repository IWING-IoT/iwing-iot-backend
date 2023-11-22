const dotenv = require("dotenv");
const mongoose = require("mongoose");

const app = require("./app");

dotenv.config();

mongoose
  .connect(
    "mongodb+srv://peeranat45:0625901000@cluster0.9cl8sx1.mongodb.net/?retryWrites=true&w=majority"
  )
  .then(() => {
    console.log("DB connection successful");
  });

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
