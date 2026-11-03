import { validateItems, validateProduct } from '../utils/shop-validation.js';
import { canManageCompany } from '../middleware/auth.js';
import Shop from '../models/shop-model.js';
import User from '../models/user-model.js';
import Company from '../models/company-model.js';
import Product from '../models/product-model.js';

const shopController = {};


// Return the active catalogue.
shopController.getProducts = async (req, res) => {
  try{
    const tools = await Product.findProducts();
    const availableTools = [];
    for (const tool of tools){
      if (!tool.removed) availableTools.push(tool);
    }
    res.json(availableTools);
  } catch(error){
    console.error(error.message);
    res.status(500).json({message:'Could not load tools. Please try again.'})
  }
};

shopController.createProduct = async (req, res) => {
  let companyId = req.session.user.companyId;
    if (req.session.user.role === 'admin') {
    companyId = req.body && req.body.companyId;
    if (typeof companyId !== 'string' || !companyId) {
      return res.status(400).json({ message: 'Choose a company for the new product.' });
    }
  }
  if (!companyId) {
    return res.status(403).json({ message: 'Your account must be linked to a company.' });
  }
  const detailError = validateProduct(req.body);
  if (detailError) return res.status(400).json({ message: detailError });
  const price = req.body.price;
  try {
    const company = await Company.findCompanyById(companyId);
    if (!company) return res.status(404).json({ message: 'Your company could not be found.' });
    // Continue the existing numeric IDs, so carts can use new products too.
    const tools = await Product.findProducts();
    
    //to create a ID that is unique
    let nextId = 1;
    for (const tool of tools) {
      if (tool.id >= nextId) nextId = tool.id + 1;
    }
    const product = await Product.createProduct({
      id: nextId,
      name: req.body.name.trim(),
      price: price,
      companyId: companyId,
      description: (req.body.description || '').trim(),
      specifications:(req.body.specifications || '').trim(),
      imageUrl: (req.body.imageUrl || '').trim()
    });
    res.status(201).json(product);
  } catch (error) {
    // As in the team's timeslot controller: 11000 means a unique value already exists.
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Another product was added at the same time. Please try again.' });
    }
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Check your company and product details.' });
    }
    console.error(error.message);
    res.status(500).json({ message: 'Could not add the product. Please try again.' });
  }
};

// Edit product details without changes to ownership or product ID.
shopController.updateProduct = async (req, res) => {
  const id = Number(req.params.id);
  if (!(id >= 1) || id % 1 !== 0) return res.status(400).json({ message: 'Invalid product ID.' });
  const detailError = validateProduct(req.body);
  if (detailError) return res.status(400).json({ message: detailError });
  const price = req.body.price;
  try {
    const product = await Product.findProductById(id);
    if (!product || product.removed) return res.status(404).json({ message: 'This product is no longer available.' });
    const companyId = product.companyId;
    if (!canManageCompany(req.session.user, companyId)) {
      return res.status(403).json({ message: 'You can only edit your own company products.' });
    }
    const details = {
      name: req.body.name.trim(),
      price: price,
      description: req.body.description === undefined ? product.description : req.body.description.trim(),
      specifications: req.body.specifications === undefined ? product.specifications : req.body.specifications.trim(),
      imageUrl: req.body.imageUrl === undefined ? product.imageUrl : req.body.imageUrl.trim()
    };
    const result = await Product.updateProduct(id, companyId, details);
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Product not found.' });
    product.name = req.body.name.trim();
    product.price = price;
    product.description = details.description;
    product.specifications = details.specifications;
    product.imageUrl = details.imageUrl;
    res.json(product);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Could not update the product. Please try again.' });
  }
};

// Remove from the catalogue while preserving its ID for old carts and orders.
shopController.removeProduct = async (req, res) => {
  const id = Number(req.params.id);
  if (!(id >= 1) || id % 1 !== 0) return res.status(400).json({ message: 'Invalid product ID.' });
  try {
    const product = await Product.findProductById(id);
    if (!product || product.removed) return res.status(404).json({ message: 'This product is no longer available.' });
    const companyId = product.companyId;
    if (!canManageCompany(req.session.user, companyId)) {
      return res.status(403).json({ message: 'You can only remove your own company products.' });
    }
    const result = await Product.removeProduct(id, companyId);
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Product not found.' });
    res.json({ message: 'Product removed.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Could not remove the product. Please try again.' });
  }
};


shopController.createOrder = async (req, res) => {
  //check name validornot
  if (!req.body || typeof req.body.recipientName !== 'string' || req.body.recipientName.trim() === '') {
    return res.status(400).json({ message: 'Enter a recipient name.' });
  }
  //check delivery details can ornot
  if (typeof req.body.deliveryAddress !== 'string' || !req.body.deliveryAddress.trim() || req.body.deliveryAddress.trim().length > 300) {
    return res.status(400).json({ message: 'Enter a delivery address of at most 300 characters.' });
  }
  
  let deliveryNote = '';
  if (req.body.deliveryNote !== undefined) {
    if (typeof req.body.deliveryNote !== 'string' || req.body.deliveryNote.trim().length > 200) {
      return res.status(400).json({ message: 'Keep the delivery note within 200 characters.' });
    }
    deliveryNote = req.body.deliveryNote.trim();
  }
  const itemError = validateItems(req.body.items);
  if (itemError) return res.status(400).json({ message: itemError });


  try{
  const tools = await Product.findProducts();
  let total = 0;
  const purchasedItems = []
  const packages = []
  for (const item of req.body.items) {
    //make selectedtool undefined first
    let selectedTool;
    for (const tool of tools) {
      if (tool.id === item.id) {
        selectedTool = tool;
      }
    }
    if (!selectedTool || selectedTool.removed) {
      return res.status(400).json({ message: 'A tool in your cart is unavailable.' });
    }
      
      //to create a package for each company mentioned in the cart
      const companyId = selectedTool.companyId ? String(selectedTool.companyId) : '';
      let existingPackage;
      for (const parcel of packages) {
        if (parcel.companyId === companyId) existingPackage = parcel;
      }
      if (!existingPackage) {
        const company = companyId ? await Company.findCompanyById(companyId) : null;
        packages.push({ companyId: companyId, companyName: company ? company.name : 'Unassigned seller', extraSeconds: 0 });
      }
    // Use the server price, rather than a price sent by the browser.
    total += selectedTool.price * item.quantity;

    purchasedItems.push({
      id: selectedTool.id,
      name: selectedTool.name,
      price: selectedTool.price,
      quantity: item.quantity,
      companyId : companyId
    });
  }
//create the order at the user model
    const order = await Shop.createOrder({
      userId: req.session.user._id,
      recipientName: req.body.recipientName.trim(),
      deliveryAddress: req.body.deliveryAddress.trim(),
      deliveryNote: deliveryNote,
      items: purchasedItems,
      packages : packages,
      total: total,
      //random generate a delivery time to simulate delivery status
      deliveryDurationSeconds: (Math.floor(Math.random() * 10) + 1) * 60
    });
    res.status(201).json(order);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Check the recipient name and order details.' });
    }
    console.error(error.message);
    res.status(500).json({ message: 'The order could not be saved. Please try again.' });
  }
};

//find the order we created and sent it to vue
shopController.getMyOrders = async (req, res) => {
  try {
    const orders = await Shop.findOrdersByUserId(req.session.user._id);
    res.json(orders);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Order history could not be loaded. Please try again.' });
  }
};

//get the user shopcart
shopController.getCart = async (req, res) => {
  try {
    const user = await User.findUserById(req.session.user._id);
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    const items = user.shopCart || [];
    const tools = await Product.findProducts();

    //update the price to be uptodate with mongodb at all time
    for (const item of items) {
      for (const tool of tools) {
        if (item.id === tool.id) {
          item.name = tool.name;
          item.price = tool.price;
        }
      }
    }
    res.json(items);    
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Could not load your saved cart.' });
  }
};

// An empty array is valid, save shop cart, still checking 
shopController.saveCart = async (req, res) => {
  const invalid = validateItems(req.body?.items, true);
  if (invalid) return res.status(400).json({ message: invalid });
  try{
  const tools = await Product.findProducts();
  const items = [];
  for (const item of req.body.items) {
    let selectedTool;
    for (const tool of tools) {
      if (tool.id === item.id) selectedTool = tool;
    }
    if (!selectedTool || selectedTool.removed) return res.status(400).json({ message: 'A tool is unavailable.' });
    items.push({ id: selectedTool.id, name: selectedTool.name, price: selectedTool.price, quantity: item.quantity });
  }
  
    const result = await User.saveShopCart(req.session.user._id, items);
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Account not found.' });
    res.json(items);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Could not save your cart. Please retry.' });
  }
};
export default shopController;
