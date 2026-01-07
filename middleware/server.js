require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// SQL Server configuration for DSE MDS
const config = {
  server: process.env.DSE_MDS_HOST,
  database: process.env.DSE_MDS_DATABASE,
  user: process.env.DSE_MDS_USER,
  password: process.env.DSE_MDS_PASSWORD,
  port: parseInt(process.env.DSE_MDS_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// API Key authentication middleware
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!process.env.API_KEY || apiKey === process.env.API_KEY) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get prices for symbols
app.get('/api/prices', authenticate, async (req, res) => {
  const symbols = req.query.symbols?.split(',').filter(s => s.trim()) || [];
  
  if (symbols.length === 0) {
    return res.json({ prices: [], message: 'No symbols provided' });
  }

  let pool;
  try {
    pool = await sql.connect(config);
    
    // Build parameterized query to prevent SQL injection
    const symbolParams = symbols.map((_, i) => `@symbol${i}`).join(', ');
    const request = pool.request();
    symbols.forEach((symbol, i) => {
      request.input(`symbol${i}`, sql.VarChar, symbol.trim());
    });

    // Query the MDS database - adjust table/column names based on actual schema
    // Common DSE MDS table names: MARKET_WATCH, LIVE_MARKET, STOCK_PRICE, etc.
    const query = `
      SELECT 
        SYMBOL as symbol,
        LTP as lastPrice,
        HIGH as high,
        LOW as low,
        OPEN as open,
        CLOSE as previousClose,
        VOLUME as volume,
        VALUE as value,
        TRADE as trades,
        CHANGE as change,
        CHANGE_PERCENT as changePercent,
        GETDATE() as fetchedAt
      FROM MARKET_WATCH 
      WHERE SYMBOL IN (${symbolParams})
    `;

    const result = await request.query(query);
    
    res.json({
      success: true,
      count: result.recordset.length,
      prices: result.recordset,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
});

// Get all available symbols
app.get('/api/symbols', authenticate, async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(config);
    
    // Query to get all available symbols
    const query = `
      SELECT DISTINCT SYMBOL as symbol, COMPANY_NAME as companyName
      FROM MARKET_WATCH 
      ORDER BY SYMBOL
    `;

    const result = await pool.request().query(query);
    
    res.json({
      success: true,
      count: result.recordset.length,
      symbols: result.recordset
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
});

// Test database connection
app.get('/api/test-connection', authenticate, async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(config);
    
    // Get list of tables to understand the schema
    const tablesQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;
    
    const result = await pool.request().query(tablesQuery);
    
    res.json({
      success: true,
      message: 'Connected to DSE MDS successfully',
      tables: result.recordset.map(r => r.TABLE_NAME),
      server: process.env.DSE_MDS_HOST,
      database: process.env.DSE_MDS_DATABASE
    });

  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      server: process.env.DSE_MDS_HOST
    });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DSE MDS Middleware running on port ${PORT}`);
  console.log(`Server: ${process.env.DSE_MDS_HOST}`);
  console.log(`Database: ${process.env.DSE_MDS_DATABASE}`);
});
