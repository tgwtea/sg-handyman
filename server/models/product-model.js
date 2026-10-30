// Purpose: store tools in MongoDB and provide the controller's product queries.
import mongoose from 'mongoose';

const productModel = {};
const productSchema = new mongoose.Schema({
  // Keep our existing numeric tool IDs so old carts and order items still match.
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, maxlength: 100 },
  price: { type: Number, required: true, min: 0 },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  //keep remove records so that numeric ID of the product cannot be reuse
  removed: { type: Boolean, default: false }
});

const Product = mongoose.model('ShopProduct', productSchema, 'shop_products');

productModel.findProducts = function() {
  return Product.find();
};


productModel.createProduct = function(product) {
  return Product.create(product);
};

productModel.findProductById = function(id) {
  return Product.findOne({ id: id });
};

productModel.updateProduct = function(id, companyId, name, price) {
  return Product.updateOne({ id: id, companyId: companyId }, { name: name, price: price }, { runValidators: true });
};

productModel.removeProduct = function(id, companyId) {
  return Product.updateOne({ id: id, companyId: companyId }, { removed: true }, { runValidators: true });
};

export default productModel;
