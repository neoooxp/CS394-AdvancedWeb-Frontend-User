# User / Admin Portal - DigitalOcean App Platform Deployment

This project is configured for single-click deployment as a **Static Site** on DigitalOcean App Platform.

## Quick Deploy Steps
1. Push this repository to GitHub/GitLab.
2. In DigitalOcean Control Panel, go to **Apps** -> **Create App**.
3. Select this repository. DigitalOcean will auto-detect `.do/app.yaml`.
4. Ensure `VITE_API_BASE_URL` is set to your deployed backend API URL (e.g., `https://your-backend.ondigitalocean.app/api`).
5. Click **Deploy**.
