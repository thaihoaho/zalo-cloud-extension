// src/background/service_worker.js
import StrategyFactory from './strategies/StrategyFactory.js';

console.log("⚙️ Background Service Worker đã sẵn sàng.");

chrome.runtime.onConnect.addListener((port) => {
    console.log(`🔌 Đã kết nối với Port: ${port.name}`);

    if (port.name === "zalo-upload-stream") {

        // Cấu trúc: Map<fileName, { strategy, uploadUrl, totalSize }>
        const activeUploadSessions = new Map();

        // Thêm từ khóa 'async' để dùng được 'await' khi gọi API
        port.onMessage.addListener(async (message) => {
            try {
                if (message.type === "INIT_UPLOAD") {
                    console.log("📥 Nhận yêu cầu khởi tạo Upload:", message.payload);
                    const { fileName, fileSize, fileType } = message.payload;

                    // Tạm thời hard-code 'google_drive' để xây dựng luồng.
                    const targetDrive = 'google_drive';

                    const strategy = StrategyFactory.getStrategy(targetDrive);

                    await strategy.authenticate();

                    const uploadUrl = await strategy.initUpload(fileName, fileSize, fileType);

                    // Lưu lại phiên làm việc này vào bộ nhớ tạm
                    activeUploadSessions.set(fileName, { strategy, uploadUrl, totalSize: fileSize });

                    port.postMessage({ type: "READY_FOR_CHUNK", fileId: fileName });
                }

                else if (message.type === "FILE_CHUNK") {
                    console.log(`🧱 Đang xử lý Chunk số ${message.chunkIndex} của file ${message.fileName}`);
                    const { fileName, chunkIndex, data, offset } = message;

                    // Lấy lại phiên làm việc của file này
                    const session = activeUploadSessions.get(fileName);
                    if (!session) {
                        throw new Error(`Không tìm thấy phiên upload cho file: ${fileName}`);
                    }

                    const uploadResult = await session.strategy.uploadChunk(session.uploadUrl, data, offset, session.totalSize);

                    if (typeof uploadResult === 'string') {
                        console.log(`🚀 File upload thành công, chuẩn bị gửi link về UI: ${uploadResult}`);

                        port.postMessage({
                            type: "UPLOAD_SUCCESS",
                            fileName: fileName,
                            link: uploadResult
                        });

                        activeUploadSessions.delete(fileName);
                    } else {
                        port.postMessage({ type: "CHUNK_UPLOADED", chunkIndex: chunkIndex });
                    }
                }

                else if (message.type === "UPLOAD_COMPLETE") {
                    console.log(`🎉 Nhận thông báo hoàn tất từ UI cho file: ${message.fileName}`);
                    activeUploadSessions.delete(message.fileName);
                }

            } catch (error) {
                console.error("❌ Lỗi trong quá trình upload:", error);
                port.postMessage({ type: "UPLOAD_ERROR", message: error.message });
            }
        });

        port.onDisconnect.addListener(() => {
            console.log("❌ Đường ống kết nối đã bị đóng. Dọn dẹp RAM.");
            activeUploadSessions.clear();
        });
    }
});