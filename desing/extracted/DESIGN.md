---
name: PhotoCRM Design System
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1b1b1b'
  on-surface-variant: '#4c4546'
  inverse-surface: '#303030'
  inverse-on-surface: '#f1f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1b1b'
  on-tertiary-container: '#848484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1b1b1b'
  on-tertiary-fixed-variant: '#474747'
  background: '#f9f9f9'
  on-background: '#1b1b1b'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is built for the modern photography professional, prioritizing extreme clarity, efficiency, and an editorial aesthetic. It draws inspiration from high-productivity tools like Linear and Notion, focusing on "UI as a frame" for the photographer's work.

The personality is **Efficient, Elegant, and Organized**. The style is **Minimalist-Modern**, utilizing generous whitespace, crisp typography, and a "high-end gallery" feel. It avoids unnecessary decoration, ensuring that the application remains a quiet, powerful utility that elevates the creative's workflow without competing for attention.

## Colors
The palette is rooted in a stark, high-contrast foundation to evoke the feeling of a premium photography portfolio.

- **Primary (Deep Black):** Used for primary text, iconography, and structural elements to provide a grounded, authoritative feel.
- **Accent (Soft Gold):** Reserved exclusively for primary Calls to Action (CTAs), focus states, and specific success indicators. It provides a warm, luxury contrast to the monochrome base.
- **Background (Stark White):** The canvas of the application. It ensures maximum readability and a spacious atmosphere.
- **Neutrals (Grays):** Used for subtle layering. `#F5F5F5` is for secondary surface areas (sidebars, table headers), while `#E5E5E5` is reserved for thin, precise borders that define the grid.

## Typography
This design system utilizes **Inter** for all roles to maintain a systematic, utilitarian aesthetic. 

The hierarchy is driven by weight and purposeful scale. Headlines use tighter letter spacing and semi-bold weights for a compact, professional look. Body text is optimized for long-form readability with generous line heights. Labels utilize uppercase styling in specific contexts (like table headers or status tags) to differentiate them from interactive text. On mobile, headlines scale down to prevent excessive line breaks while maintaining their weight.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a mobile-first philosophy. 

- **Mobile:** Single column layout with 16px side margins. Elements are stacked to prioritize vertical scanning.
- **Tablet/Desktop:** Transitions to a 12-column grid. Sidebars are fixed-width (240px) while the content area expands.
- **Spacing Rhythm:** Based on a 4px baseline. Use 16px (md) for standard padding within cards and 24px (lg) for vertical section separation. 

Layouts should favor "Logical Grouping"—using whitespace rather than lines to separate distinct conceptual areas whenever possible.

## Elevation & Depth
Depth is achieved through **Tonal Layers** and extremely **Ambient Shadows**. 

The design system avoids heavy drop shadows. Instead, it uses a single, consistent shadow style for floating elements: a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.04)). 

Most UI hierarchy is established through surface color changes. The main canvas is White (#FFFFFF). Secondary panels (sidebars, drawers) use Light Gray (#F5F5F5). Borders are the primary method of separation, kept at a thin 1px weight in #E5E5E5. This creates a "flat-depth" look similar to Notion, where the structure is clear but the interface remains light.

## Shapes
The shape language is consistently **Rounded**. 

A standard corner radius of **12px (0.75rem)** is applied to primary UI elements like buttons, input fields, and cards. This softens the starkness of the black-and-white palette, making the tool feel approachable. Small components like tags/chips use a 6px radius to maintain visual proportion.

## Components

- **Buttons:** Primary buttons are Solid Gold (#D4AF37) with black text. Secondary buttons are Outline-only (1px #E5E5E5) with black text. Buttons must have a height of 40px for touch-friendliness.
- **Cards:** White background with a 1px #E5E5E5 border. No shadow unless the card is "interactive" or "hovered." Padding is strictly 24px for desktop, 16px for mobile.
- **Input Fields:** 12px rounded corners, 1px #E5E5E5 border. On focus, the border changes to Black (#000000) with a 2px offset.
- **Data Tables:** Row-based with 1px bottom borders. No vertical dividers. Header text is Label-SM (Uppercase). Row height is 56px to ensure clarity on mobile.
- **Chips/Status:** Small, 6px rounded containers. Use #F5F5F5 background with Black text for neutral states. Use a Gold background with 10% opacity for "Active" states.
- **Navigation:** Bottom-bar for mobile (icons + labels), Sidebar for desktop (clean text-links with 20px icons).