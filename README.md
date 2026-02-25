"# zalo-cloud-extension" 

zalo-drive-extension/
│
├── manifest.json                 // (1) Khai báo quyền, version, định tuyến các script
│
├── src/
│   ├── content/
│   │   └── content_script.js     // (2) Chặn Drag & Drop, băm file, nhúng UI vào Zalo
│   │
│   ├── background/
│   │   ├── service_worker.js     // (3) Điểm nốt (entry point) của background, mở Port
│   │   ├── QueueManager.js       // (4) Quản lý hàng đợi các file đang upload
│   │   └── strategies/           // (5) Cụm lõi Design Pattern
│   │       ├── ICloudStorageStrategy.js  // Interface
│   │       ├── StrategyFactory.js        // Nhà máy khởi tạo
│   │       ├── GoogleDriveStrategy.js    // Logic Resumable Upload của Google
│   │       └── OneDriveStrategy.js       // Logic Upload của Microsoft
│   │
│   └── popup/
│       ├── popup.html            // (6) Giao diện khi bấm vào icon Extension
│       ├── popup.css             
│       └── popup.js              // (7) Lắng nghe nút Login, gọi chrome.identity
│
└── assets/                       // Chứa icon của extension (16x16, 48x48, 128x128)