// src/background/service_worker.js
console.log("⚙️ Background Service Worker đã sẵn sàng.");

// Lắng nghe các kết nối Port mở ra từ Content Script
chrome.runtime.onConnect.addListener((port) => {
    console.log(`🔌 Đã kết nối với Port: ${port.name}`);

    // Kiểm tra xem có đúng là luồng upload không
    if (port.name === "zalo-upload-stream") {

        // Lắng nghe từng gói tin (chunk/metadata) gửi qua đường ống này
        port.onMessage.addListener((message) => {

            if (message.type === "INIT_UPLOAD") {
                console.log("📥 Nhận yêu cầu khởi tạo Upload:", message.payload);
                // Giả lập việc chuẩn bị Strategy, gọi API...
                // Sau đó báo lại cho Content Script biết là đã sẵn sàng nhận Data
                port.postMessage({ type: "READY_FOR_CHUNK", fileId: message.payload.fileName });
            }

            else if (message.type === "FILE_CHUNK") {
                console.log(`🧱 Đã nhận Chunk số ${message.chunkIndex} của file. Kích thước: ${message.chunkSize} bytes`);
                // TODO: Bơm chunk này vào cụm Strategy để đẩy lên Google Drive

                // Giả lập upload thành công chunk này, yêu cầu gửi chunk tiếp theo
                port.postMessage({ type: "CHUNK_UPLOADED", chunkIndex: message.chunkIndex });
            }

        });

        // Xử lý khi đường ống bị ngắt (người dùng đóng tab hoặc lỗi)
        port.onDisconnect.addListener(() => {
            console.log("❌ Đường ống kết nối đã bị đóng.");
        });
    }
});