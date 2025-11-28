# Deployment Guide for Sandesh.AI

This guide covers deploying both the frontend (Vercel) and the optional Python backend service.

## Frontend Deployment (Vercel)

Your frontend is already deployed at: https://sandesh-ai.vercel.app/

### Environment Variables on Vercel

To configure your Vercel deployment:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```bash
# Required: Supabase Configuration (should already be set)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Google Sheets Integration
VITE_GOOGLE_APPS_SCRIPT_URL=your_apps_script_url

# Optional: AWS S3 for Image Storage
VITE_AWS_ACCESS_KEY_ID=your_access_key
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key
VITE_AWS_REGION=ap-south-1
VITE_S3_BUCKET_NAME=your_bucket_name

# Optional: Python Backend for EdTech Events
VITE_EDTECH_EVENTS_URL=https://your-python-backend.railway.app/edtech-events
```

4. Click **Save**
5. Redeploy your application

---

## Python Backend Deployment (Optional)

The Python backend provides the **EdTech Events** feature. If you don't need this feature, you can skip this section.

### Option 1: Deploy to Railway (Recommended - Free Tier Available)

#### Step 1: Prepare the Python Service

First, create a `requirements.txt` file in the `python_services` directory:

```bash
cd python_services
pip freeze > requirements.txt
```

Or manually create `python_services/requirements.txt` with:

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-dateutil==2.8.2
```

#### Step 2: Create a Railway Account

1. Go to https://railway.app/
2. Sign up with GitHub
3. Click **New Project** → **Deploy from GitHub repo**
4. Select your repository
5. Railway will auto-detect the Python service

#### Step 3: Configure Railway

1. In Railway dashboard, go to your service
2. Click **Settings** → **Environment**
3. Set the following:
   - **Start Command**: `uvicorn marcom_service:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: `python_services`
4. Click **Deploy**

#### Step 4: Get Your Railway URL

1. Once deployed, Railway will give you a URL like: `https://your-app.railway.app`
2. Your EdTech Events endpoint will be: `https://your-app.railway.app/edtech-events`

#### Step 5: Update Vercel Environment Variable

1. Go back to Vercel → **Settings** → **Environment Variables**
2. Add or update:
   ```
   VITE_EDTECH_EVENTS_URL=https://your-app.railway.app/edtech-events
   ```
3. Redeploy your Vercel app

---

### Option 2: Deploy to Render (Alternative)

#### Step 1: Create Render Account

1. Go to https://render.com/
2. Sign up with GitHub
3. Click **New** → **Web Service**
4. Connect your GitHub repository

#### Step 2: Configure Render

Fill in the following:
- **Name**: `sandesh-ai-backend`
- **Root Directory**: `python_services`
- **Environment**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn marcom_service:app --host 0.0.0.0 --port $PORT`
- **Plan**: Free

#### Step 3: Deploy

1. Click **Create Web Service**
2. Wait for deployment to complete
3. Copy your Render URL (e.g., `https://sandesh-ai-backend.onrender.com`)

#### Step 4: Update Vercel

Add to Vercel environment variables:
```
VITE_EDTECH_EVENTS_URL=https://sandesh-ai-backend.onrender.com/edtech-events
```

---

### Option 3: Deploy to Fly.io

#### Step 1: Install Fly CLI

```bash
# macOS
brew install flyctl

# Or use install script
curl -L https://fly.io/install.sh | sh
```

#### Step 2: Login and Initialize

```bash
cd python_services
fly auth login
fly launch
```

Follow the prompts:
- App name: `sandesh-ai-backend`
- Region: Choose closest to your users
- PostgreSQL: No
- Redis: No

#### Step 3: Deploy

```bash
fly deploy
```

#### Step 4: Get Your URL

```bash
fly status
```

Your URL will be: `https://sandesh-ai-backend.fly.dev`

Update Vercel:
```
VITE_EDTECH_EVENTS_URL=https://sandesh-ai-backend.fly.dev/edtech-events
```

---

## Testing the Deployment

### Test Frontend

1. Visit https://sandesh-ai.vercel.app/
2. Navigate to **Suggestions** page
3. Click **Refresh Events** button
4. If backend is configured, you should see upcoming events
5. If not configured, you'll see a friendly error message (this is normal)

### Test Backend Directly

Visit your backend URL in a browser:
```
https://your-backend-url.com/edtech-events
```

You should see JSON response with events data.

---

## Troubleshooting

### Frontend Issues

**Problem**: Environment variables not working
- **Solution**: Make sure variables start with `VITE_`
- Redeploy after adding variables

**Problem**: Build fails
- **Solution**: Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`

### Backend Issues

**Problem**: Backend not responding
- **Solution**: Check logs in Railway/Render/Fly.io dashboard
- Verify `requirements.txt` has all dependencies
- Ensure start command is correct

**Problem**: CORS errors
- **Solution**: The backend already has CORS configured
- If issues persist, check the `marcom_service.py` CORS settings

---

## Cost Estimates

### Free Tier Limits

- **Vercel**: Unlimited deployments, 100GB bandwidth/month
- **Railway**: $5 free credit/month (enough for small apps)
- **Render**: 750 hours/month free (enough for 1 service)
- **Fly.io**: 3 shared VMs free

### Recommended Setup

For production use:
- **Frontend**: Vercel (Free tier is sufficient)
- **Backend**: Railway or Render (Free tier works for low traffic)
- **Database**: Supabase (Free tier: 500MB database, 2GB bandwidth)

---

## Quick Start Checklist

- [ ] Frontend deployed to Vercel ✅ (Already done)
- [ ] Environment variables configured in Vercel
- [ ] Python backend deployed (Optional)
- [ ] `VITE_EDTECH_EVENTS_URL` added to Vercel
- [ ] Test the deployment
- [ ] Monitor logs for any errors

---

## Support

If you encounter issues:
1. Check the deployment logs
2. Verify all environment variables are set
3. Test endpoints individually
4. Check CORS settings if getting cross-origin errors

For the EdTech Events feature to work, both frontend and backend must be deployed and connected via the `VITE_EDTECH_EVENTS_URL` environment variable.
