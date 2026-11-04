// Product creation and edits enforce the same catalogue rules.
export function validateProduct(body) {
  if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100) {
    return 'Enter a product name of at most 100 characters.';
  }
  const price = body.price;
  if (typeof price !== 'number' || !(price >= 0 && price <= 1000000) || Math.round(price * 100) / 100 !== price) {
    return 'Enter a price from $0 to $1,000,000 with at most two decimal places.';
  }
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.trim().length > 1000)) {
    return 'Keep description within 1000 characters.';
  }
  if (body.specifications !== undefined && (typeof body.specifications !== 'string' || body.specifications.trim().length > 500)) {
    return 'Keep specifications within 500 characters.';
  }
  if (body.imageUrl !== undefined) {
    if (typeof body.imageUrl !== 'string' || body.imageUrl.trim().length > 500) return 'Keep imageUrl within 500 characters.';
    const url = body.imageUrl.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) return 'Use an http:// or https:// image link.';
  }
  return '';
}

// A saved cart may be empty; checkout must contain at least one item.
export function validateItems(items, allowEmpty = false) {
  if (!Array.isArray(items) || (!allowEmpty && !items.length)) return 'Your cart is empty or invalid.';
  const ids = [];
  for (const item of items) {
    if (!item || !Number.isSafeInteger(item.id) || item.id < 1) return 'Invalid product ID.';
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) {
      return 'Each quantity must be a whole number from 1 to 10,000.';
    }
    for (const id of ids) {
      if (id === item.id) return 'Each tool should appear once.';
    }
    ids.push(item.id);
  }
  return '';
}
