const express = require("express");
const crypto = require("crypto");
const Donor = require("../models/Donor");

const router = express.Router();

// Register a new donor
router.post("/", async (req, res) => {
  try {
    const {
      donorId,
      walletAddress,
      name,
      age,
      gender,
      bloodGroup,
      city,
      contact,
    } = req.body;

    // Basic validation
    if (!name || !age || !gender || !bloodGroup || !city || !contact) {
      return res.status(400).json({
        message: "Please provide all required donor details.",
      });
    }

    if (Number(age) < 18 || !Number.isFinite(Number(age))) {
      return res.status(400).json({
        message: "Donor must be at least 18 years old.",
      });
    }

    // Wallet address is optional
    let normalizedWallet;

    if (walletAddress && walletAddress.trim() !== "") {
      normalizedWallet = walletAddress.trim().toLowerCase();

      if (!/^0x[a-f0-9]{40}$/.test(normalizedWallet)) {
        return res.status(400).json({
          message: "Invalid Ethereum wallet address.",
        });
      }

      // Check whether this wallet already belongs to a donor.
      const existingDonor = await Donor.findOne({
        walletAddress: normalizedWallet,
      });

      if (existingDonor) {
        return res.status(409).json({
          message: "This wallet is already registered.",
          donor: existingDonor,
          existingDonor: true,
        });
      }
    }

    // Generate a unique donor ID if the frontend does not provide one.
    const generatedDonorId =
      donorId && donorId.trim()
        ? donorId.trim()
        : `DON-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    const donorData = {
      donorId: generatedDonorId,
      name: name.trim(),
      age: Number(age),
      gender,
      bloodGroup,
      city: city.trim(),
      contact: String(contact).trim(),
    };

    // Save wallet only when the donor supplied one.
    if (normalizedWallet) {
      donorData.walletAddress = normalizedWallet;
    }

    const donor = new Donor(donorData);
    const savedDonor = await donor.save();

    return res.status(201).json({
      message: "Donor registered successfully",
      donor: savedDonor,
    });
  } catch (error) {
    console.error("Donor registration error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "A donor with this donor ID or wallet address already exists.",
        error: error.message,
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Donor validation failed.",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to register donor",
      error: error.message,
    });
  }
});

// Get all donors
router.get("/", async (req, res) => {
  try {
    const donors = await Donor.find().sort({ createdAt: -1 });

    return res.status(200).json({
      count: donors.length,
      donors,
    });
  } catch (error) {
    console.error("Fetch donors error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch donors",
      error: error.message,
    });
  }
});

// Get donor by donor ID
router.get("/:donorId", async (req, res) => {
  try {
    const donor = await Donor.findOne({
      donorId: req.params.donorId,
    });

    if (!donor) {
      return res.status(404).json({
        message: "Donor not found",
      });
    }

    return res.status(200).json({
      donor,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch donor",
      error: error.message,
    });
  }
});

module.exports = router;