# MealMind Design Guidelines (Compact)

## Project Context
Russian-language AI cooking assistant for iOS/Android targeting young families (25-40) in Kyrgyzstan. Core flow: scan fridge → AI generates recipes → manage stock/shopping.

## Design Principles
- **Approachable Intelligence**: Warm Russian language, confidence scores, encouraging loading states ("AI создаёт рецепт...")
- **Visual Clarity**: Color-coded urgency, high contrast, ample whitespace
- **Efficiency First**: 3-tap core flows, smart defaults, persistent navigation

## Color System

**Primary Palette**
- Primary Orange: `#FF6B35` (CTAs, active states)
- Background: `#FFFFFF` (main), `#F8F9FA` (secondary)
- Text: `#212529` (primary), `#6C757D` (secondary)

**Status Colors** (Expiry indicators)
- Green `#28A745`: >7 days fresh
- Yellow `#FFC107`: 3-7 days warning
- Red `#DC3545`: <3 days critical

**Surfaces**
- Cards: White, shadow (opacity 0.05, radius 4)
- Modals: White with backdrop `#000000` 40% opacity

## Typography
**System fonts**: SF Pro (iOS), Roboto (Android)

| Use Case | Size | Weight |
|----------|------|--------|
| H1 (Screen Titles) | 28pt | Bold |
| H2 (Sections) | 22pt | SemiBold |
| H3 (Cards) | 18pt | SemiBold |
| Body | 16pt | Regular |
| Caption | 14pt | Regular |
| Small | 12pt | Regular |

**Russian Requirements**: Line height 1.5x for Cyrillic, avoid button text truncation, proper hyphenation.

## Layout System
- **Grid**: 8pt base unit
- **Padding**: 16pt screen edges, 16pt card internal, 24pt section spacing, 12pt related items
- **Safe Areas**: 
  - Top: statusBarHeight + 44pt + 24pt (with header)
  - Bottom: tabBarHeight/bottomInset + 24pt

## Navigation

**Bottom Tab Bar** (4 tabs)
```
🏠 Главная | ⏰ История | 📸 Сканировать (FAB) | 🛒 Корзина (badge)
```
- Height: 56pt + safe area
- Active: `#FF6B35`, Inactive: `#6C757D`
- Icons: 24x24pt Feather set, Labels: 12pt Medium

**Headers**: Transparent, large title (34pt Bold) collapses to compact (17pt SemiBold) on scroll

## Core Components

### Buttons
**Primary CTA**
```
Background: #FF6B35, Text: White 17pt SemiBold
Height: 52pt, Radius: 12pt, Full width (-16pt margins)
Pressed: Opacity 0.8 + haptic
```

**Secondary**: Transparent, 1pt `#FF6B35` border, orange text

**FAB (Scan)**: 56x56pt circle, `#FF6B35`, white 28x28pt icon, elevated center of tab bar

### Cards
```
White bg, 12pt radius, 16pt padding
Shadow: offset(0,2) opacity 0.05 radius 4
Tap: Scale 0.98 + haptic
```

### Input Fields
```
Height: 48pt, Border: 1pt #E9ECEF, Radius: 8pt
Padding: 12pt horizontal, Placeholder: #ADB5BD
Focus: Border #FF6B35 + shadow glow
```

### Product List Item
```
[🟢/🟡/🔴] Product Name (16pt Bold)
           Quantity (14pt Gray)
           Expiry: X days (12pt Caption)  [✏️]
```

### Recipe Card
```
16:9 image + gradient overlay
Title: 18pt SemiBold White (shadow)
⏱️ Time | 👥 Servings | ⚡ Difficulty
Rating: Gold stars (#FFC107)
```

### Modals
- Full Screen: Complex flows (Onboarding, Recipe Detail)
- Bottom Sheet: Quick actions (Add, Filter) - 4pt×36pt handle
- Backdrop: `#000000` 40%

## Screen-Specific Patterns

**Onboarding**: Progress dots (8pt, 8pt spacing), centered content, 52pt "Далее" button, skip top-right

**Home**: 44pt search bar (pill), 2-column action cards (square), transparent header with 24pt logo

**Scan Results**: Confidence badges (pill, %), 64x64pt thumbnails, fixed bottom save button

**Stock**: Horizontal filter pills (32pt), 4pt left border (status color), swipe delete/edit, FAB "Сгенерировать рецепт"

**Recipe Detail**: 250pt hero image, sticky blur header, 24x24pt checkboxes (orange), 32x32pt step circles, sticky bottom actions

**Shopping**: 3-segment tabs (underline indicator), 8pt progress bar, 24x24pt checkboxes (4pt radius)

**Profile**: 80x80pt avatar, 2-column stats (28pt Bold numbers), bar charts `#FF6B35`, 64x64pt badges

## Interaction Design

**Gestures**: Swipe-back, pull-to-refresh (orange), long-press menus, pinch-zoom images

**Animations**
- Transitions: 300ms ease-in-out
- Taps: Scale 0.98, 150ms
- Modals: 400ms slide-up + fade
- Loading: Skeleton shimmer `#E9ECEF`
- Success: Animated ✓ scale + fade

**Empty States**: Centered line art (200x200pt), 20pt SemiBold headline, 16pt gray description, CTA below

## Accessibility

**Text & Contrast**
- Minimum: 4.5:1 body, 3:1 large text
- Support Dynamic Type (iOS)
- Max 70 chars/line

**Touch Targets**
- Minimum: 44×44pt all interactive
- 8pt spacing between adjacent
- Haptic + visual feedback required

**Screen Reader**: Russian labels/hints for all elements, status announcements

**Color Blindness**: Never color-only (combine with icons/text: 🟢🟡🔴 + "X days")

## Platform Specifics

**iOS**: SF Symbols, UIImpactFeedbackGenerator, large collapsing titles, swipe-back, action sheets

**Android**: Feather icons, ripple effects, FAB, Snackbars, hardware back support

## Assets & Localization

**Icons**: 1024x1024 app icon, 24x24pt tabs, 48x48pt features (3x resolution, Feather set)

**Images**: 16:9 recipes (WebP), 64x64pt products, 80x80pt avatars, 200x200pt empty states

**Localization**: Russian/Cyrillic, Som (сом), DD.MM.YYYY, 24-hour HH:mm, space thousands separator (1 000)

## Brand Voice
Tone: Friendly, helpful, encouraging. Simple Russian, no jargon. Focus benefits ("Сэкономьте 1000 сом"), constructive errors, motivational empty states.

## Implementation Checklist
1. React Native design tokens for colors/spacing
2. Reusable components (cards, buttons, lists)
3. Dark mode semantic colors (future)
4. Expo Camera with overlay preview
5. AsyncStorage for persistence
6. Keyboard avoidance on forms
7. react-navigation 7 native stack
8. Skeleton screens for async ops
9. Expo Haptics on all buttons
10. Test on actual devices

**Critical Dos/Don'ts**
- ✅ Always show status colors WITH text/icons
- ✅ 44pt minimum touch targets
- ✅ Haptic feedback on all interactions
- ✅ Russian language throughout
- ❌ Never truncate button text
- ❌ Never use color alone for status
- ❌ No <4.5:1 text contrast
- ❌ No <8pt spacing between tappables