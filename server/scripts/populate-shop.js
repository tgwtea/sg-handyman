// Shop-only demo data. Default previews; --apply writes the saved plan without resetting the database.
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { randomInt, randomBytes, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = 'woody-shop-demo-v1';
const folder = new URL('./', import.meta.url);
const privateFolder = new URL('../node_modules/.cache/woody-shop-demo/', folder);
const planFile = new URL('shop-demo-plan.json', privateFolder);
const reportFile = new URL('shop-demo-report.json', privateFolder);
const templates = JSON.parse(await readFile(new URL('shop-tool-data.json', folder), 'utf8'));
const pick = list => list[randomInt(list.length)];
const shuffled = list => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const summary = plan => ({ selectedCompanies: plan.selectedCompanies.length, totalCompanies: plan.companyCount,
  companyPercentage: Math.round(100 * plan.selectedCompanies.length / plan.companyCount), products: plan.products.length,
  newProducts: plan.products.filter(p => !p.original).length, newReviews: plan.reviews.length, demoAccounts: plan.users.length,
  distribution: plan.selectedCompanies });

async function makePlan(db) {
  const companies = await db.collection('companies').find().toArray();
  const products = await db.collection('shop_products').find().toArray();
  if (!companies.length) throw new Error('No companies');
  if (products.some(p => p.seedSource === source)) throw new Error('Existing demo batch has no plan; stop rather than duplicate');
  const active = products.filter(p => !p.removed);
  // Preserve existing valid company assignments; stale/missing IDs can be repaired.
  const validIds = new Set(companies.map(c => String(c._id)));
  const assignedIds = new Set(active.filter(p => validIds.has(String(p.companyId))).map(p => String(p.companyId)));
  const selected = companies.filter(c => assignedIds.has(String(c._id)));
  const count = Math.max(1, Math.round(companies.length * .75));
  if (selected.length > count) throw new Error('Too many existing company owners; stop rather than remove ownership');
  for (const c of shuffled(companies.filter(c => !assignedIds.has(String(c._id))))) {
    if (selected.length < count) selected.push(c);
  }
  const distribution = selected.map(c => {
    const existing = active.filter(p => String(p.companyId) === String(c._id)).length;
    if (existing > 5) throw new Error('Existing company has over five tools');
    return { companyId: String(c._id), name: c.name, count: randomInt(Math.max(1, existing), 6), items: [] };
  });
  const plan = { source, createdAt: new Date().toISOString(), companyCount: companies.length,
    selectedCompanies: distribution, products: [], users: [], reviews: [], orders: [] };
  for (const original of active) {
    const template = templates.find(t => t.name.toLowerCase() === original.name.toLowerCase());
    if (!template && (!original.description || !original.specifications || !original.imageUrl)) throw new Error('Unknown existing tool; stop rather than guess details');
    let group = distribution.find(c => c.companyId === String(original.companyId));
    if (!group) {
      const available = distribution.filter(c => c.items.length < c.count);
      if (!available.length) throw new Error('Not enough slots for existing products');
      group = pick(available);
    }
    group.items.push(original.id);
    plan.products.push({ _id: String(original._id), id: original.id, name: original.name, price: original.price,
      companyId: group.companyId, description: original.description || template.description,
      specifications: original.specifications || template.specifications, imageUrl: original.imageUrl || (process.env.SHOP_IMAGE_ORIGIN || 'http://localhost:5173') + template.imageUrl,
      original, originalHash: hash(original) });
  }
  let next = Math.max(0, ...products.map(p => p.id)) + 1;
  for (const group of distribution) {
    const used = new Set(plan.products.filter(p => p.companyId === group.companyId).map(p => p.name));
    const options = shuffled(templates.filter(t => !used.has(t.name)));
    while (group.items.length < group.count) {
      const template = options.pop();
      const product = { _id: String(new ObjectId()), id: next++, name: template.name, price: template.price,
        companyId: group.companyId, description: template.description, specifications: template.specifications, imageUrl: (process.env.SHOP_IMAGE_ORIGIN || 'http://localhost:5173') + template.imageUrl };
      plan.products.push(product); group.items.push(product.id);
    }
  }
  for (let i = 1; i <= 6; i++) {
    const username = 'shop-demo-reviewer-' + i;
    if (await db.collection('users').findOne({username})) throw new Error('Demo account name already exists');
    plan.users.push({ _id: String(new ObjectId()), username, role: 'customer', shopCart: [],
      password: await bcrypt.hash(randomBytes(32).toString('hex'), 10), seedSource: source });
  }
  const phrases = [
    ['Useful for a small home repair. The grip feels comfortable.',4],
    ['Good value for occasional DIY jobs. Easy to keep in my toolbox.',5],
    ['Does the basic job well, although the finish could be better.',3],
    ['The size and handling suited my shelf repair. Happy with it.',5],
    ['Works as described. A useful addition for simple household tasks.',4],
    ['Fine for light repairs; I would prefer a sturdier feel for frequent use.',3]
  ];
  for (const product of plan.products) {
    const existing = await db.collection('product_reviews').countDocuments({productId:product.id});
    if (existing > 6) throw new Error('Existing reviews exceed requested maximum');
    const target = randomInt(existing, 7);
    for (const user of shuffled(plan.users).slice(0, target - existing)) {
      const [text, rating] = pick(phrases);
      const date = new Date(Date.now() - randomInt(2, 25) * 86400000).toISOString();
      plan.reviews.push({ _id: String(new ObjectId()), productId: product.id, userId:user._id, username:user.username,
        rating, comment:'[Demo review] ' + text, createdAt:date, seedSource:source });
      const group = distribution.find(c => c.companyId === product.companyId);
      plan.orders.push({ _id:String(new ObjectId()), userId:user._id, recipientName:'Shop demo customer',
        deliveryAddress:'Demo address — no delivery required', deliveryNote:'Sample purchase for demonstration review.',
        items:[{id:product.id,name:product.name,price:product.price,quantity:1,companyId:product.companyId}],
        total:product.price, createdAt:date, deliveryDurationSeconds:60,
        packages:[{companyId:product.companyId,companyName:group.name,extraSeconds:0}], updates:[], seedSource:source });
    }
  }
  return plan;
}

async function applyPlan(db, plan) {
  // Record unrelated collections and original users/orders/reviews before the write.
  const protectedHashes = {};
  const names = (await db.listCollections().toArray()).map(c => c.name);
  for (const name of names) {
    if (['shop_products','users','shop_orders','product_reviews','sessions'].includes(name)) continue;
    protectedHashes[name] = hash(await db.collection(name).find().sort({_id:1}).toArray());
  }
  const originals = {};
  for (const name of ['users','shop_orders','product_reviews']) originals[name] = await db.collection(name).find({seedSource:{$ne:source}}).toArray();
  // Preflight every conflict before writing any documents.
  for (const product of plan.products) {
    if (!await db.collection('companies').findOne({_id:new ObjectId(product.companyId)})) throw new Error('A planned company no longer exists');
    const current = await db.collection('shop_products').findOne({id:product.id});
    if (current && current.seedSource !== source && (!product.original || hash(current) !== product.originalHash)) throw new Error('A product changed after preview');
  }
  for (const user of plan.users) {
    const existing = await db.collection('users').findOne({username:user.username});
    if (existing && String(existing._id) !== user._id) throw new Error('Demo username conflict');
  }
  for (const product of plan.products) {
    const fields = {companyId:new ObjectId(product.companyId), description:product.description,
      specifications:product.specifications, imageUrl:product.imageUrl, seedSource:source};
    if (product.original) {
      await db.collection('shop_products').updateOne({_id:new ObjectId(product._id),seedSource:{$ne:source}},{$set:fields});
    } else {
      await db.collection('shop_products').updateOne({_id:new ObjectId(product._id)},{$setOnInsert:{...fields,id:product.id,name:product.name,price:product.price,removed:false}},{upsert:true});
    }
  }
  for (const name of ['users','shop_orders','product_reviews']) {
    const docs = name === 'users' ? plan.users : name === 'shop_orders' ? plan.orders : plan.reviews;
    for (const row of docs) {
      const doc = {...row,_id:new ObjectId(row._id)};
      if (row.userId) doc.userId = new ObjectId(row.userId);
      if (row.createdAt) doc.createdAt = new Date(row.createdAt);
      await db.collection(name).updateOne({_id:doc._id},{$setOnInsert:doc},{upsert:true});
    }
  }
  for (const [name, before] of Object.entries(protectedHashes)) {
    if (hash(await db.collection(name).find().sort({_id:1}).toArray()) !== before) throw new Error('Unrelated data changed during run: '+name);
  }
  for (const [name, docs] of Object.entries(originals)) {
    for (const before of docs) {
      if (hash(await db.collection(name).findOne({_id:before._id})) !== hash(before)) throw new Error('Existing record changed: '+name);
    }
  }
  const result = summary(plan);
  result.preservedExistingUsersOrdersReviews = true;
  result.preservedOtherCollections = Object.keys(protectedHashes);
  result.verifiedAt = new Date().toISOString();
  for (const group of plan.selectedCompanies) {
    const count = await db.collection('shop_products').countDocuments({companyId:new ObjectId(group.companyId),removed:{$ne:true}});
    if (count !== group.count) throw new Error('Company product count mismatch');
  }
  for (const product of plan.products) {
    const reviews = await db.collection('product_reviews').countDocuments({productId:product.id});
    if (reviews < 0 || reviews > 6) throw new Error('Review count mismatch');
  }
  return result;
}

export { makePlan, applyPlan };
if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL('file:///' + process.argv[1].replaceAll('\\','/')))) {
  dotenv.config({path:fileURLToPath(new URL('../.env',folder)),quiet:true});
  const client = new MongoClient(process.env.DB,{serverSelectionTimeoutMS:15000});
  try {
    await client.connect();await mkdir(privateFolder,{recursive:true});const db=client.db();let plan;
    try { plan=JSON.parse(await readFile(planFile,'utf8')); }
    catch(error) { if(error.code!=='ENOENT')throw error; plan=await makePlan(db);await writeFile(planFile,JSON.stringify(plan,null,2)); }
    console.log(JSON.stringify(summary(plan),null,2));
    if(process.argv.includes('--apply')) {
      const result=await applyPlan(db,plan);await writeFile(reportFile,JSON.stringify(result,null,2));
      console.log('Shop population applied and checked. Re-running uses this same plan and does not duplicate it.');
    } else console.log('Preview only. Run node scripts/populate-shop.js --apply to apply this plan.');
  } catch(error) { console.error('Shop population stopped: '+error.name+' — '+(error.name==='Error'?error.message:'Check connection/configuration privately.'));process.exitCode=1; }
  finally {await client.close();}
}
