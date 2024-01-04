const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String },
  description: { type: String },
  category: { type: String },
  tags: { type: String },
  originalPrice: { type: Number },
  discountPrice: { type: String },
  stock: { type: Number },
  images: [{ type: String }],
  ratings: { type: Number, },
  shopId: { type: String, required: true },
  shop: { type: Object, required: true },
  sold_out: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now() },
  reviews: [
    {
      user: {
        type: Object,
      },
      rating: {
        type: Number,
      },
      comment: {
        type: String,
      },
      productId: {
        type: String,
      },
      createdAt: {
        type: Date,
        default: Date.now(),
      }
    },
  ],
});

module.exports = mongoose.model("Product", productSchema);
