require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const cron = require('node-cron');
const WebSocket = require('ws');
const { ethers } = require('ethers');

// Load your contract ABI (adjust path if needed)
//const OracleRegistryABI = require('./OracleRegistry.json');

// -------------------------------------
// 1) ENV & CONFIG
// -------------------------------------
const {
  // Database
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASS,
  DB_NAME,

  // Ingestion
  INGESTION_MODE,
  WEBSOCKET_URL,
  POLL_INTERVAL_CRON,
  WEATHERAPI_KEY,
  WEATHERAPI_CITY,
  WEATHERAPI_FORECAST_DAYS,

  // On-chain (optional)
  RPC_URL,
  PRIVATE_KEY,
  CONTRACT_ADDRESS
} = process.env;

// -------------------------------------
// 2) POSTGRES SETUP
// -------------------------------------
const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  max: 10,
  idleTimeoutMillis: 30000
});

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS fetched_data (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
`;

async function initDB() {
  try {
    await pool.query(createTableQuery);
    console.log('Table "fetched_data" is ready.');
  } catch (err) {
    console.error('Error creating table fetched_data:', err);
    process.exit(1);
  }
}

// Insertion function with detailed logs
async function storeFetchedData(source, payload) {
  try {
    console.log('Storing into DB. Source:', source);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    await pool.query(
      'INSERT INTO fetched_data (source, data) VALUES ($1, $2)',
      [source, payload]
    );
    console.log(`Data from ${source} stored successfully.\n`);
  } catch (err) {
    console.error(`Error storing data from ${source}:`, err);
  }
}
/*
// -------------------------------------
// 3) ETHERS + CONTRACT (Optional)
// -------------------------------------
function getContract() {
  if (!RPC_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.error('Missing RPC_URL, PRIVATE_KEY, or CONTRACT_ADDRESS in .env');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  return new ethers.Contract(CONTRACT_ADDRESS, OracleRegistryABI, wallet);
}

async function pushDataOnChain(data) {
  try {
    const contract = getContract();
    const stringified = JSON.stringify(data);

    console.log('Pushing data on-chain...');
    const tx = await contract.pushData(stringified, { gasLimit: 1000000 });
    console.log('Tx sent:', tx.hash);

    // Wait for 1 confirmation
    const receipt = await tx.wait(1);
    console.log('Tx mined in block:', receipt.blockNumber, '\n');
  } catch (err) {
    console.error('Error pushing data on-chain:', err);
  }
}
*/
// -------------------------------------
// 4) WEBSOCKET INGESTION
// -------------------------------------
let ws;
function setupWebSocketConnection() {
  if (!WEBSOCKET_URL) {
    console.error('Missing WEBSOCKET_URL in .env');
    process.exit(1);
  }

  console.log(`Connecting to WebSocket: ${WEBSOCKET_URL}`);
  ws = new WebSocket(WEBSOCKET_URL);

  ws.on('open', () => {
    console.log('WebSocket connection established.');
  });

  ws.on('message', async (message) => {
    try {
      let parsed;
      try {
        parsed = JSON.parse(message);
      } catch (e) {
        parsed = { rawData: message };
      }

      // Log the raw data
      console.log('Received WebSocket data:', JSON.stringify(parsed, null, 2));

      // Store in DB
      await storeFetchedData('websocket', parsed);

      // Optional push on-chain (uncomment if you want):
      // await pushDataOnChain(parsed);

    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });

  ws.on('close', () => {
    console.warn('WebSocket closed. Reconnect in 5s...');
    setTimeout(setupWebSocketConnection, 5000);
  });
}

// -------------------------------------
// 5) REST POLLING (WeatherAPI, etc.)
// -------------------------------------
function setupRestPolling() {
  if (!WEATHERAPI_KEY || !WEATHERAPI_CITY || !WEATHERAPI_FORECAST_DAYS) {
    console.error('Missing WEATHERAPI_KEY, WEATHERAPI_CITY, or WEATHERAPI_FORECAST_DAYS in .env');
    process.exit(1);
  }
  if (!POLL_INTERVAL_CRON) {
    console.error('Missing POLL_INTERVAL_CRON in .env');
    process.exit(1);
  }

  const city = encodeURIComponent(WEATHERAPI_CITY);
  const days = WEATHERAPI_FORECAST_DAYS;
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=${city}&days=${days}&aqi=no&alerts=no`;

  console.log('REST polling for WeatherAPI...');
  console.log(`Cron: ${POLL_INTERVAL_CRON}`);
  console.log(`URL: ${url}`);

  cron.schedule(POLL_INTERVAL_CRON, async () => {
    console.log('CRON: Fetching data from WeatherAPI...');
    try {
      // Fetch data from WeatherAPI
      const response = await axios.get(url);

      // Log the raw data
      console.log('WeatherAPI Response:', JSON.stringify(response.data, null, 2));

      // Store in DB
      await storeFetchedData('weatherapi', response.data);

      // Optional push on-chain
      await pushDataOnChain(response.data);

    } catch (err) {
      console.error('Error fetching WeatherAPI data:', err.message);
    }
  });
}

// -------------------------------------
// 6) EXPRESS SERVER
// -------------------------------------
const app = express();
app.use(express.json());

// Sample route: last 10 records
app.get('/api/fetched-data', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, source, data, created_at
      FROM fetched_data
      ORDER BY id DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await initDB();

  if (INGESTION_MODE === 'websocket') {
    setupWebSocketConnection();
  } else if (INGESTION_MODE === 'rest') {
    setupRestPolling();
  } else {
    console.log('No valid INGESTION_MODE found. Must be "websocket" or "rest" in .env');
    process.exit(1);
  }

  console.log(`Server up on port ${PORT} in ${INGESTION_MODE.toUpperCase()} mode`);
});
