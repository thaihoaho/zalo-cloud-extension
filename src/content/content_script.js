console.log("🚀 Zalo Cloud Extension: Content Script đã sẵn sàng!");

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
    /* --- CSS CHO TOAST PROGRESS BAR (MODERN UI 2026) --- */
    #zalo-cloud-toast-container {
        position: fixed; bottom: 30px; right: 30px;
        z-index: 9999999;
        display: flex; flex-direction: column; gap: 16px;
        pointer-events: none; /* Không chặn click chuột vào Zalo bên dưới */
    }

    .upload-toast {
        /* Hiệu ứng kính mờ (Glassmorphism) sang trọng */
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.4);
        
        border-radius: 16px;
        padding: 20px;
        width: 340px;
        
        /* Bóng đổ mềm nhiều lớp tạo chiều sâu */
        box-shadow: 
            0 4px 6px -1px rgba(0, 0, 0, 0.05),
            0 10px 15px -3px rgba(0, 0, 0, 0.05),
            0 20px 30px -5px rgba(0, 136, 255, 0.1); /* Ám xanh nhẹ */

        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        
        /* Hiệu ứng xuất hiện trượt từ phải sang */
        transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        transform: translateX(120%);
        opacity: 0;
        pointer-events: auto; /* Toast thì nhận click */
    }

    /* Class được JS thêm vào để kích hoạt hiệu ứng xuất hiện */
    .upload-toast.show { transform: translateX(0); opacity: 1; }
    /* Class để ẩn đi khi xong */
    .upload-toast.hide { transform: translateY(-20px); opacity: 0; }

    .toast-header {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 14px;
    }

    .toast-left-col { display: flex; align-items: center; gap: 12px; overflow: hidden; }

    /* Icon file nhỏ bên trái */
    .toast-file-icon {
        width: 32px; height: 32px; flex-shrink: 0;
        background: #e3f2fd; border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
    }
    .toast-file-icon svg { width: 18px; height: 18px; fill: #0072ff; }

    .toast-filename {
        font-weight: 700; font-size: 14px; color: #1a202c;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .toast-percent {
        font-weight: 600; font-size: 13px; color: #0072ff;
        transition: color 0.3s ease;
        min-width: 40px; text-align: right;
    }

    .progress-bg {
        width: 100%; height: 8px;
        background: #edf2f7; border-radius: 4px;
        overflow: hidden; position: relative;
    }

    /* Thanh tiến trình Gradient động */
    .progress-fill {
        height: 100%; border-radius: 4px;
        width: 0%; transition: width 0.2s linear;
        /* Gradient xanh dương chuyển động */
        background: linear-gradient(90deg, #00c6ff, #0072ff, #00c6ff);
        background-size: 200% auto;
        animation: gradientMove 2s linear infinite;
    }

    @keyframes gradientMove {
        0% { background-position: 0% center; }
        100% { background-position: 200% center; }
    }

    /* Trạng thái Hoàn thành (Thành công) */
    .upload-toast.success .toast-percent { color: #00c853; } /* Chữ chuyển xanh lá */
    .upload-toast.success .toast-file-icon { background: #e8f5e9; } /* Icon nền xanh lá */
    .upload-toast.success .toast-file-icon svg { fill: #00c853; } /* Icon fill xanh lá */
    .upload-toast.success .progress-fill { 
        background: #00c853; /* Thanh chuyển xanh lá đặc */
        animation: none; /* Dừng chuyển động gradient */
    }

    /* Trạng thái Lỗi */
    .upload-toast.error .toast-percent { color: #ff5252; font-size: 11px; }
    .upload-toast.error .toast-file-icon { background: #ffebee; }
    .upload-toast.error .toast-file-icon svg { fill: #ff5252; }
    .upload-toast.error .progress-fill { background: #ff5252; animation: none; }
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
    const styleSheet = document.createElement("style");
    styleSheet.innerText = modernStyles;
    document.head.appendChild(styleSheet);

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
            console.log(`📦 Bắt đầu xử lý ${files.length} file...`);

            const totalFiles = files.length;
            let finishedCount = 0;
            const successResults = [];

            const fileList = Array.from(files);

            fileList.forEach((file) => {
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

                const port = chrome.runtime.connect({ name: "zalo-upload-stream" });

                port.postMessage({
                    type: "INIT_UPLOAD",
                    payload: {
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type
                    }
                });

                let offset = 0;
                let fakeProgressInterval = null;
                let estimatedChunkDuration = 4000;
                let chunkStartTime = 0;
                const CHUNK_SIZE = 5 * 1024 * 1024;

                const readAndSendNextChunk = () => {
                    if (offset >= file.size) {
                        clearInterval(fakeProgressInterval);
                        port.postMessage({ type: "UPLOAD_COMPLETE", fileName: file.name });
                        return;
                    }

                    const chunk = file.slice(offset, offset + CHUNK_SIZE);
                    clearInterval(fakeProgressInterval);

                    const startPercent = Math.floor((offset / file.size) * 100);
                    const targetPercent = Math.min(100, Math.floor(((offset + chunk.size) / file.size) * 100));
                    let currentFakePercent = startPercent;

                    const percentDistance = targetPercent - startPercent;
                    const stepTime = percentDistance > 0 ? Math.floor(estimatedChunkDuration / percentDistance) : 50;

                    fakeProgressInterval = setInterval(() => {
                        if (currentFakePercent < targetPercent - 1) {
                            currentFakePercent += 1;
                            updateToastProgress(file.name, currentFakePercent);
                        } else {
                            clearInterval(fakeProgressInterval);
                        }
                    }, stepTime);

                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const base64Data = ev.target.result.split(',')[1];
                        chunkStartTime = Date.now();
                        port.postMessage({
                            type: "FILE_CHUNK",
                            fileName: file.name,
                            chunkIndex: offset / CHUNK_SIZE,
                            chunkSize: chunk.size,
                            offset: offset,
                            data: base64Data
                        });
                        offset += CHUNK_SIZE;
                    };
                    reader.readAsDataURL(chunk);
                };

                port.onMessage.addListener((response) => {
                    if (response.type === "READY_FOR_CHUNK" || response.type === "CHUNK_UPLOADED") {
                        if (chunkStartTime > 0) {
                            const timeTaken = Date.now() - chunkStartTime;
                            estimatedChunkDuration = (estimatedChunkDuration + timeTaken) / 2;
                        }
                        readAndSendNextChunk();
                    }
                    else if (response.type === "UPLOAD_SUCCESS") {
                        clearInterval(fakeProgressInterval);
                        updateToastProgress(response.fileName, 100);

                        successResults.push({ name: response.fileName, link: response.link });
                        finishedCount++;

                        console.log(`[Bulk] ${finishedCount}/${totalFiles} hoàn tất.`);
                        if (finishedCount === totalFiles) {
                            insertBulkLinksToZaloChat(successResults);
                            if (successResults.length > 0) {
                                showSuccessSummaryToast(successResults.length);
                            }
                        }
                    }
                    else if (response.type === "UPLOAD_ERROR") {
                        clearInterval(fakeProgressInterval);
                        showErrorToast(response.fileName || file.name, response.message);

                        finishedCount++;
                        if (finishedCount === totalFiles) {
                            if (successResults.length > 0) {
                                insertBulkLinksToZaloChat(successResults);
                                showSuccessSummaryToast(successResults.length);
                            }
                        }
                    }
                });
            });
        }
    }, true);
}

function showSuccessSummaryToast(count) {
    const container = document.getElementById('zalo-cloud-toast-container');
    const summaryId = "toast-summary-" + Date.now();

    const toast = document.createElement('div');
    toast.id = summaryId;
    toast.className = 'upload-toast success show';
    toast.style.padding = "12px 20px";

    toast.innerHTML = `
        <div class="toast-header" style="margin-bottom: 0;">
            <div class="toast-left-col">
                <div class="toast-file-icon" style="width: 24px; height: 24px;">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>
                </div>
                <span class="toast-filename" style="font-size: 14px;">🎉 Đã tải lên thành công ${count} file!</span>
            </div>
        </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

function showErrorToast(fileName, errorMsg) {
    updateToastProgress(fileName, -1, errorMsg);
}

initDragAndDropInterceptor();

function insertBulkLinksToZaloChat(results) {
    if (!results || results.length === 0) return;

    const chatInput = document.querySelector('#richInput');
    if (!chatInput) {
        console.warn("❌ Không tìm thấy khung chat '#richInput'.");
        return;
    }

    chatInput.focus();

    let messageToInsert = `☁️ Zalo Cloud Sync\n`;
    messageToInsert += `──────────────────\n`;

    results.forEach((item, index) => {
        messageToInsert += `📄 ${item.name}\n🔗 ${item.link}\n${index < results.length - 1 ? '\n' : ''}`;
    });

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', messageToInsert);

    const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
    });

    chatInput.dispatchEvent(pasteEvent);
    console.log(`✅ Đã dán ${results.length} link vào khung chat.`);
}

function updateToastProgress(fileName, percent) {
    let container = document.getElementById('zalo-cloud-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'zalo-cloud-toast-container';
        document.body.appendChild(container);
    }

    const fileSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;

    const safeId = "toast-" + encodeURIComponent(fileName).replace(/[^a-zA-Z0-9]/g, '');
    let toast = document.getElementById(safeId);

    if (!toast) {
        toast = document.createElement('div');
        toast.id = safeId;
        toast.className = 'upload-toast';
        toast.innerHTML = `
            <div class="toast-header">
                <div class="toast-left-col">
                    <div class="toast-file-icon">${fileSvg}</div>
                    <span class="toast-filename" title="${fileName}">${fileName}</span>
                </div>
                <span class="toast-percent">0%</span>
            </div>
            <div class="progress-bg"><div class="progress-fill" id="fill-${safeId}"></div></div>
        `;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
    }

    const percentText = toast.querySelector('.toast-percent');
    const fillBar = toast.querySelector(`#fill-${safeId}`);

    percentText.innerText = `${percent}%`;
    fillBar.style.width = `${percent}%`;

    if (percent === -1) {
        toast.classList.add('error');
        percentText.innerText = "Lỗi: " + (arguments[2] || "Xác thực");
        fillBar.style.width = "100%";

        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 6000);
        }, 5000);
        return;
    }

    if (percent >= 100 && !toast.classList.contains('success')) {
        toast.classList.add('success');
        percentText.innerText = 'Hoàn tất!';

        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 500);
        }, 3500);
    }
}

