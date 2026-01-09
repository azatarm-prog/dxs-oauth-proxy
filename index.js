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

// Function to handle OAuth callback
async function handleOAuthCallback(code, res) {
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
<!DOCTYPE html>
<html>
<head>
  <title>OAuth Callback</title>
</head>
<body>
  <p>Authenticating...</p>
  <script>
    (function() {
      const token = "${tokenData.access_token}";
      const provider = "github";
      
      function sendMessage(message) {
        if (window.opener) {
          window.opener.postMessage(message, "*");
        }
      }
      
      function receiveMessage(e) {
        console.log("receiveMessage", e);
        if (e.data === "authorizing:github") {
          return;
        }
        sendMessage(
          'authorization:github:success:' + JSON.stringify({ token: token, provider: provider })
        );
        window.removeEventListener("message", receiveMessage, false);
      }
      
      window.addEventListener("message", receiveMessage, false);
      
      // Send initial message to opener
      sendMessage("authorizing:github");
      
      // Also try sending success directly after a short delay
      setTimeout(function() {
        sendMessage(
          'authorization:github:success:' + JSON.stringify({ token: token, provider: provider })
        );
        // Close the window after sending
        setTimeout(function() {
          window.close();
        }, 1000);
      }, 500);
    })();
  </script>
</body>
</html>
    `;
    
    res.send(content);
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: 'Failed to exchange code for token' });
  }
}

// Health check endpoint - also handles callback if code is present
app.get('/', async (req, res) => {
  const { code } = req.query;
  
  // If code is present, this is an OAuth callback
  if (code) {
    return handleOAuthCallback(code, res);
  }
  
  // Otherwise, return health check
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
  return handleOAuthCallback(code, res);
});

// Success endpoint (alternative callback format)
app.get('/success', (req, res) => {
  res.send('Authentication successful! You can close this window.');
});

app.listen(PORT, () => {
  console.log(`OAuth proxy server running on port ${PORT}`);
});
