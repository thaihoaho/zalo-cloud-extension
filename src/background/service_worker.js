// src/background/service_worker.js
import StrategyFactory from './strategies/StrategyFactory.js';
import QueueManager from './QueueManager.js';

console.log("⚙️ Background Service Worker đã sẵn sàng.");

const uploadQueue = new QueueManager(2);

const queueResolvers = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_STORAGE_QUOTA") {
        (async () => {
            try {
                const result = await chrome.storage.sync.get(['preferred_drive']);
                const targetDrive = result.preferred_drive || 'google_drive' ;
                const strategy = StrategyFactory.getStrategy(targetDrive);
                const quota = await strategy.getStorageQuota();
                sendResponse({ success: true, quota });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }
});

chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "zalo-upload-stream") return;

    const activeUploadSessions = new Map();

    port.onMessage.addListener(async (message) => {
        try {
            if (message.type === "INIT_UPLOAD") {
                const { fileName, fileSize, fileType } = message.payload;

                uploadQueue.enqueue(async () => {
                    try {
                        const result = await chrome.storage.sync.get(['preferred_drive']);
                        const targetDrive = result.preferred_drive || 'google_drive'; 
                        const strategy = StrategyFactory.getStrategies(targetDrive)[0];
                        const uploadUrl = await strategy.initUpload(fileName, fileSize, fileType);
                        activeUploadSessions.set(fileName, { strategy, uploadUrl, totalSize: fileSize });

                        port.postMessage({ type: "READY_FOR_CHUNK", fileId: fileName });

                        // QUAN TRỌNG: Task này chỉ hoàn thành khi nhận được tín hiệu XONG từ luồng FILE_CHUNK
                        return new Promise((resolve) => {
                            queueResolvers.set(fileName, resolve);
                        });
                    } catch (err) {
                        port.postMessage({ type: "UPLOAD_ERROR", fileName, message: err.message });
                    }
                });
            }

            else if (message.type === "FILE_CHUNK") {
                const { fileName, chunkIndex, data, offset } = message;
                const session = activeUploadSessions.get(fileName);
                if (!session) return;

                const uploadResult = await session.strategy.uploadChunk(session.uploadUrl, data, offset, session.totalSize);

                if (typeof uploadResult === 'string') {
                    port.postMessage({ type: "UPLOAD_SUCCESS", fileName, link: uploadResult });
                    activeUploadSessions.delete(fileName);

                    // Giải phóng hàng đợi
                    const resolveTask = queueResolvers.get(fileName);
                    if (resolveTask) {
                        resolveTask();
                        queueResolvers.delete(fileName);
                    }
                } else {
                    port.postMessage({ type: "CHUNK_UPLOADED", chunkIndex });
                }
            }

            else if (message.type === "UPLOAD_COMPLETE") {
                // Không xóa session ở đây để tránh race condition
                console.log(`[Worker] Content Script báo đã gửi xong các mảnh cho: ${message.fileName}`);
            }

        } catch (error) {
            console.error("❌ Lỗi SW:", error);
            port.postMessage({ type: "UPLOAD_ERROR", message: error.message });

            const fileName = message.fileName || (message.payload && message.payload.fileName);
            if (fileName) {
                const resolveTask = queueResolvers.get(fileName);
                if (resolveTask) {
                    resolveTask();
                    queueResolvers.delete(fileName);
                }
            }
        }
    });

    port.onDisconnect.addListener(() => {
        activeUploadSessions.clear();
    });
});
