# Deployment Guide for GITAM Faculty Management System

## Important Note About Figma Make

**Figma Make automatically handles all build configuration.** You don't need to manually create `package.json`, `vite.config.js`, or `netlify.toml` files. The platform manages:
- Build commands
- Output directories
- Node versions
- Dependency management

## If Deploying to External Platforms (Netlify, Vercel, etc.)

If you export this project and deploy it outside of Figma Make, you'll need these configuration files:

### 1. package.json (Create in root directory)

```json
{
  "name": "gitam-faculty-management",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "lucide-react": "latest",
    "sonner": "^2.0.3",
    "@supabase/supabase-js": "latest"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

### 2. vite.config.js (Create in root directory)

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
  },
  server: {
    port: 3000,
  },
});
```

### 3. netlify.toml (Create in root directory)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 4. vercel.json (Alternative for Vercel deployment)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Current Project Status

✅ **Working in Figma Make**
- All features implemented
- Authentication system complete
- Faculty dashboard functional
- Admin dashboard functional
- File uploads working
- Academic year filtering active

## Deployment Checklist (External Platforms)

If deploying outside Figma Make:

1. ✅ Export project files
2. ✅ Create package.json with correct dependencies
3. ✅ Create vite.config.js with proper build settings
4. ✅ Create platform-specific config (netlify.toml or vercel.json)
5. ⚠️ Update Supabase configuration with production URLs
6. ⚠️ Set up environment variables for API keys
7. ⚠️ Configure file upload storage (if using real backend)
8. ⚠️ Test build locally with `npm run build`
9. ⚠️ Deploy and verify all routes work

## Environment Variables Needed

If you're using real backend services:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Common Deployment Issues & Solutions

### Issue: 404 on page refresh
**Solution:** Add redirects configuration (included in netlify.toml above)

### Issue: Build fails with module errors
**Solution:** Ensure all imports use correct paths and all dependencies are in package.json

### Issue: CSS not loading
**Solution:** Verify Tailwind CSS v4 is properly configured and globals.css is imported in App.tsx

### Issue: Images not displaying
**Solution:** Ensure image paths are correct and assets are in the dist folder after build

## For Figma Make Users

**You don't need to do anything!** Figma Make handles all of this automatically. Just:
1. Make your changes in the editor
2. Preview to test
3. Your app is automatically deployed

## Questions?

If you're having deployment issues in Figma Make, the platform support team can help with build configuration.

If you're exporting to deploy elsewhere, follow the checklist above and ensure all configuration files are created with the exact content shown.
