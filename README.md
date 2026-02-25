# zalo-cloud-extension

A lightweight browser extension designed to optimize the file-sharing experience on Zalo Web. 

Instead of dealing with file size limits or the frustrating "file no longer exists" error over time, this extension intercepts drag-and-drop events, uploads files directly to your personal cloud storage (Google Drive), and automatically pastes the shareable link into the Zalo chat box.

## ✨ Key Features

* **Seamless Integration (UX):** A drag-and-drop overlay that natively blends into the Zalo Web interface.
* **Large File Handling (Chunking):** Slices files using the HTML5 File API on the client side and utilizes Google Drive's *Resumable Upload* mechanism to prevent browser memory leaks or crashes.
* **End-to-End Automation:** * Automatically creates a `Zalo Cloud Sync` folder on your Drive.
    * Automatically configures file sharing permissions (Public View).
    * Uses DOM Events (simulating a `Paste` action) to inject the generated link directly into the Zalo input box.
* **Scalable Architecture:** Clean separation of UI rendering and upload logic. Implements the **Strategy Pattern** and **Factory Pattern** within the Background Service Worker, making it incredibly easy to plug-and-play additional platforms (like OneDrive or Dropbox) in the future.

## 📂 Project Structure

The project strictly separates the Content Script (UI injection) from the Background Worker (Logic and API calls):

```text
zalo-drive-extension/
│
├── manifest.json                 // (1) Permissions, versioning, and script routing
│
├── src/
│   ├── content/
│   │   └── content_script.js     // (2) Intercepts Drag & Drop, chunks files, manipulates Zalo DOM
│   │
│   ├── background/
│   │   ├── service_worker.js     // (3) The orchestrator, opens Port connections
│   │   ├── QueueManager.js       // (4) Manages the queue for concurrent file uploads
│   │   └── strategies/           // (5) Design Pattern core
│   │       ├── ICloudStorageStrategy.js  // Interface defining the contract
│   │       ├── StrategyFactory.js        // Factory for initializing handler classes
│   │       ├── GoogleDriveStrategy.js    // Google Drive OAuth2 & Resumable Upload logic
│   │       └── OneDriveStrategy.js       // Microsoft OneDrive API logic (Future)
│   │
│   └── popup/
│       ├── popup.html            // (6) UI displayed when clicking the extension icon
│       ├── popup.css             
│       └── popup.js              // (7) User configurations, cloud platform switching
│
└── assets/                       // Extension icon assets (16x16, 48x48, 128x128)