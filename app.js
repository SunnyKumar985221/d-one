const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const dotenv = require("dotenv").config({ path: '.env' });
const connectDatabase = require("./db/Database");
connectDatabase();

const cors = require('cors');
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/", express.static(path.join(__dirname, "./uploads")));


app.use("/user", require("./controller/user"));
app.use("/shop", require("./controller/shop"));
app.use("/product", require("./controller/product"));
app.use("/event", require("./controller/event"));
app.use("/api/v2/conversation", require("./controller/conversation"));
app.use("/api/v2/message", require("./controller/message"));
app.use("/api/v2/order", require("./controller/order"));
app.use("/api/v2/coupon", require("./controller/coupounCode"));
app.use("/api/v2/payment", require("./controller/payment"));
app.use("/api/v2/withdraw", require("./controller/withdraw"));

// it's for ErrorHandling
app.use((err, req, res, next) => {
  const errorStatus = err.status || 500;
  const errorMessage = err.message || "Something went wrong";
  return res.status(errorStatus).json({
    success: false,
    status: errorStatus,
    message: errorMessage,
    stack: err.stack
  });
});

app.use(express.static(path.join(__dirname, "./public/build")));


app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public/build/index.html"));
});


// Server Port Connection 
app.listen(process.env.PORT, () => {
  console.log(`Server is running on PORT : ${process.env.PORT}`);
});
