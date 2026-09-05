const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// ĐÃ LIÊN KẾT ĐƯỜNG DẪN ĐẾN DATABASE MONGODB CỦA BẠN (AN TOÀN QUA BIẾN MÔI TRƯỜNG)
const uri = process.env.MONGODB_URI;
const SECRET_AUTH_TOKEN = process.env.SECRET_AUTH_TOKEN; 
let cachedClient = null;

const SERVER_SIGN_KEY = "DUBO_MAT_KHAU_KY_FILE_AN_DANH_2026"; 

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  if (!uri) throw new Error("Thieu MONGODB_URI!");
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

function createServerSignature(data) {
  return crypto.createHmac('sha256', SERVER_SIGN_KEY).update(data).digest('hex');
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

    if (action === 'submit') {
      if (!hwid || !key) return res.status(400).json({ status: 'error' });
      const tempRecord = await tempCollection.findOne({ hwid: hwid, key: key });
      if (!tempRecord) return res.status(403).json({ status: 'failed', message: 'Key fake hoac sai phan cung!' });

      await tempCollection.deleteOne({ _id: tempRecord._id });
      
      const expireAt = new Date();
      expireAt.setHours(expireAt.getHours() + 24); 
      const expireTimestamp = expireAt.getTime();

      await mainCollection.updateOne({ hwid: hwid }, { $set: { key: key, expireAt: expireAt, createdAt: new Date() } }, { upsert: true });

      const rawData = `DUBOd${expireTimestamp}h${hwid}`;
      const signature = createServerSignature(rawData); 
      const finalSecureToken = Buffer.from(`${rawData}|${signature}`).toString('base64');

      return res.status(200).json({ status: 'success', token: finalSecureToken });
    }

    if (action === 'check_status') {
      if (!hwid || !key) return res.status(400).json({ status: 'error' });

      let decodedString = "";
      try {
         decodedString = Buffer.from(key, 'base64').toString('utf-8');
      } catch(e) {
         return res.status(404).json({ status: 'expired', message: 'File can thiep trai phep!' });
      }

      if (!decodedString.includes('|')) return res.status(404).json({ status: 'expired' });
      
      const [rawData, userSignature] = decodedString.split('|');
      
      const validSignature = createServerSignature(rawData);
      if (userSignature !== validSignature) {
         return res.status(403).json({ status: 'expired', message: 'Chu ky gia mao!' });
      }

      const match = rawData.match(/DUBOd(\d+)h(.+)/);
      if (!match) return res.status(404).json({ status: 'expired' });
      
      const tokenExpire = parseInt(match[1]);
      const tokenHWID = match[2];

      if (tokenHWID !== hwid || Date.now() > tokenExpire) {
         return res.status(404).json({ status: 'expired', message: 'Het han hoac sai phan cung!' });
      }

      const timeLeft = tokenExpire - Date.now();
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minsLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      return res.status(200).json({ status: 'active', timeLeft: `${hoursLeft} giờ ${minsLeft} phút` });
    }
    return res.status(400).json({ status: 'error' });
  } catch (error) {
    return res.status(500).json({ status: 'error', details: error.message });
  }
};
