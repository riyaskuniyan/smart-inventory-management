
const mongoose = require("mongoose");
const { randomBytes } = require("crypto");
require("dotenv").config();

const Product = require("./models/Product");

const generateBarcode = () =>
  `INV-${randomBytes(8).toString("hex").toUpperCase()}`;

async function generateMissingBarcodes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const products = await Product.find({
      $or: [
        { barcode: { $exists: false } },
        { barcode: null },
        { barcode: "" }
      ]
    });

    console.log(`Found ${products.length} products without barcodes`);

    let updated = 0;

    for (const product of products) {
      let saved = false;

      while (!saved) {
        product.barcode = generateBarcode();

        try {
          await product.save();
          saved = true;
          updated++;

          console.log(
            `Generated barcode for ${product.name}: ${product.barcode}`
          );
        } catch (error) {
          if (error.code !== 11000) throw error;

          console.log("Duplicate barcode detected. Retrying...");
        }
      }
    }

    console.log(`Completed! Updated ${updated} products.`);
  } catch (error) {
    console.error("Barcode generation failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

generateMissingBarcodes();
