# ZYNOTRIX — Images

## Image Handling Overview

ZYNOTRIX has minimal image content. The primary image type is user avatars loaded from external OAuth providers. There is no image upload, no product photography, and no illustration system.

---

## Avatar System

### Implementation: `src/components/ui/Avatar.tsx`

The `Avatar` component is the single component responsible for rendering user profile images across the entire application.

**Behavior**:
1. If the user has a profile `image` URL → renders `<img src={url}>` with `object-cover`
2. If no image → renders an initials-based avatar with a deterministic color

**Initials Avatar**:
- Shows first letter of first and last name (e.g., "Arjun Mehta" → "AM")
- Color is deterministic based on `name.charCodeAt(0) % 7` — consistent across page loads
- 7 available color palettes (purple, cyan, emerald, amber, red, blue, pink)
- All colors use low-opacity backgrounds with matching text: `rgba(139,92,246,0.18)` bg, `#A78BFA` text

**Size System**:
| Size Prop | CSS Classes | Pixel Size |
|-----------|-------------|------------|
| `2xs` | `w-5 h-5` | 20×20 |
| `xs` | `w-6 h-6` | 24×24 |
| `sm` | `w-7 h-7` | 28×28 |
| `md` | `w-8 h-8` | 32×32 (default) |
| `lg` | `w-10 h-10` | 40×40 |
| `xl` | `w-12 h-12` | 48×48 |

**Ring option**: Optional `ring` prop adds a subtle accent ring around the avatar for stacked groups.

### `AvatarGroup` Component

Renders a stack of overlapping avatars (negative margin `-ml-1.5`) with a "+N" overflow indicator when more than `max` users (default 3) would be shown.

Used in: Kanban cards (assignees), project member lists, channel member lists.

---

## Image Sources

### Google OAuth Avatars
URL pattern: `https://lh3.googleusercontent.com/a/xxx`  
Size: Served at various resolutions by Google (adds `=s96-c` suffix for 96px)

### GitHub OAuth Avatars
URL pattern: `https://avatars.githubusercontent.com/u/xxx?v=4`

### Custom Image URLs
Users can provide any external image URL as their avatar. There is no file upload — only URL strings stored in `User.image`.

---

## next/image Usage

### Current State
`next/image` is imported in `src/app/page.tsx` (the root redirect page) but this page renders no visible images — it immediately redirects.

The `Avatar` component uses raw `<img>` tags with an explicit ESLint disable comment:
```typescript
// eslint-disable-next-line @next/next/no-img-element
<img src={image} alt={name ?? ""} />
```

### Why This Is Suboptimal
Using raw `<img>` means:
- No WebP conversion (Google/GitHub serve JPEG)
- No responsive `srcset` generation
- No automatic lazy loading with priority hints
- No blur placeholder during load
- No image size optimization (downloading full-resolution avatar for 32px display)
- External domains don't go through Vercel's image optimizer

### Recommended Migration
```typescript
// Replace in Avatar.tsx
import Image from "next/image";

// In the component:
<Image
  src={image}
  alt={name ?? "User avatar"}
  width={sizePixels[size]}
  height={sizePixels[size]}
  className={`${sizes[size]} rounded-full object-cover shrink-0 ${className}`}
  style={ringStyle}
/>
```

**next.config.ts addition required**:
```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};
```

---

## Static Images in the App

### Favicon
- **Path**: `src/app/favicon.ico`
- **Type**: ICO format
- **Usage**: Automatically picked up by Next.js from `src/app/` — no `<link>` tag needed in layout

### No Other Static Images
There are no PNG, JPG, SVG, GIF, or WebP files in `src/` or `public/` that are part of the application UI (excluding node_modules).

---

## Missing Images

| Image | Purpose | Required By |
|-------|---------|------------|
| `public/og-image.png` | Social sharing card (1200×630) | Open Graph tags |
| `public/logo.svg` | Brand logo for header and auth pages | Brand identity |
| `public/default-avatar.png` | Fallback when user image URL is broken | Avatar component |
| `public/apple-touch-icon.png` | iOS home screen icon (180×180) | PWA/mobile bookmarking |

---

## File Upload Handling

### Current Implementation
User-uploaded files (from the document import feature or any file input) are saved to `public/uploads/[userId]/[timestamp]-[originalname]`.

**Problems**:
1. Vercel has no writable disk — uploads are lost on every deployment
2. No authentication on the `/uploads/` URL — any file is publicly accessible
3. No file type validation beyond extension
4. No file size limits enforced server-side
5. Uploaded files grow the deployment bundle size

### Production Recommendation
Replace local disk storage with AWS S3 or Cloudflare R2:
```typescript
// Example with Cloudflare R2 via @aws-sdk/client-s3
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

await s3.send(new PutObjectCommand({
  Bucket: process.env.AWS_S3_BUCKET!,
  Key: `uploads/${orgId}/${filename}`,
  Body: buffer,
  ContentType: mimeType,
}));
```

---

## Image Security Considerations

1. **SSRF risk**: Avatar URLs are rendered client-side (`<img src={url}>`). If any future feature fetches these URLs server-side (thumbnail generation, PDF rendering), SSRF attacks become possible. Validate URL schemes on write.

2. **Content-type spoofing**: A user could provide a URL that serves malicious content with an image extension. Since we only render it client-side in an `<img>` tag, the browser enforces safe image rendering.

3. **Mixed content**: Avatar URLs must use `https://`. HTTP image URLs will be blocked by browsers on HTTPS pages.
