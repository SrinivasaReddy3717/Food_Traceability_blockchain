const express = require("express");
const BloodRequest = require("../models/BloodRequest");
const Hospital = require("../models/Hospital");
const BloodUnit = require("../models/BloodUnit");

const router = express.Router();

// Create a blood request
router.post("/", async (req, res) => {
  try {
    const {
      requestId,
      hospitalId,
      bloodGroup,
      quantity,
      priority,
    } = req.body;

    // Check whether hospital exists
    const hospital = await Hospital.findOne({ hospitalId });

    if (!hospital) {
      return res.status(404).json({
        message: "Hospital not found",
      });
    }

    // Check available blood units
    const availableUnits = await BloodUnit.find({
      bloodGroup,
      status: "AVAILABLE",
    });

    if (availableUnits.length < quantity) {
      return res.status(400).json({
        message: "Insufficient blood units available",
        availableQuantity: availableUnits.length,
        requestedQuantity: quantity,
      });
    }

    const bloodRequest = new BloodRequest({
      requestId,
      hospitalId,
      bloodGroup,
      quantity,
      priority: priority || "Normal",
    });

    const savedRequest = await bloodRequest.save();

    res.status(201).json({
      message: "Blood request created successfully",
      request: savedRequest,
    });
  } catch (error) {
    console.error("Blood request error:", error.message);

    res.status(500).json({
      message: "Failed to create blood request",
      error: error.message,
    });
  }
});

// Get all blood requests
router.get("/", async (req, res) => {
  try {
    const requests = await BloodRequest.find();

    res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch blood requests",
      error: error.message,
    });
  }
});

// Get request by ID
router.get("/:requestId", async (req, res) => {
  try {
    const request = await BloodRequest.findOne({
      requestId: req.params.requestId,
    });

    if (!request) {
      return res.status(404).json({
        message: "Blood request not found",
      });
    }

    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch blood request",
      error: error.message,
    });
  }
});

// Approve a blood request and reserve matching blood units
router.patch("/:requestId/approve", async (req, res) => {
  try {
    // Find the request
    const bloodRequest = await BloodRequest.findOne({
      requestId: req.params.requestId,
    });

    if (!bloodRequest) {
      return res.status(404).json({
        message: "Blood request not found",
      });
    }

    // Only pending requests can be approved
    if (bloodRequest.status !== "PENDING") {
      return res.status(400).json({
        message: `Request cannot be approved because its current status is ${bloodRequest.status}`,
      });
    }

    // Find available blood units matching the requested blood group
    const availableUnits = await BloodUnit.find({
      bloodGroup: bloodRequest.bloodGroup,
      status: "AVAILABLE",
    }).limit(bloodRequest.quantity);

    // Check whether enough units are available
    if (availableUnits.length < bloodRequest.quantity) {
      return res.status(400).json({
        message: "Not enough available blood units",
        requestedQuantity: bloodRequest.quantity,
        availableQuantity: availableUnits.length,
      });
    }

    // Get the selected blood unit IDs
    const bloodUnitIds = availableUnits.map(
      (unit) => unit.bloodUnitId
    );

    // Reserve the selected blood units
    await BloodUnit.updateMany(
      {
        bloodUnitId: { $in: bloodUnitIds },
      },
      {
        $set: {
          status: "RESERVED",
        },
      }
    );

    // Update the request
    bloodRequest.status = "APPROVED";
    bloodRequest.bloodUnitIds = bloodUnitIds;

    const updatedRequest = await bloodRequest.save();

    res.status(200).json({
      message: "Blood request approved and blood units reserved successfully",
      request: updatedRequest,
      reservedBloodUnits: bloodUnitIds,
    });
  } catch (error) {
    console.error("Blood request approval error:", error.message);

    res.status(500).json({
      message: "Failed to approve blood request",
      error: error.message,
    });
  }
});

// Transfer approved blood request
router.patch("/:requestId/transfer", async (req, res) => {
  try {
    const bloodRequest = await BloodRequest.findOne({
      requestId: req.params.requestId,
    });

    if (!bloodRequest) {
      return res.status(404).json({
        message: "Blood request not found",
      });
    }

    if (bloodRequest.status !== "APPROVED") {
      return res.status(400).json({
        message: `Request cannot be transferred because its current status is ${bloodRequest.status}`,
      });
    }

    if (!bloodRequest.bloodUnitIds.length) {
      return res.status(400).json({
        message: "No blood units are assigned to this request",
      });
    }

    const bloodUnits = await BloodUnit.find({
      bloodUnitId: { $in: bloodRequest.bloodUnitIds },
    });

    if (bloodUnits.length !== bloodRequest.bloodUnitIds.length) {
      return res.status(400).json({
        message: "One or more assigned blood units could not be found",
      });
    }

    const invalidUnits = bloodUnits.filter(
      (unit) => unit.status !== "RESERVED"
    );

    if (invalidUnits.length > 0) {
      return res.status(400).json({
        message: "One or more blood units are not in RESERVED status",
      });
    }

    await BloodUnit.updateMany(
      {
        bloodUnitId: { $in: bloodRequest.bloodUnitIds },
      },
      {
        $set: {
          status: "IN_TRANSIT",
        },
      }
    );

    bloodRequest.status = "IN_TRANSIT";

    const updatedRequest = await bloodRequest.save();

    res.status(200).json({
      message: "Blood request transferred successfully",
      request: updatedRequest,
      transferredBloodUnits: bloodRequest.bloodUnitIds,
    });
  } catch (error) {
    console.error("Blood transfer error:", error.message);

    res.status(500).json({
      message: "Failed to transfer blood request",
      error: error.message,
    });
  }
});

// Deliver blood request
router.patch("/:requestId/deliver", async (req, res) => {
  try {
    const bloodRequest = await BloodRequest.findOne({
      requestId: req.params.requestId,
    });

    if (!bloodRequest) {
      return res.status(404).json({
        message: "Blood request not found",
      });
    }

    if (bloodRequest.status !== "IN_TRANSIT") {
      return res.status(400).json({
        message: `Request cannot be delivered because its current status is ${bloodRequest.status}`,
      });
    }

    if (!bloodRequest.bloodUnitIds.length) {
      return res.status(400).json({
        message: "No blood units are assigned to this request",
      });
    }

    const bloodUnits = await BloodUnit.find({
      bloodUnitId: { $in: bloodRequest.bloodUnitIds },
    });

    if (bloodUnits.length !== bloodRequest.bloodUnitIds.length) {
      return res.status(400).json({
        message: "One or more assigned blood units could not be found",
      });
    }

    const invalidUnits = bloodUnits.filter(
      (unit) => unit.status !== "IN_TRANSIT"
    );

    if (invalidUnits.length > 0) {
      return res.status(400).json({
        message: "One or more blood units are not in IN_TRANSIT status",
      });
    }

    await BloodUnit.updateMany(
      {
        bloodUnitId: { $in: bloodRequest.bloodUnitIds },
      },
      {
        $set: {
          status: "DELIVERED",
        },
      }
    );

    bloodRequest.status = "DELIVERED";

    const updatedRequest = await bloodRequest.save();

    res.status(200).json({
      message: "Blood request delivered successfully",
      request: updatedRequest,
      deliveredBloodUnits: bloodRequest.bloodUnitIds,
    });
  } catch (error) {
    console.error("Blood delivery error:", error.message);

    res.status(500).json({
      message: "Failed to deliver blood request",
      error: error.message,
    });
  }
});

module.exports = router;