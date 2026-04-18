# Vercel Environment Variables Configuration

## Required Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

### Production Environment
```
NEXT_PUBLIC_API_URL=https://catalystsa.onrender.com
```

## How to Add:
1. Go to https://vercel.com/nejabobo-engs-projects/catalystsa-admin-fyd5/settings/environment-variables
2. Add variable:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://catalystsa.onrender.com`
   - Environment: Production, Preview, Development (all selected)
3. Redeploy for changes to take effect

## Verification:
After deployment, check browser console for the API URL being used.
