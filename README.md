# Zoom Chrome Extension – In-Page Widget

This Chrome extension injects a lightweight, draggable widget into webpages, designed specifically to facilitate embedded Zoom meetings in kiosk environments. It enhances customer support and remote assistance workflows by integrating real-time Zoom video sessions directly into web-based kiosks.

---

## 🚀 Features

- 🖥️ **Embedded Zoom Widget**: Renders a Zoom Meeting using the Web SDK directly inside a floating iframe widget.
- ⚙️ **Session Management**: Seamlessly handles session start, join, rejoin, and end workflows via message passing and local storage.
- 🔄 **Zoom Resource Proxying**: Redirects critical Zoom scripts (e.g., `js_media.min.js`) via `declarativeNetRequest` to circumvent CSP issues.
- 🎯 **Feature Toggle Support**: Uses Server-Sent Events (SSE) to enable or disable widget rendering based on live feature flags.
- 📦 **Clean UI**: Custom CSS overlays Zoom UI, hides irrelevant controls (chat, share screen, etc.), and ensures a kiosk-friendly experience.
- 🔔 **Toasts & Notifications**: Displays in-page toast messages about session status, call queues, and agent joins.

---

## 🛠️ Installation

1. Clone or download the repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the extension:

   ```bash
   npm run build
   ```

4. Open Chrome and go to `chrome://extensions/`.
5. Enable **Developer mode**.
6. Click **Load unpacked** and select the `dist/` folder.

---

## 📦 Usage

Once installed, the extension listens for feature toggle signals via SSE. When enabled:

- It injects an assistance icon, or
- Automatically launches the Zoom widget if a session is active.

The widget:
- Initializes the Zoom Web SDK with kiosk configuration.
- Enables audio/video automatically.
- Handles session leave events gracefully.
- Shows real-time toasts for key events.

---

## 📁 Project Structure

```
src/
├── background.js            # Background service worker
├── content.js               # Injects the widget and icons
├── util/
│   ├── patch-interceptors.js  # Redirects blocked Zoom requests
│   └── utils.js               # Local storage helpers
├── widget/
│   ├── widget.js             # Main widget logic
│   ├── widget.html           # Embedded widget template
│   └── widget.css            # UI styles and overrides
├── zoom/                    # Zoom SDK assets (v3.10.0)
```

---

## 📄 Key Files

- `manifest.json` – Chrome extension metadata and permissions
- `rules.json` – Redirect rules for Zoom script resources
- `patch-interceptors.js` – Rewrites script tags to use local/proxied resources

---

## 🔐 Permissions

Required Chrome permissions:

- `storage`
- `scripting`
- `tabs`
- `webRequest`
- `declarativeNetRequestWithHostAccess`

Host permissions:
- `*://zoom.us/*`
- `http://localhost:8080/*` (for development)

---

## ⚠️ Limitations

- Requires Zoom SDK v3.10.0 hosted locally
- Depends on backend kiosk server for:
    - Authentication (via access token)
    - Feature flag configuration (via SSE)
- Designed for automatic kiosk workflows — no manual UI control

---

## 📬 Contact

For suggestions, improvements, or bug reports, feel free to open an issue or submit a pull request.
