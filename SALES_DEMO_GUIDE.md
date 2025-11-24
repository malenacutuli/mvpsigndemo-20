# Sales Demo System Guide

Your multi-brand sales demo system is now ready! You can create themed versions of your app for different prospects while using the same database and functionality.

## 🚀 How It Works

All demos use your existing:
- ✅ Database and videos
- ✅ User authentication
- ✅ Upload and processing features
- ✅ All functionality

Only the **branding changes** per demo:
- 🎨 Colors (primary, accent, secondary)
- 🖼️ Logo
- ✍️ Copy (hero text, tagline, CTA buttons)
- 📱 Navigation links (can hide dashboard/videos for public demos)

## 📍 Demo URLs

Your demos are accessible at:

- **Default**: `axessvideo.com` → Full Axessible branding
- **Interbrand**: `axessvideo.com/interbrand` → Interbrand branding
- **Nike**: `axessvideo.com/nike` → Nike branding
- **Coca-Cola**: `axessvideo.com/cocacola` → Coca-Cola branding

All routes preserve context:
- `axessvideo.com/interbrand/explore` → Explore page with Interbrand branding
- `axessvideo.com/nike/pricing` → Pricing page with Nike branding
- `axessvideo.com/interbrand/watch/{video-id}` → Video page with Interbrand branding

## 🎨 Demo Context Preservation

The demo system automatically preserves branding context when navigating between pages. This means:

✅ **Clicking videos** from `/interbrand` takes users to `/interbrand/watch/{id}` with Interbrand branding
✅ **Back buttons** return users to the correct demo page (e.g., `/interbrand/public`)
✅ **All internal links** maintain demo context using the `getPath()` helper

### How It Works

The `ThemeContext` provides a `getPath()` helper that automatically prefixes routes with the current demo ID:

```typescript
// In a demo context (e.g., /interbrand)
getPath('/watch/123')  // Returns: /interbrand/watch/123

// In default context
getPath('/watch/123')  // Returns: /watch/123
```

### For New Features

When adding new components or pages that link to other routes, always use `getPath()`:

```typescript
import { useTheme } from '@/contexts/ThemeContext';

const MyComponent = () => {
  const { getPath } = useTheme();
  
  return (
    <Link to={getPath('/some-page')}>
      Click me
    </Link>
  );
};
```

## 🎯 Adding a New Demo (10 minutes)

### Step 1: Upload Client Logo

1. Save logo as: `public/assets/demo-logos/client-name-logo.png`
2. Recommended: PNG with transparent background, 200-400px height

### Step 2: Add Theme Configuration

Edit `src/config/demoThemes.ts` and add:

```typescript
'client-name': {
  id: 'client-name',
  name: 'Client Company Name',
  logo: '/assets/demo-logos/client-name-logo.png',
  colors: {
    primary: '214 100% 47%',      // Brand color in HSL
    primaryGlow: '214 100% 57%',  // Lighter version
    accent: '204 94% 94%',        // Accent color
    secondary: '210 30% 92%',     // Secondary surface
  },
  companyName: 'Client Company',
  tagline: 'Their tagline or value prop',
  heroTitle: 'Main headline for hero section',
  heroSubtitle: 'Supporting text that explains the value',
  ctaText: 'Call to action button text',
  hideNavLinks: ['dashboard', 'videos'], // Optional: hide links for public demos
},
```

### Step 3: Add Routes

Edit `src/App.tsx` and add demo routes including the watch route (around line 44):

```typescript
<Route path="/client-name" element={<Index />} />
<Route path="/client-name/auth" element={<DemoAuth />} />
<Route path="/client-name/explore" element={<Explore />} />
<Route path="/client-name/watch/:id" element={<PublicVideo />} />
<Route path="/client-name/enterprise" element={<Enterprise />} />
```

### Step 4: Deploy

Click **Publish** → **Update** in Lovable (takes ~2 minutes)

### Step 5: Share

Send prospect: `axessvideo.com/client-name`

## 🎨 Finding Brand Colors

To convert HEX colors to HSL:

1. Go to: https://convertingcolors.com/
2. Enter brand HEX color (e.g., `#FF0000`)
3. Copy HSL values (e.g., `0 100% 50%`)
4. Use in theme config: `primary: '0 100% 50%'`

**Pro tip**: Use brand's primary color for `primary`, a lighter version for `primaryGlow`

## ⚙️ What Can You Customize?

### ✅ Per Demo

- Logo and favicon
- All colors (primary, secondary, accent)
- Hero title and subtitle
- All button text (CTAs)
- Navigation links visibility
- Page title (browser tab)
- Tagline/value proposition

### ❌ Shared (Not Per Demo)

- Database and videos
- User authentication flow
- Video player functionality
- Upload features
- Page layouts and sections
- Core functionality

## 🔒 Hiding Lovable Badge

Already done! The Lovable badge is hidden by default. Each demo shows:

```
Powered by Axessible
```

To remove this line, set in theme config:
```typescript
showPoweredBy: false,  // Add this field
```

Then update `src/components/Hero.tsx` to check this flag.

## 🌐 Using Your Custom Domain

Your domain `axessvideo.com` is already set up. All demo routes work automatically:

- ✅ `axessvideo.com` → Main site
- ✅ `axessvideo.com/interbrand` → Interbrand demo
- ✅ `axessvideo.com/nike` → Nike demo
- ✅ `axessvideo.com/cocacola` → Coca-Cola demo

No additional DNS setup needed!

## 📊 Secret Links with Tracking (Optional)

Add query parameters for private sharing:

- `axessvideo.com/interbrand?ref=proposal-2024`
- `axessvideo.com/nike?ref=q1-pitch`

You can track these in analytics later.

## 🎬 Current Demo Themes

### 1. Interbrand
- **URL**: `/interbrand`
- **Colors**: Red theme (#E41F3C)
- **Focus**: Brand-first video experience
- **Navigation**: Public links only

### 2. Nike
- **URL**: `/nike`
- **Colors**: Black with orange accent
- **Focus**: Athletic inspiration
- **Navigation**: Public links only

### 3. Coca-Cola
- **URL**: `/cocacola`
- **Colors**: Classic red (#F40009)
- **Focus**: Happiness and connection
- **Navigation**: Public links only

## 🐛 Troubleshooting

### Logo not showing?
- Check path: `/assets/demo-logos/logo-name.png`
- Verify file uploaded to `public/assets/demo-logos/`
- Clear browser cache

### Colors not applying?
- Ensure HSL format: `'214 100% 47%'` (not `hsl(214, 100%, 47%)`)
- Check no quotes around HSL values in theme config
- Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

### Routes not working?
- Verify both routes added: `/client-name` and `/client-name/*`
- Routes must be BEFORE the catch-all `*` route
- Republish the app

## 📝 Best Practices

1. **Logo Optimization**: Compress images before uploading
2. **Color Contrast**: Ensure text is readable on backgrounds
3. **Consistent Branding**: Match client's brand guidelines
4. **Test Before Sharing**: Visit demo URL to verify everything works
5. **Unique CTAs**: Customize button text per client's journey stage

## 🔄 Updating a Demo

1. Edit theme in `src/config/demoThemes.ts`
2. Replace logo file if needed
3. Click **Publish** → **Update**
4. Changes live in ~2 minutes

## 💡 Demo Pitch Ideas

When sharing demos with prospects:

> "We've prepared a custom demo showing how [Client Company] could use our platform. Everything you'll see uses real video processing - just styled with your branding. Visit: axessvideo.com/[client-name]"

## 🚀 Next Steps

1. **Add client logos**: Upload to `public/assets/demo-logos/`
2. **Get brand colors**: Convert HEX to HSL format
3. **Create themes**: Add to `demoThemes.ts`
4. **Test locally**: Preview at `localhost:8080/client-name`
5. **Deploy**: Publish and share with prospects

---

**Need help?** Check the code comments in:
- `src/config/demoThemes.ts` - Theme configurations
- `src/contexts/ThemeContext.tsx` - Theme switching logic
- `src/components/Navigation.tsx` - Theme-aware navigation
- `src/components/Hero.tsx` - Theme-aware hero section
