const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const uri = process.env.MONGODB_URI;
const SECRET_AUTH_TOKEN = process.env.SECRET_AUTH_TOKEN; 
let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  if (!uri) throw new Error("Thieu MONGODB_URI!");
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 'error' });

  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${SECRET_AUTH_TOKEN}`) {
    return res.status(401).json({ status: 'error', message: 'Trai phep' });
  }

  const { action, hwid, key } = req.body;

  try {
    const client = await connectToDatabase();
    const db = client.db('keymanager'); 
    const tempCollection = db.collection('temp_keys');
    const mainCollection = db.collection('main_keys');

    // [HANH DONG 1]: GET KEY
    if (action === 'generate') {
      if (!hwid) return res.status(400).json({ status: 'error' });
      let newKey;
      let isDuplicate = true;
      while (isDuplicate) {
        newKey = `DUBO-KEY=${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const checkTemp = await tempCollection.findOne({ key: newKey });
        const checkMain = await mainCollection.findOne({ key: newKey });
        if (!checkTemp && !checkMain) isDuplicate = false;
      }
      await tempCollection.updateOne({ hwid: hwid }, { $set: { key: newKey, createdAt: new Date() } }, { upsert: true });
      return res.status(200).json({ status: 'success', key: newKey });
    }

    // [HANH DONG 2]: SUBMIT -> CHI TRA VE GIO CHUAN CUA DAM MAY
    if (action === 'submit') {
      if (!hwid || !key) return res.status(400).json({ status: 'error' });
      const tempRecord = await tempCollection.findOne({ hwid: hwid, key: key });
      if (!tempRecord) return res.status(403).json({ status: 'failed' });

      await tempCollection.deleteOne({ _id: tempRecord._id });
      
      const expireAt = new Date();
      expireAt.setHours(expireAt.getHours() + 24); 

      await mainCollection.updateOne({ hwid: hwid }, { $set: { key: key, expireAt: expireAt, createdAt: new Date() } }, { upsert: true });

      // Tra ve thoi gian hien tai cua internet dam may de script tu tinh toan
      return res.status(200).json({ status: 'success', serverTime = Math.floor(Date.now() / 1000) });
    }

    return res.status(400).json({ status: 'error' });
  } catch (error) {
    return res.status(500).json({ status: 'error', details: error.message });
  }
};
