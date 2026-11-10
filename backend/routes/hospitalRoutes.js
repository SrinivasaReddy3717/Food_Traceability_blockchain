const express = require("express");
const Hospital = require("../models/Hospital");

const router = express.Router();

// Register a hospital
router.post("/", async (req, res) => {
  try {
    const {
      hospitalId,
      walletAddress,
      hospitalName,
      city,
      contact,
    } = req.body;

    const hospital = new Hospital({
      hospitalId,
      walletAddress,
      hospitalName,
      city,
      contact,
    });

    const savedHospital = await hospital.save();

    res.status(201).json({
      message: "Hospital registered successfully",
      hospital: savedHospital,
    });
  } catch (error) {
    console.error("Hospital registration error:", error.message);

    res.status(500).json({
      message: "Failed to register hospital",
      error: error.message,
    });
  }
});

// Get all hospitals
router.get("/", async (req, res) => {
  try {
    const hospitals = await Hospital.find();

    res.status(200).json({
      count: hospitals.length,
      hospitals,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch hospitals",
      error: error.message,
    });
  }
});

// Get hospital by ID
router.get("/:hospitalId", async (req, res) => {
  try {
    const hospital = await Hospital.findOne({
      hospitalId: req.params.hospitalId,
    });

    if (!hospital) {
      return res.status(404).json({
        message: "Hospital not found",
      });
    }

    res.status(200).json(hospital);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch hospital",
      error: error.message,
    });
  }
});

module.exports = router;