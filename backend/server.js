require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const donorRoutes = require("./routes/donorRoutes");
const donationRoutes = require("./routes/donationRoutes");
const bloodUnitRoutes = require("./routes/bloodUnitRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const bloodRequestRoutes = require("./routes/bloodRequestRoutes");

const blockchainRoutes = require("./routes/blockchainRoutes");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/donors", donorRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/blood-units", bloodUnitRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/blood-requests", bloodRequestRoutes);

app.use("/api/blockchain", blockchainRoutes);

// MongoDB connection
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Blood Blockchain Management System API is running",
    status: "success",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});