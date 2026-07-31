# Dashboard Time Picker Redesign Prompt

## Objective

Redesign the Dashboard date selector of the expense management web application.

The current dashboard displays a fixed month and year:

> Tháng 8/2026

This must be replaced with a fully interactive, premium-looking Month & Year Picker inspired by Apple's design philosophy (iOS/macOS).

The experience should feel modern, fluid, elegant, and highly polished.

---

# Design Philosophy

The UI should follow these principles:

- Apple Human Interface Guidelines
- Minimalism
- Smooth Motion
- Glassmorphism
- Premium interactions
- High FPS animations (60fps+)
- Natural spring physics
- Micro-interactions everywhere

Avoid traditional HTML select components.

Never use native browser dropdowns.

Everything must be custom.

---

# Dashboard Header

Current

Dashboard

Tháng 8/2026

Replace with

Dashboard

[ 📅 August 2026 ▼ ]

The date selector should look like a premium button.

Properties

- rounded-xl
- subtle shadow
- glass effect
- hover elevation
- smooth transition
- cursor pointer

---

# Opening Animation

When clicking the date selector

DO NOT instantly show a dropdown.

Instead

Animate a floating panel.

Animation sequence

Opacity:
0 → 1

Scale:
0.94 → 1

TranslateY:
-15px → 0

Blur:
12px → 0

Duration

250–350ms

Animation Type

Spring

Recommended Framer Motion

type: spring

stiffness: 350

damping: 28

mass: 0.8

Everything should feel soft and responsive.

---

# Background

When picker opens

Blur entire dashboard.

Backdrop

backdrop-filter: blur(18px)

Dark overlay

rgba(0,0,0,.35)

Fade in smoothly.

---

# Picker Layout

Center popup.

Rounded 24px

Glass effect

Shadow

Large padding

Example

╭────────────────────────────╮

Choose Period

────────────────────────────

◀ 2026 ▶

────────────────────────────

Jan Feb Mar Apr

May Jun Jul Aug

Sep Oct Nov Dec

────────────────────────────

Today

╰────────────────────────────╯

---

# Year Navigation

The year can be changed by

Left arrow

Right arrow

OR

Mouse wheel

OR

Trackpad gesture

Animation

Sliding transition

Previous year slides left

Next year slides right

Spring animation

---

# Month Grid

Display all 12 months.

Selected month

- Purple gradient
- Slight glow
- Scale 1.05
- Bold text

Hover

Scale

1 → 1.04

Background brightens

Shadow increases

Transition

180ms

---

# Alternative Mode

Provide an optional iOS Wheel Picker.

Three wheels

Month

Year

(Optional Day if needed later)

Wheel behavior

Momentum scrolling

Snap to center

Inertia

Soft easing

Exactly like iOS Date Picker.

---

# Dashboard Update

When user selects a month

DO NOT refresh page.

Instead

Fetch new statistics.

Animate numbers.

Income

CountUp animation

Expense

CountUp animation

Balance

CountUp animation

Duration

700ms

---

# Chart Animation

Charts should morph smoothly.

Do NOT disappear then re-render.

Animate

Bars

Height interpolation

Lines

Path morphing

Pie

Angle interpolation

Duration

700~900ms

Ease

easeInOutQuart

---

# Loading State

Instead of spinner

Use Skeleton UI

Cards

Skeleton shimmer

Charts

Animated placeholder

Do not block interaction.

---

# Hover Effects

Cards

translateY(-4px)

Shadow increases

Border glows slightly

Background becomes brighter

Transition

250ms

---

# Glassmorphism

Picker

background:
rgba(30,30,40,.75)

backdrop-filter:
blur(24px)

border:
1px solid rgba(255,255,255,.08)

shadow:
0 20px 60px rgba(0,0,0,.35)

---

# Responsive

Desktop

Floating popup

Tablet

Bottom sheet

Mobile

Bottom sheet

Height

70%

Rounded top corners

Drag to close

Spring animation

Exactly like iOS.

---

# Accessibility

Keyboard support

Arrow keys

Enter

Escape

Tab

Focus ring

ARIA labels

Screen reader friendly

---

# Performance

Avoid unnecessary rerenders.

Use memoization.

Lazy render charts.

Maintain 60fps.

Animations must use transform and opacity.

Avoid animating width and height whenever possible.

---

# Tech Stack

Preferred

React

Next.js

TailwindCSS

Framer Motion

shadcn/ui

Recharts

React Query

date-fns

Use TypeScript.

Use reusable components.

Folder suggestion

components/

    Dashboard/

        DatePicker.tsx

        MonthGrid.tsx

        YearSwitcher.tsx

        WheelPicker.tsx

        DashboardCards.tsx

        DashboardCharts.tsx

hooks/

    useDashboardData.ts

lib/

    date.ts

---

# API Behavior

When month changes

Call

GET /dashboard?month=8&year=2026

Receive

Income

Expense

Balance

Category Summary

Trend Data

Update UI with animation.

---

# Code Quality

Follow Clean Architecture.

Reusable components.

No duplicated code.

Strict TypeScript.

Readable naming.

Responsive.

Accessible.

Maintainable.

---

# Expected Feeling

The final interaction should feel similar to

- iOS Date Picker
- macOS System Settings
- Apple Wallet
- Apple Calendar
- Apple Music

The animation should be subtle, premium, fluid, and polished rather than flashy.

Every transition should feel intentional and elegant.

The user should immediately perceive the application as a high-end, professional financial dashboard.