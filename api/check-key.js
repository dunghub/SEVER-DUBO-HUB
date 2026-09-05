const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const fetch = require('node-fetch');

const uri = process.env.MONGODB_URI;
const SECRET_AUTH_TOKEN = 'DUBO-KEY-04/01/2012'; 
const LAYMA_API_TOKEN = process.env.LAYMA_API_TOKEN;
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
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Method not allowed' });

  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${SECRET_AUTH_TOKEN}`) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  const { action, hwid, key } = req.body;

  try {
    const client = await connectToDatabase();
    const db = client.db('keymanager'); 
    const tempCollection = db.collection('temp_keys');
    const mainCollection = db.collection('main_keys');

    // [ACTION 1]: TẠO KEY TẠM & RÚT GỌN QUA LAYMA.NET
    if (action === 'generate') {
      if (!hwid) return res.status(400).json({ status: 'error', message: 'Missing HWID' });
      
      let newKey;
      let isDuplicate = true;
      while (isDuplicate) {
        newKey = `DUBO-KEY=${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const checkTemp = await tempCollection.findOne({ key: newKey });
        const checkMain = await mainCollection.findOne({ key: newKey });
        if (!checkTemp && !checkMain) isDuplicate = false;
      }
      
      await tempCollection.updateOne(
        { hwid: hwid }, 
        { $set: { key: newKey, createdAt: new Date() } }, 
        { upsert: true }
      );
      
      const formattedAuthTool = `https://authtool.app/get-key/?result=${newKey}`;
      const encodedUrl = encodeURIComponent(formattedAuthTool);
      const laymaApiUrl = `https://api.layma.net/api/admin/shortlink/quicklink?tokenUser=${LAYMA_API_TOKEN}&format=json&url=${encodedUrl}&link_du_phong=${encodedUrl}`;
      
      try {
        const laymaRes = await fetch(laymaApiUrl).then(r => r.json());
        if (laymaRes && (laymaRes.html || laymaRes.shorturl)) {
          return res.status(200).json({ status: 'success', shortLink: laymaRes.html || laymaRes.shorturl });
        }
      } catch (err) {
        // Fallback về link gốc nếu lỗi mạng hoặc API layma gặp sự cố
      }
      
      return res.status(200).json({ status: 'success', shortLink: formattedAuthTool });
    }

    // [ACTION 2]: XÁC THỰC KEY (SUBMIT) & CẤP THỜI GIAN 24H
    if (action === 'submit') {
      if (!hwid || !key || !key.startsWith("DUBO-KEY=")) {
        return res.status(403).json({ status: 'failed', message: 'Dinh dang key sai!' });
      }
      
      const tempRecord = await tempCollection.findOne({ hwid: hwid, key: key });
      
      if (tempRecord) {
        await tempCollection.deleteOne({ _id: tempRecord._id });
        
        const expireTimestamp = Math.floor(Date.now() / 1000) + (24 * 60 * 60); 
        
        await mainCollection.updateOne(
          { hwid: hwid }, 
          { $set: { key: key, expireAt: new Date(expireTimestamp * 1000), createdAt: new Date() } }, 
          { upsert: true }
        );

        return res.status(200).json({ 
          status: 'success', 
          expireTimestamp: expireTimestamp 
        });
      } else {
        return res.status(403).json({ status: 'failed', message: 'Key khong khop hoac da het han!' });
      }
    }

    return res.status(400).json({ status: 'error', message: 'Invalid action' });
  } catch (error) {
    return res.status(500).json({ status: 'error', details: error.message });
  }
};
