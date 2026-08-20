# Web & Android Cross-Platform Experience

Student OS is engineered as a unified cross-platform ecosystem. Rather than treating mobile and desktop as separate applications, your data, timer progress, planner blocks, and revision queues synchronize seamlessly between the **Web Application** and the **Android Mobile App**.

---

## 1. Web vs. Android: When to Use Each

```
┌───────────────────────────────────────┬───────────────────────────────────────┐
│           STUDENT OS WEB              │       STUDENT OS ANDROID APK          │
├───────────────────────────────────────┼───────────────────────────────────────┤
│ • Best on Laptops / Desktops          │ • Best on Smartphones / Tablets       │
│ • Deep multi-week syllabus planning   │ • Focused study sessions at your desk │
│ • Large-screen analytics inspection   │ • Home screen glanceable widgets      │
│ • Setting up complex subject modules  │ • Status bar background timer service │
│ • Accessible from any web browser     │ • Quick on-the-go task checkoffs      │
└───────────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Moving Seamlessly Between Devices

You can use both platforms simultaneously throughout your day:

1. **Morning Planning on Web**:
   - Open [`studentos.kryvlance.in`](https://studentos.kryvlance.in) on your laptop.
   - Review your Weekly Planner and schedule your top study blocks for the day.
2. **Daytime Study on Android**:
   - Head to class or the library with your Android phone.
   - Tap the Student OS widget or open the app to start a focused study session.
   - The Android **Foreground Service** keeps your timer running reliably in your status bar even when reading textbook PDFs or switching apps.
3. **Evening Review on Web**:
   - Return to your laptop in the evening.
   - All study hours logged from your phone are immediately reflected in your Dashboard metrics, 16-week consistency heatmap, and learning analytics.

---

## 3. Android-Specific Superpowers

### A. Persistent Background Study Timer (Foreground Service)
- Unlike ordinary web timers that can pause when your phone screen turns off, Student OS Android runs a dedicated Android Foreground Service.
- A persistent, low-power notification in your status bar displays your live elapsed time and provides one-tap **Pause**, **Resume**, and **Complete** buttons.

### B. Glanceable Home Screen Widgets
- Add the official **Student OS Widget** to your Android home screen.
- **Small Widget**: Displays today's total focus minutes and active streak.
- **Medium Widget**: Shows today's focus progress, your active exam countdown, and a quick **Start Study** shortcut.

---

## 4. Multi-Device Access Policy

- **Web Access**: You can sign into Student OS on your laptop, desktop, or tablet browser without restriction.
- **Android Access**: To protect your account integrity, your account supports one primary active Android device at a time. If you switch to a new phone, logging in automatically registers your new phone and revokes the previous device session.
