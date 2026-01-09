const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// GitHub OAuth configuration from environment variables
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// CORS configuration - allow requests from your docs site
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'DXS OAuth Proxy is running' });
});

// OAuth authorization endpoint - redirects to GitHub
app.get('/auth', (req, res) => {
  const { provider } = req.query;
  
  if (provider !== 'github') {
    return res.status(400).json({ error: 'Only GitHub provider is supported' });
  }

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo,user`;
  res.redirect(authUrl);
});

// OAuth callback endpoint - exchanges code for token
app.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description });
    }

    // Return the token in the format Decap CMS expects
    const content = `
      <script>
        (function() {
          function receiveMessage(e) {
            console.log("receiveMessage %o", e);
            window.opener.postMessage(
              'authorization:github:success:${JSON.stringify({ token: tokenData.access_token, provider: 'github' })}',
              e.origin
            );
            window.removeEventListener("message", receiveMessage, false);
          }
          window.addEventListener("message", receiveMessage, false);
          window.opener.postMessage("authorizing:github", "*");
        })();
      </script>
    `;
    
    res.send(content);
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: 'Failed to exchange code for token' });
  }
});

// Success endpoint (alternative callback format)
app.get('/success', (req, res) => {
  res.send('Authentication successful! You can close this window.');
});

app.listen(PORT, () => {
  console.log(`OAuth proxy server running on port ${PORT}`);
});
