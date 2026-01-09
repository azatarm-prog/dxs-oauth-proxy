# DXS OAuth Proxy

OAuth proxy service for Decap CMS GitHub authentication.

## Deployment on Railway

1. Deploy this repository to Railway
2. Set the following environment variables in Railway:
   - `GITHUB_CLIENT_ID`: Your GitHub OAuth App Client ID
   - `GITHUB_CLIENT_SECRET`: Your GitHub OAuth App Client Secret

## GitHub OAuth App Setup

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** DXS Docs CMS
   - **Homepage URL:** https://docs.dxs.app
   - **Authorization callback URL:** https://YOUR-RAILWAY-OAUTH-DOMAIN/callback
4. Click "Register application"
5. Copy the Client ID
6. Click "Generate a new client secret" and copy it

## Endpoints

- `GET /` - Health check
- `GET /auth?provider=github` - Initiates OAuth flow
- `GET /callback` - OAuth callback handler
