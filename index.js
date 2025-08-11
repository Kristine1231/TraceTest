import fetch from 'node-fetch';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

const CODA_API_KEY = process.env.CODA_API_KEY;  // Set these in Render env vars
const CODA_DOC_ID = process.env.CODA_DOC_ID;
const CODA_TABLE_ID = process.env.CODA_TABLE_ID; // You can get this from Coda API

app.get('/', async (req, res) => {
  const targetUrl = req.query.target || req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing target URL');
  }

  // Find dynamic SOP key and value (exclude the target/url param)
  const sopParamEntry = Object.entries(req.query).find(([key]) => key !== 'target' && key !== 'url');
  let sop = 'Unknown';
  if (sopParamEntry) {
    [sopKey, sopValue] = sopParamEntry;
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Log click to Coda
  const payload = {
    rows: [
      {
        cells: [
          { column: 'COL_SOP', value: sop },
          { column: 'COL_DATE', value: today },
          { column: 'COL_URL', value: targetUrl },
        ],
      },
    ],
  };

  try {
    await fetch(`https://coda.io/apis/v1/docs/${CODA_DOC_ID}/tables/${encodeURIComponent(CODA_TABLE_ID)}/rows`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CODA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Error logging to Coda:', error);
    // Don't block redirect if logging fails
  }

  // Redirect user to the actual target URL
  return res.redirect(targetUrl);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

