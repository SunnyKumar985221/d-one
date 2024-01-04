const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const Product = require("../db/model/product");
const Order = require("../db/model/order");
const Shop = require("../db/model/shop");
const { upload } = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const { createError } = require("../middleware/customError");

// create single product of a shop
router.post("/create-product", isSeller, upload.array("images"), async (req, res, next) => {
  try {
    const shopId = req.body.shopId;
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return next(createError(400, "Shop Id is invalid!"));
    } else {
      const files = req.files;
      const imageUrls = files.map((file) => `${file.filename}`);
      const productData = req.body;
      productData.images = imageUrls;
      productData.shop = shop;
      const product = await Product.create(productData);
      res.status(201).json(product);
    }
  } catch (error) {
    console.log(error);
    return next(createError(400, "Server Issue"));
  }
});

// get all products of a shop
router.get("/get-all-products-shop/:id", isSeller, async (req, res, next) => {
  try {
    const products = await Product.find({ shopId: req.params.id });
    res.status(200).json({ products });
  } catch (error) {
    return next(createError(400, "Server Issue"));
  }
});

// delete product of a shop 
router.delete("/delete-shop-product/:id", isSeller, async (req, res, next) => {
  try {
    const productId = req.params.id;
    const productData = await Product.findById(productId);

    productData.images.forEach((imageUrl) => {
      const filename = imageUrl;
      const filePath = `uploads/${filename}`;

      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err);
        }
      });
    });

    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
      return next(createError(500, "Product Not Found"));
    }
    console.log("Deleted");
    res.status(201).json({ message: "Product Deleted successfully!" });
  } catch (error) {
    console.log("Custom Error", error.message);
    return next(createError(400, "Server Issue"));
  }
});

// get all products 
router.get("/get-all-products", async (req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(201).json(products);
  } catch (error) {
    return next(createError(400, "Error Occured"));
  }
}
);

// review for a product
router.put(
  "/create-new-review",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { user, rating, comment, productId, orderId } = req.body;

      const product = await Product.findById(productId);

      const review = {
        user,
        rating,
        comment,
        productId,
      };

      const isReviewed = product.reviews.find(
        (rev) => rev.user._id === req.user._id
      );

      if (isReviewed) {
        product.reviews.forEach((rev) => {
          if (rev.user._id === req.user._id) {
            (rev.rating = rating), (rev.comment = comment), (rev.user = user);
          }
        });
      } else {
        product.reviews.push(review);
      }

      let avg = 0;

      product.reviews.forEach((rev) => {
        avg += rev.rating;
      });

      product.ratings = avg / product.reviews.length;

      await product.save({ validateBeforeSave: false });

      await Order.findByIdAndUpdate(
        orderId,
        { $set: { "cart.$[elem].isReviewed": true } },
        { arrayFilters: [{ "elem._id": productId }], new: true }
      );

      res.status(200).json({
        success: true,
        message: "Reviwed succesfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// all products --- for admin
router.get(
  "/admin-all-products",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
module.exports = router;
