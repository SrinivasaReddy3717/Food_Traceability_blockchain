const express = require("express");
const { ethers } = require("ethers");

const {
  adminContract,
  bloodBankContract,
  hospitalContract,
} = require("../blockchain/blockchain");

const {
  saveBlockchainTransaction,
} = require("../utils/blockchainTransaction");

const router = express.Router();

/* ============================================================
   HELPER
============================================================ */

function getBlockchainError(error) {
  return (
    error?.revert?.args?.[0] ||
    error?.reason ||
    error?.shortMessage ||
    error?.message ||
    "Unknown blockchain error"
  );
}

/* ============================================================
   GET BLOCKCHAIN ADMIN
============================================================ */

router.get("/admin", async (req, res) => {
  try {
    const admin = await adminContract.getAdmin();

    res.json({
      success: true,
      admin,
    });
  } catch (error) {
    console.error("Blockchain admin error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to read blockchain admin",
      error: getBlockchainError(error),
    });
  }
});

/* ============================================================
   REGISTER BLOOD BANK
============================================================ */

router.post("/register-blood-bank", async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: "walletAddress is required",
      });
    }

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    const tx = await adminContract.registerBloodBank(walletAddress);

    const receipt = await tx.wait();

    res.json({
      success: true,
      message: "Blood bank registered successfully",
      walletAddress,
      transactionHash: receipt.hash,
    });
  } catch (error) {
    console.error("Register blood bank error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to register blood bank",
      error: getBlockchainError(error),
    });
  }
});

/* ============================================================
   REGISTER HOSPITAL
============================================================ */

router.post("/register-hospital", async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: "walletAddress is required",
      });
    }

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    const tx = await adminContract.registerHospital(walletAddress);

    const receipt = await tx.wait();

    res.json({
      success: true,
      message: "Hospital registered successfully",
      walletAddress,
      transactionHash: receipt.hash,
    });
  } catch (error) {
    console.error("Register hospital error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to register hospital",
      error: getBlockchainError(error),
    });
  }
});

/* ============================================================
   GET BLOOD UNIT
============================================================ */

router.get("/blood-units/:id", async (req, res) => {
  try {
    const bloodUnit = await adminContract.getBloodUnit(
      req.params.id
    );

    res.json({
      success: true,
      bloodUnit: {
        bloodUnitId: bloodUnit.bloodUnitId,
        bloodGroup: bloodUnit.bloodGroup,
        donationId: bloodUnit.donationId,
        location: bloodUnit.location,
        collectionDate: bloodUnit.collectionDate.toString(),
        expiryDate: bloodUnit.expiryDate.toString(),
        status: Number(bloodUnit.status),
        ipfsCid: bloodUnit.ipfsCid,
        registeredBy: bloodUnit.registeredBy,
        createdAt: bloodUnit.createdAt.toString(),
      },
    });
  } catch (error) {
    console.error("Get blood unit error:", error);

    res.status(404).json({
      success: false,
      message: "Blood unit not found on blockchain",
      error: getBlockchainError(error),
    });
  }
});

/* ============================================================
   GET BLOOD REQUEST
============================================================ */

router.get("/requests/:id", async (req, res) => {
  try {
    const request = await adminContract.getBloodRequest(
      req.params.id
    );

    res.json({
      success: true,
      request: {
        requestId: request.requestId,
        hospitalId: request.hospitalId,
        bloodGroup: request.bloodGroup,
        quantity: request.quantity.toString(),
        priority: request.priority,
        status: Number(request.status),
        bloodUnitIds: request.bloodUnitIds,
        requestedBy: request.requestedBy,
        createdAt: request.createdAt.toString(),
      },
    });
  } catch (error) {
    console.error("Get blood request error:", error);

    res.status(404).json({
      success: false,
      message: "Blood request not found on blockchain",
      error: getBlockchainError(error),
    });
  }
});

/* ============================================================
   REGISTER / SYNCHRONIZE BLOOD UNIT
============================================================ */

router.post("/blood-units", async (req, res) => {
  try {
    console.log("\n==========================================");
    console.log("REGISTER BLOOD UNIT REQUEST");
    console.log("Request body:", req.body);
    console.log("==========================================\n");

    if (!bloodBankContract) {
      return res.status(500).json({
        success: false,
        message: "Blood bank wallet is not configured",
      });
    }

    /* --------------------------------------------------------
       READ REQUEST DATA
    -------------------------------------------------------- */

    const {
      bloodUnitId,
      bloodGroup,
      donationId,
      location,
      collectionDate,
      expiryDate,
      ipfsCid,
    } = req.body;

    /* --------------------------------------------------------
       NORMALIZE STRING VALUES
    -------------------------------------------------------- */

    const normalizedBloodUnitId =
      typeof bloodUnitId === "string"
        ? bloodUnitId.trim().toUpperCase()
        : "";

    const normalizedBloodGroup =
      typeof bloodGroup === "string"
        ? bloodGroup.trim().toUpperCase()
        : "";

    const normalizedDonationId =
      typeof donationId === "string"
        ? donationId.trim().toUpperCase()
        : "";

    const normalizedLocation =
      typeof location === "string"
        ? location.trim()
        : "";

    const normalizedIpfsCid =
      typeof ipfsCid === "string"
        ? ipfsCid.trim()
        : "";

    /* --------------------------------------------------------
       LOG EXACT VALUES
    -------------------------------------------------------- */

    console.log("Values received after normalization:");
    console.log("bloodUnitId:", normalizedBloodUnitId);
    console.log("bloodGroup:", normalizedBloodGroup);
    console.log("donationId:", normalizedDonationId);
    console.log("location:", normalizedLocation);
    console.log("collectionDate:", collectionDate);
    console.log("expiryDate:", expiryDate);

    /* --------------------------------------------------------
       VALIDATION
    -------------------------------------------------------- */

    if (
      !normalizedBloodUnitId ||
      !normalizedBloodGroup ||
      !normalizedDonationId ||
      !normalizedLocation ||
      !collectionDate ||
      !expiryDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "bloodUnitId, bloodGroup, donationId, location, collectionDate and expiryDate are required",
      });
    }

    /* --------------------------------------------------------
       VALIDATE BLOOD GROUP
    -------------------------------------------------------- */

    const allowedBloodGroups = [
      "A+",
      "A-",
      "B+",
      "B-",
      "AB+",
      "AB-",
      "O+",
      "O-",
    ];

    if (!allowedBloodGroups.includes(normalizedBloodGroup)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blood group",
      });
    }

    /* --------------------------------------------------------
       CONVERT DATES TO UNIX TIMESTAMP
    -------------------------------------------------------- */

    const collectionTimestamp = Math.floor(
      new Date(collectionDate).getTime() / 1000
    );

    const expiryTimestamp = Math.floor(
      new Date(expiryDate).getTime() / 1000
    );

    if (
      !Number.isFinite(collectionTimestamp) ||
      !Number.isFinite(expiryTimestamp)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid collectionDate or expiryDate",
      });
    }

    if (expiryTimestamp <= collectionTimestamp) {
      return res.status(400).json({
        success: false,
        message: "expiryDate must be after collectionDate",
      });
    }

    /* --------------------------------------------------------
       GET BLOOD BANK WALLET
    -------------------------------------------------------- */

    const bloodBankAddress =
      await bloodBankContract.runner.getAddress();

    const contractAddress =
      await bloodBankContract.getAddress();

    console.log("Blood bank wallet:", bloodBankAddress);
    console.log("Contract address:", contractAddress);

    /* --------------------------------------------------------
       CHECK BLOOD BANK ROLE
    -------------------------------------------------------- */

    const isBloodBank = await adminContract.bloodBanks(
      bloodBankAddress
    );

    console.log(
      "Blood bank registered:",
      isBloodBank
    );

    if (!isBloodBank) {
      return res.status(403).json({
        success: false,
        message:
          "The configured blood bank wallet is not registered on the blockchain",
        walletAddress: bloodBankAddress,
      });
    }
        /* --------------------------------------------------------
       CHECK WHETHER UNIT ALREADY EXISTS
    -------------------------------------------------------- */

    const exists = await adminContract.bloodUnitExists(
      normalizedBloodUnitId
    );

    console.log(
      "Blockchain existing check:",
      normalizedBloodUnitId,
      "=>",
      exists
    );

    /* --------------------------------------------------------
       EXISTING UNIT

       Do NOT create a duplicate blockchain transaction.
       Retrieve the existing record and its original
       registration transaction instead.
    -------------------------------------------------------- */

    if (exists) {
      console.log(
        `Blood unit ${normalizedBloodUnitId} already exists. Synchronizing existing record.`
      );

      const existingBloodUnit =
        await adminContract.getBloodUnit(
          normalizedBloodUnitId
        );

      const filter =
        adminContract.filters.BloodUnitRegistered(
          normalizedBloodUnitId
        );

      const events =
        await adminContract.queryFilter(filter);

      let transactionHash = "";

      if (events.length > 0) {
        const latestEvent =
          events[events.length - 1];

        transactionHash =
          latestEvent.transactionHash;
      }

      if (transactionHash) {
        const BlockchainTransaction =
          require("../models/BlockchainTransaction");

        const existingTransaction =
          await BlockchainTransaction.findOne({
            transactionHash,
          });

        if (!existingTransaction) {
          await BlockchainTransaction.create({
            transactionId: `TX-${Date.now()}`,
            bloodUnitId: normalizedBloodUnitId,
            fromAddress: bloodBankAddress,
            toAddress: contractAddress,
            transactionHash,
            action: "CREATE_BLOOD_UNIT",
            timestamp: new Date(),
          });

          console.log(
            "Existing blockchain transaction synchronized with MongoDB."
          );
        } else {
          console.log(
            "Blockchain transaction already exists in MongoDB."
          );
        }
      }

      return res.status(200).json({
        success: true,
        alreadyExists: true,
        message:
          "Blood unit already exists on blockchain. Existing record returned without creating a duplicate transaction.",
        bloodUnitId: normalizedBloodUnitId,
        bloodGroup: existingBloodUnit.bloodGroup,
        donationId: existingBloodUnit.donationId,
        location: existingBloodUnit.location,
        collectionDate:
          existingBloodUnit.collectionDate.toString(),
        expiryDate:
          existingBloodUnit.expiryDate.toString(),
        status: Number(existingBloodUnit.status),
        ipfsCid: existingBloodUnit.ipfsCid,
        registeredBy: existingBloodUnit.registeredBy,
        createdAt:
          existingBloodUnit.createdAt.toString(),
        transactionHash,
      });
    }

    /* --------------------------------------------------------
       REGISTER NEW UNIT ON BLOCKCHAIN
    -------------------------------------------------------- */

    console.log(
      "Sending new blood-unit transaction..."
    );

    const tx =
      await bloodBankContract.registerBloodUnit(
        normalizedBloodUnitId,
        normalizedBloodGroup,
        normalizedDonationId,
        normalizedLocation,
        collectionTimestamp,
        expiryTimestamp,
        normalizedIpfsCid
      );

    console.log(
      "Transaction submitted:",
      tx.hash
    );

    /* --------------------------------------------------------
       WAIT FOR CONFIRMATION
    -------------------------------------------------------- */

    const receipt = await tx.wait();

    console.log(
      "Transaction confirmed:",
      receipt.hash
    );

    /* --------------------------------------------------------
       SAVE BLOCKCHAIN TRANSACTION IN MONGODB
    -------------------------------------------------------- */

    const savedTransaction =
      await saveBlockchainTransaction({
        bloodUnitId:
          normalizedBloodUnitId,

        fromAddress:
          bloodBankAddress,

        toAddress:
          contractAddress,

        transactionHash:
          receipt.hash,

        action:
          "CREATE_BLOOD_UNIT",
      });

    console.log(
      "MongoDB blockchain transaction saved:",
      savedTransaction.transactionId
    );

    /* --------------------------------------------------------
       RESPONSE
    -------------------------------------------------------- */

    return res.status(201).json({
      success: true,
      alreadyExists: false,
      message:
        "Blood unit registered on blockchain",
      bloodUnitId:
        normalizedBloodUnitId,
      bloodGroup:
        normalizedBloodGroup,
      donationId:
        normalizedDonationId,
      location:
        normalizedLocation,
      transactionHash:
        receipt.hash,
      blockNumber:
        receipt.blockNumber,
    });
  } catch (error) {
    console.error(
      "\n=========================================="
    );

    console.error(
      "REGISTER BLOOD UNIT BLOCKCHAIN ERROR"
    );

    console.error(
      "=========================================="
    );

    console.error(error);

    console.error(
      "==========================================\n"
    );

    return res.status(500).json({
      success: false,
      message: getBlockchainError(error),
      error: getBlockchainError(error),
      code: error?.code || null,
    });
  }
});

/* ============================================================
   UPDATE BLOOD UNIT STATUS
============================================================ */

router.patch(
  "/blood-units/:id/status",
  async (req, res) => {
    try {
      if (!bloodBankContract) {
        return res.status(500).json({
          success: false,
          message:
            "Blood bank wallet is not configured",
        });
      }

      const { status } = req.body;

      if (
        status === undefined ||
        status === null
      ) {
        return res.status(400).json({
          success: false,
          message: "status is required",
        });
      }

      const statusNumber = Number(status);

      if (
        !Number.isInteger(statusNumber) ||
        statusNumber < 0 ||
        statusNumber > 7
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Status must be an integer from 0 to 7",
        });
      }

      const tx =
        await bloodBankContract.updateBloodUnitStatus(
          req.params.id,
          statusNumber
        );

      const receipt = await tx.wait();

      await saveBlockchainTransaction({
        bloodUnitId:
          req.params.id,
        fromAddress:
          await bloodBankContract.runner.getAddress(),
        toAddress:
          await bloodBankContract.getAddress(),
        transactionHash:
          receipt.hash,
        action:
          "UPDATE_STATUS",
      });

      res.json({
        success: true,
        message:
          "Blood unit status updated on blockchain",
        bloodUnitId:
          req.params.id,
        status:
          statusNumber,
        transactionHash:
          receipt.hash,
      });
    } catch (error) {
      console.error(
        "Update blood unit status error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          getBlockchainError(error),
        error:
          getBlockchainError(error),
      });
    }
  }
);
/* ============================================================
   CREATE BLOOD REQUEST
============================================================ */

router.post("/requests", async (req, res) => {
  try {
    if (!hospitalContract) {
      return res.status(500).json({
        success: false,
        message:
          "Hospital wallet is not configured",
      });
    }

    const {
      requestId,
      hospitalId,
      bloodGroup,
      quantity,
      priority,
    } = req.body;

    if (
      !requestId ||
      !hospitalId ||
      !bloodGroup ||
      !quantity ||
      !priority
    ) {
      return res.status(400).json({
        success: false,
        message:
          "requestId, hospitalId, bloodGroup, quantity and priority are required",
      });
    }

    const quantityNumber =
      Number(quantity);

    if (
      !Number.isInteger(quantityNumber) ||
      quantityNumber <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "quantity must be a positive integer",
      });
    }

    const tx =
      await hospitalContract.createBloodRequest(
        requestId,
        hospitalId,
        bloodGroup,
        quantityNumber,
        priority
      );

    const receipt = await tx.wait();

    await saveBlockchainTransaction({
      requestId,
      fromAddress:
        await hospitalContract.runner.getAddress(),
      toAddress:
        await hospitalContract.getAddress(),
      transactionHash:
        receipt.hash,
      action:
        "REQUEST",
    });

    res.status(201).json({
      success: true,
      message:
        "Blood request created on blockchain",
      requestId,
      transactionHash:
        receipt.hash,
    });
  } catch (error) {
    console.error(
      "Create blood request error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        getBlockchainError(error),
      error:
        getBlockchainError(error),
    });
  }
});

/* ============================================================
   APPROVE BLOOD REQUEST
============================================================ */

router.post(
  "/requests/:id/approve",
  async (req, res) => {
    try {
      if (!bloodBankContract) {
        return res.status(500).json({
          success: false,
          message:
            "Blood bank wallet is not configured",
        });
      }

      const { bloodUnitIds } =
        req.body;

      if (
        !Array.isArray(bloodUnitIds) ||
        bloodUnitIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "bloodUnitIds must be a non-empty array",
        });
      }

      const normalizedIds =
        bloodUnitIds.map((id) =>
          String(id)
            .trim()
            .toUpperCase()
        );

      const tx =
        await bloodBankContract.approveBloodRequest(
          req.params.id,
          normalizedIds
        );

      const receipt = await tx.wait();

      await saveBlockchainTransaction({
        requestId:
          req.params.id,
        bloodUnitId:
          normalizedIds.join(","),
        fromAddress:
          await bloodBankContract.runner.getAddress(),
        toAddress:
          await bloodBankContract.getAddress(),
        transactionHash:
          receipt.hash,
        action:
          "APPROVE",
      });

      res.json({
        success: true,
        message:
          "Blood request approved on blockchain",
        requestId:
          req.params.id,
        bloodUnitIds:
          normalizedIds,
        transactionHash:
          receipt.hash,
      });
    } catch (error) {
      console.error(
        "Approve blood request error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          getBlockchainError(error),
        error:
          getBlockchainError(error),
      });
    }
  }
);

/* ============================================================
   TRANSFER BLOOD REQUEST
============================================================ */

router.post(
  "/requests/:id/transfer",
  async (req, res) => {
    try {
      if (!bloodBankContract) {
        return res.status(500).json({
          success: false,
          message:
            "Blood bank wallet is not configured",
        });
      }

      const tx =
        await bloodBankContract.transferBloodRequest(
          req.params.id
        );

      const receipt = await tx.wait();

      await saveBlockchainTransaction({
        requestId:
          req.params.id,
        fromAddress:
          await bloodBankContract.runner.getAddress(),
        toAddress:
          await bloodBankContract.getAddress(),
        transactionHash:
          receipt.hash,
        action:
          "TRANSFER",
      });

      res.json({
        success: true,
        message:
          "Blood request transferred on blockchain",
        requestId:
          req.params.id,
        transactionHash:
          receipt.hash,
      });
    } catch (error) {
      console.error(
        "Transfer blood request error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          getBlockchainError(error),
        error:
          getBlockchainError(error),
      });
    }
  }
);

/* ============================================================
   DELIVER BLOOD REQUEST
============================================================ */

router.post(
  "/requests/:id/deliver",
  async (req, res) => {
    try {
      if (!hospitalContract) {
        return res.status(500).json({
          success: false,
          message:
            "Hospital wallet is not configured",
        });
      }

      const tx =
        await hospitalContract.deliverBloodRequest(
          req.params.id
        );

      const receipt = await tx.wait();

      await saveBlockchainTransaction({
        requestId:
          req.params.id,
        fromAddress:
          await hospitalContract.runner.getAddress(),
        toAddress:
          await hospitalContract.getAddress(),
        transactionHash:
          receipt.hash,
        action:
          "DELIVER",
      });

      res.json({
        success: true,
        message:
          "Blood request delivered on blockchain",
        requestId:
          req.params.id,
        transactionHash:
          receipt.hash,
      });
    } catch (error) {
      console.error(
        "Deliver blood request error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          getBlockchainError(error),
        error:
          getBlockchainError(error),
      });
    }
  }
);

/* ============================================================
   GET BLOCKCHAIN TRANSACTIONS
============================================================ */

router.get(
  "/transactions",
  async (req, res) => {
    try {
      const BlockchainTransaction =
        require(
          "../models/BlockchainTransaction"
        );

      const transactions =
        await BlockchainTransaction
          .find()
          .sort({
            timestamp: -1,
          });

      res.json({
        success: true,
        count:
          transactions.length,
        transactions,
      });
    } catch (error) {
      console.error(
        "Get blockchain transactions error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to retrieve blockchain transactions",
        error:
          error.message,
      });
    }
  }
);

/* ============================================================
   SYNC BLOOD UNIT TRANSACTION
============================================================ */

router.post(
  "/blood-units/:id/sync-transaction",
  async (req, res) => {
    try {
      const BlockchainTransaction = require("../models/BlockchainTransaction");
      const BloodUnit = require("../models/BloodUnit");

      const bloodUnitId = req.params.id;

      // Find the blood unit in MongoDB
      const bloodUnit = await BloodUnit.findOne({ bloodUnitId });

      if (!bloodUnit) {
        return res.status(404).json({
          success: false,
          message: "Blood unit not found in MongoDB",
        });
      }

      // Find the registration event on blockchain
      const filter =
        adminContract.filters.BloodUnitRegistered(bloodUnitId);

      const events = await adminContract.queryFilter(filter);

      if (events.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Blood unit registration event not found on blockchain",
        });
      }

      // Get the latest registration event
      const event = events[events.length - 1];

      const transactionHash = event.transactionHash;

      // Check whether transaction is already stored
      let transaction =
        await BlockchainTransaction.findOne({
          transactionHash,
        });

      // Create transaction record if it doesn't exist
      if (!transaction) {
        const bloodBankAddress =
          await bloodBankContract.runner.getAddress();

        const contractAddress =
          await bloodBankContract.getAddress();

        transaction = await BlockchainTransaction.create({
          transactionId: `TX-${Date.now()}`,
          bloodUnitId,
          fromAddress: bloodBankAddress,
          toAddress: contractAddress,
          transactionHash,
          action: "CREATE_BLOOD_UNIT",
          timestamp: new Date(),
        });
      }

      // Update MongoDB BloodUnit with blockchain transaction hash
      bloodUnit.blockchainTxHash = transactionHash;

      await bloodUnit.save();

      res.status(200).json({
        success: true,
        message: "Blockchain transaction synchronized with BloodUnit",
        bloodUnit,
        transaction,
      });
    } catch (error) {
      console.error(
        "Transaction synchronization error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to synchronize blockchain transaction",
        error: error.shortMessage || error.message,
      });
    }
  }
);
/* ============================================================
   GET AND VERIFY BLOCKCHAIN TRANSACTION RECEIPT
============================================================ */

router.get("/transaction/:hash", async (req, res) => {
  try {
    const transactionHash = req.params.hash;

    if (!ethers.isHexString(transactionHash, 32)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction hash",
      });
    }

    const provider = adminContract.runner?.provider;

    if (!provider) {
      return res.status(500).json({
        success: false,
        message: "Blockchain provider is not available",
      });
    }

    const [receipt, transaction, network] = await Promise.all([
      provider.getTransactionReceipt(transactionHash),
      provider.getTransaction(transactionHash),
      provider.getNetwork(),
    ]);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message:
          "Transaction receipt not found on the connected blockchain",
      });
    }

    const block = await provider.getBlock(receipt.blockNumber);

    return res.status(200).json({
      success: true,
      message:
        receipt.status === 1
          ? "Blockchain transaction confirmed successfully"
          : "Blockchain transaction failed",
      receipt: {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: Number(receipt.status),
        from: transaction?.from || receipt.from,
        to: transaction?.to || receipt.to,
        gasUsed: receipt.gasUsed.toString(),
        chainId: network.chainId.toString(),
        blockTimestamp: block?.timestamp ?? null,
      },
    });
  } catch (error) {
    console.error(
      "Transaction receipt verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to verify blockchain transaction receipt",
      error: getBlockchainError(error),
    });
  }
});

/* ============================================================
   EXPORT ROUTER
============================================================ */

module.exports = router;