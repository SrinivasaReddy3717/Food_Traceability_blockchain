const express = require("express");
const BloodUnit = require("../models/BloodUnit");
const Donation = require("../models/Donation");

const router = express.Router();

// Create a blood unit
router.post("/", async (req, res) => {
  try {
    const {
      bloodUnitId,
      bloodGroup,
      donationId,
      collectionDate,
      expiryDate,
      location,
      ipfsCid,
    } = req.body;

    // Check whether donation exists
    const donation = await Donation.findOne({ donationId });

    if (!donation) {
      return res.status(404).json({
        message: "Donation not found",
      });
    }

    // Make sure blood group matches donation
    if (donation.bloodGroup !== bloodGroup) {
      return res.status(400).json({
        message: "Blood group does not match donation record",
      });
    }

    const bloodUnit = new BloodUnit({
      bloodUnitId,
      bloodGroup,
      donationId,
      collectionDate,
      expiryDate,
      location,
      ipfsCid: ipfsCid || null,
    });

    const savedBloodUnit = await bloodUnit.save();

    res.status(201).json({
      message: "Blood unit created successfully",
      bloodUnit: savedBloodUnit,
    });
  } catch (error) {
    console.error("Blood unit creation error:", error.message);

    res.status(500).json({
      message: "Failed to create blood unit",
      error: error.message,
    });
  }
});

// Get all blood units
router.get("/", async (req, res) => {
  try {
    const bloodUnits = await BloodUnit.find();

    res.status(200).json({
      count: bloodUnits.length,
      bloodUnits,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch blood units",
      error: error.message,
    });
  }
});

// Get one blood unit by ID
router.get("/:bloodUnitId", async (req, res) => {
  try {
    const bloodUnit = await BloodUnit.findOne({
      bloodUnitId: req.params.bloodUnitId,
    });

    if (!bloodUnit) {
      return res.status(404).json({
        message: "Blood unit not found",
      });
    }

    res.status(200).json(bloodUnit);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch blood unit",
      error: error.message,
    });
  }
});

// Update blood unit status
router.patch("/:bloodUnitId/status", async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "REGISTERED",
      "AVAILABLE",
      "RESERVED",
      "APPROVED",
      "IN_TRANSIT",
      "DELIVERED",
      "EXPIRED",
      "DISCARDED",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid blood unit status",
        allowedStatuses,
      });
    }

    const bloodUnit = await BloodUnit.findOneAndUpdate(
      { bloodUnitId: req.params.bloodUnitId },
      { status },
      { new: true }
    );

    if (!bloodUnit) {
      return res.status(404).json({
        message: "Blood unit not found",
      });
    }

    res.status(200).json({
      message: "Blood unit status updated successfully",
      bloodUnit,
    });
  } catch (error) {
    console.error("Blood unit status update error:", error.message);

    res.status(500).json({
      message: "Failed to update blood unit status",
      error: error.message,
    });
  }
});

module.exports = router;