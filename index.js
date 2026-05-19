const https = require('https');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.DATABASE_ID;

require('http').createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if(req.method === 'OPTIONS'){res.writeHead(204);res.end();return;}

  const body = JSON.stringify({page_size: 100});
  const options = {
    hostname: 'api.notion.com',
    path: `/v1/databases/${DATABASE_ID}/query`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const notionReq = https.request(options, notionRes => {
    let data = '';
    notionRes.on('data', chunk => data += chunk);
    notionRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const entries = (parsed.results || []).map(page => ({
          stream: page.properties['Income Stream']?.select?.name || '',
          sub: page.properties['Sub-Category']?.select?.name || '',
          status: page.properties['Status']?.select?.name || '',
          phase: page.properties['Phase']?.select?.name || '',
          type: page.properties['Allocation Type']?.select?.name || '',
          amount: page.properties['Amount']?.number || 0,
          date: page.properties['Week of']?.date?.start || ''
        }));
        res.writeHead(200);
        res.end(JSON.stringify(entries));
      } catch(e) {
        res.writeHead(500);
        res.end(JSON.stringify({error: e.message}));
      }
    });
  });

  notionReq.on('error', e => {
    res.writeHead(500);
    res.end(JSON.stringify({error: e.message}));
  });

  notionReq.write(body);
  notionReq.end();

}).listen(process.env.PORT || 3000, () => console.log('Proxy running'));
