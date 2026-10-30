import Shop from '../models/shop-model.js';
import User from '../models/user-model.js';
import Company from '../models/company-model.js';
import Product from '../models/product-model.js';

const shopController = {};


// Return our sample tools. We will read from MongoDB in a later step.
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
  const companyId = req.session.user.companyId;
  if (!companyId) {
    return res.status(403).json({ message: 'Your account must be linked to a company.' });
  }
  if (!req.body || typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.trim().length > 100) {
    return res.status(400).json({ message: 'Enter a product name of at most 100 characters.' });
  }
  const price = req.body.price;
  if (typeof price !== 'number' || !(price >= 0 && price <= 1000000) || Math.round(price * 100) / 100 !== price) {
    return res.status(400).json({ message: 'Enter a price from $0 to $1,000,000 with at most two decimal places.' });
  }
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
      companyId: companyId
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

// Update only name and price; company ownership and product ID cannot be changed.
shopController.updateProduct = async (req, res) => {
  const id = Number(req.params.id);
  if (!(id >= 1) || id % 1 !== 0) return res.status(400).json({ message: 'Invalid product ID.' });
  if (!req.body || typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.trim().length > 100) {
    return res.status(400).json({ message: 'Enter a product name of at most 100 characters.' });
  }
  const price = req.body.price;
  if (typeof price !== 'number' || !(price >= 0 && price <= 1000000) || Math.round(price * 100) / 100 !== price) {
    return res.status(400).json({ message: 'Enter a price from $0 to $1,000,000 with at most two decimal places.' });
  }
  try {
    const product = await Product.findProductById(id);
    if (!product || product.removed) return res.status(404).json({ message: 'This product is no longer available.' });
    const companyId = req.session.user.companyId;
    if (!companyId || !product.companyId || String(product.companyId) !== companyId) {
      return res.status(403).json({ message: 'You can only edit your own company products.' });
    }
    const result = await Product.updateProduct(id, companyId, req.body.name.trim(), price);
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Product not found.' });
    product.name = req.body.name.trim();
    product.price = price;
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
    const companyId = req.session.user.companyId;
    if (!companyId || !product.companyId || String(product.companyId) !== companyId) {
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
  //check cart got thing or not
  if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
    return res.status(400).json({ message: 'Your cart is empty.' });
  }
  try{
  const tools = await Product.findProducts();
  let total = 0;
  const purchasedItems = []
  for (const item of req.body.items) {
    //check whether number of item is valid
    if (!item || typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity % 1 !== 0) {
      return res.status(400).json({ message: 'Each quantity must be a positive whole number.' });
    }
    
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

    // Use the server price, rather than a price sent by the browser.
    total += selectedTool.price * item.quantity;

    purchasedItems.push({
      id: selectedTool.id,
      name: selectedTool.name,
      price: selectedTool.price,
      quantity: item.quantity
    });
  }
//create the order at the user model
    const order = await Shop.createOrder({
      userId: req.session.user._id,
      recipientName: req.body.recipientName.trim(),
      deliveryAddress: req.body.deliveryAddress.trim(),
      deliveryNote: deliveryNote,
      items: purchasedItems,
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
  if (!req.body || !Array.isArray(req.body.items)) {
    return res.status(400).json({ message: 'Send a valid list of cart items.' });
  }
  try{
  const tools = await Product.findProducts();
  const items = [];
  for (const item of req.body.items) {
    if (!item || typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity % 1 !== 0 || item.quantity > 10000) {
      return res.status(400).json({ message: 'Each quantity must be a positive whole number.' });
    }
    let selectedTool;
    for (const tool of tools) {
      if (tool.id === item.id) selectedTool = tool;
    }
    if (!selectedTool || selectedTool.removed) return res.status(400).json({ message: 'A tool is unavailable.' });
    for (const savedItem of items) {
      if (savedItem.id === item.id) return res.status(400).json({ message: 'Each tool should appear once.' });
    }
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
