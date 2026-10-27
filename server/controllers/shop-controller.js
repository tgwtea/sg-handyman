import Shop from '../models/shop-model.js';
import User from '../models/user-model.js';

const shopController = {};

//hardcoded list of tools
const tools = [
  { id: 1, name: 'Claw hammer', price: 12 },
  { id: 2, name: 'Screwdriver set', price: 18 }
];


// Return our sample tools. We will read from MongoDB in a later step.
shopController.getProducts = (req, res) => {
  res.json(tools);
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
    if (!selectedTool) {
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
  try {
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
    res.json(user.shopCart || []);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Could not load your saved cart.' });
  }
};

// An empty array is valid, save shop cart, still checking 
shopController.saveCart = async (req, res) => {
  if (!req.body || !Array.isArray(req.body.items) || req.body.items.length > tools.length) {
    return res.status(400).json({ message: 'Send a valid list of cart items.' });
  }
  const items = [];
  for (const item of req.body.items) {
    if (!item || typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity % 1 !== 0 || item.quantity > 10000) {
      return res.status(400).json({ message: 'Each quantity must be a positive whole number.' });
    }
    let selectedTool;
    for (const tool of tools) {
      if (tool.id === item.id) selectedTool = tool;
    }
    if (!selectedTool) return res.status(400).json({ message: 'A tool is unavailable.' });
    for (const savedItem of items) {
      if (savedItem.id === item.id) return res.status(400).json({ message: 'Each tool should appear once.' });
    }
    items.push({ id: selectedTool.id, name: selectedTool.name, price: selectedTool.price, quantity: item.quantity });
  }
  try {
    const result = await User.saveShopCart(req.session.user._id, items);
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Account not found.' });
    res.json(items);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Could not save your cart. Please retry.' });
  }
};
export default shopController;
