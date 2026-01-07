# DSE MDS Middleware Server

A Node.js middleware server that connects to DSE MDS SQL Server database and exposes a REST API for fetching stock prices.

## Quick Start

### 1. Install Dependencies
```bash
cd middleware
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your DSE MDS credentials
```

### 3. Run Locally
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### Test Database Connection
```
GET /api/test-connection
Headers: x-api-key: your_api_key (if configured)
```
Returns list of available tables in the MDS database.

### Get Prices
```
GET /api/prices?symbols=BRACBANK,ROBI,BATBC
Headers: x-api-key: your_api_key (if configured)
```

### Get All Symbols
```
GET /api/symbols
Headers: x-api-key: your_api_key (if configured)
```

## Deployment Options

### Option 1: Railway (Recommended)
1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Add environment variables in Railway dashboard
4. Deploy automatically

### Option 2: Render
1. Create account at [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repo
4. Add environment variables
5. Deploy

### Option 3: Local with ngrok (Testing)
1. Run server locally: `npm start`
2. Install ngrok: `npm install -g ngrok`
3. Expose port: `ngrok http 3000`
4. Use the ngrok URL as MIDDLEWARE_URL

## After Deployment

1. Copy the deployed URL (e.g., `https://your-app.railway.app`)
2. Add it as `MIDDLEWARE_URL` secret in Lovable
3. The edge function will automatically use it

## Troubleshooting

### Connection Issues
- Verify DSE MDS IP is accessible from deployment server
- Check if port 1433 is open
- Verify credentials are correct

### Table Names
The default query assumes a `MARKET_WATCH` table. Use `/api/test-connection` to see actual table names and adjust the queries in `server.js` accordingly.

## Security Notes

- Always use HTTPS in production
- Set a strong API_KEY
- Never commit `.env` file to version control
