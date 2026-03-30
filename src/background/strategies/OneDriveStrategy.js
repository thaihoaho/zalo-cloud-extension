// src/background/strategies/OneDriveStrategy.js
import ICloudStorageStrategy from './ICloudStorageStrategy.js';

export default class OneDriveStrategy extends ICloudStorageStrategy {

    async authenticate() {
        console.log("[OneDrive] Đang tiến hành xác thực OAuth2...");
        return "fake_microsoft_access_token";
    }

    async initUpload(fileName, fileSize, mimeType) {
        console.log(`[OneDrive] Khởi tạo phiên upload cho file: ${fileName}`);
        return "https://fake.graph.microsoft.com/upload_session";
    }

    async uploadChunk(uploadUrl, base64Data, offset, totalSize) {
        console.log(`[OneDrive] Bơm chunk từ byte ${offset}...`);
        return false;
    }

    async getStorageQuota() {
        return {
            limit: 5 * 1024 * 1024 * 1024, // 5GB giả lập
            usage: 1.2 * 1024 * 1024 * 1024 // 1.2GB giả lập
        };
    }
}