const express = require('express');
const router = express.Router();

const Product = require('../models/Product');
const {
  protect,
  optionalProtect,
  authorizeRoles
} = require('../middleware/authMiddleware');
const {
  isStaffUser,
  getMissingStagesForProduct,
  getReadyProductIds
} = require('../utils/stageCheck');

// Register a new food product (Admin, Farmer, or Producer)
router.post(
  '/register',
  protect,
  authorizeRoles('Admin', 'Farmer', 'Producer'),
  async (req, res) => {
    try {
      const {
        productName,
        category,
        producer,
        origin,
        quantity,
        productionDate,
        batchNumber,
        description
      } = req.body;

      if (
        !productName ||
        !category ||
        !producer ||
        !origin ||
        quantity === undefined ||
        quantity === null ||
        Number(quantity) <= 0 ||
        !productionDate ||
        !batchNumber
      ) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required product details'
        });
      }

      const productId = `FT-${Date.now()}`;

      const newProduct = new Product({
        productId,
        productName,
        category,
        producer,
        origin,
        quantity: Number(quantity),
        productionDate,
        batchNumber,
        description: description || ''
      });

      const savedProduct = await newProduct.save();

      res.status(201).json({
        success: true,
        message: 'Food product registered successfully',
        product: savedProduct
      });
    } catch (error) {
      console.error('Product registration error:', error);

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get products (staff see all; consumers & public see only products with all 4 stages completed)
router.get('/', optionalProtect, async (req, res) => {
  try {
    let filter = {};
    if (!isStaffUser(req.user)) {
      const readyProductIds = await getReadyProductIds();
      filter = { productId: { $in: readyProductIds } };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get product by ID (consumers can only view after Production, Processing, Transportation & Distribution complete)
router.get('/:productId', optionalProtect, async (req, res) => {
  try {
    const product = await Product.findOne({
      productId: req.params.productId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!isStaffUser(req.user)) {
      const missingStages = await getMissingStagesForProduct(req.params.productId);
      if (missingStages.length > 0) {
        return res.status(403).json({
          success: false,
          message: `This product is not yet visible to consumers. Pending supply-chain stages: ${missingStages.join(', ')}.`
        });
      }
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
