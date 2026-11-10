const express = require("express");
const Donation = require("../models/Donation");
const Donor = require("../models/Donor");

const router = express.Router();

// Register a new blood donation
router.post("/", async (req, res) => {
  try {
    const {
      donationId,
      donorId,
      bloodGroup,
      donationDate,
      bloodUnitId,
      quantity,
    } = req.body;

    // Check whether donor exists
    const donor = await Donor.findOne({ donorId });

    if (!donor) {
      return res.status(404).json({
        message: "Donor not found",
      });
    }

    // Check whether donor's blood group matches
    if (donor.bloodGroup !== bloodGroup) {
      return res.status(400).json({
        message: "Blood group does not match donor record",
      });
    }

    const donation = new Donation({
      donationId,
      donorId,
      bloodGroup,
      donationDate,
      bloodUnitId,
      quantity,
    });

    const savedDonation = await donation.save();

    res.status(201).json({
      message: "Blood donation registered successfully",
      donation: savedDonation,
    });
  } catch (error) {
    console.error("Donation registration error:", error.message);

    res.status(500).json({
      message: "Failed to register donation",
      error: error.message,
    });
  }
});

// Get all donations
router.get("/", async (req, res) => {
  try {
    const donations = await Donation.find();

    res.status(200).json({
      count: donations.length,
      donations,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch donations",
      error: error.message,
    });
  }
});

module.exports = router;