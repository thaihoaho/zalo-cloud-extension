console.log("🚀 Zalo Cloud Extension: Lính gác (Giao diện hiện đại) đã sẵn sàng!");

const modernStyles = `
    #zalo-drive-overlay-container {
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        z-index: 9999999;
        pointer-events: none; 
        
        /* Gradient nền xanh dương */
        background: radial-gradient(circle at center, rgba(0, 136, 255, 0.15) 0%, rgba(255, 255, 255, 0) 70%);
        backdrop-filter: blur(12px) saturate(110%);
        
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center; /* Fix chuẩn CSS */
        
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), visibility 0.3s;
    }

    #zalo-drive-overlay-container.active {
        opacity: 1;
        visibility: visible;
    }

    .overlay-content-wrapper {
        background: rgba(255, 255, 255, 0.85);
        padding: 40px 60px;
        border-radius: 24px;
        box-shadow: 0 20px 40px rgba(0, 136, 255, 0.15); /* Bóng mờ màu xanh dương */
        text-align: center;
        transform: translateY(20px);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    #zalo-drive-overlay-container.active .overlay-content-wrapper {
        transform: translateY(0);
    }

    .cloud-icon-svg {
        width: 80px;
        height: 80px;
        margin-bottom: 20px;
        fill: url(#cloud-gradient); 
        filter: drop-shadow(0 4px 6px rgba(0, 136, 255, 0.3)); /* Đổi bóng icon */
    }

    .overlay-title {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 24px;
        font-weight: 700;
        color: #001a33; /* Chữ ám xanh dương trầm */
        margin-bottom: 8px;
    }

    .overlay-subtitle {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 16px;
        color: #4d6680; /* Chữ phụ ám xanh */
    }
`;

const cloudSvgIcon = `
<svg class="cloud-icon-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="cloud-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#00a6ff;stop-opacity:1" /> <stop offset="100%" style="stop-color:#0068ff;stop-opacity:1" /> </linearGradient>
    </defs>
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-1.93-4.8-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
</svg>
`;

function initDragAndDropInterceptor() {
    // Inject style vào head
    const styleSheet = document.createElement("style");
    styleSheet.innerText = modernStyles;
    document.head.appendChild(styleSheet);

    // Tạo cấu trúc HTML cho overlay
    const overlayContainer = document.createElement('div');
    overlayContainer.id = "zalo-drive-overlay-container";
    overlayContainer.innerHTML = `
        <div class="overlay-content-wrapper">
            ${cloudSvgIcon}
            <div class="overlay-title">Thả file để lưu vào Cloud</div>
            <div class="overlay-subtitle">Hỗ trợ Google Drive & OneDrive</div>
        </div>
    `;
    document.body.appendChild(overlayContainer);

    const dropZone = document.body;
    let dragCounter = 0;

    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, true);
    });

    dropZone.addEventListener('dragenter', (e) => {
        dragCounter++;
        if (dragCounter === 1) {
            overlayContainer.classList.add('active');
        }
    }, true);

    dropZone.addEventListener('dragleave', (e) => {
        dragCounter--;
        if (dragCounter === 0) {
            overlayContainer.classList.remove('active');
        }
    }, true);

    dropZone.addEventListener('drop', (e) => {
        dragCounter = 0;
        overlayContainer.classList.remove('active');

        const dt = e.dataTransfer;
        const files = dt.files;

        if (files && files.length > 0) {
            console.log(`📦 UI Mới: Đã bắt được ${files.length} file.`);
            // Todo
        }

        Array.from(files).forEach((file, index) => {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

            console.log(`--- File ${index + 1} ---`);
            console.log(`Tên: ${file.name}`);
            console.log(`Kích thước: ${fileSizeMB} MB`);
            console.log(`Loại (MIME): ${file.type}`);

            // Todo
        });
    }, true);
}

initDragAndDropInterceptor();