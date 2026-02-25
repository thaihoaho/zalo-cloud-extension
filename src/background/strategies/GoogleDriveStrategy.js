// src/background/strategies/GoogleDriveStrategy.js
import ICloudStorageStrategy from './ICloudStorageStrategy.js';

export default class GoogleDriveStrategy extends ICloudStorageStrategy {

    async authenticate() {
        console.log("[GoogleDrive] Đang tiến hành xác thực OAuth2...");
        // TODO: Viết logic gọi chrome.identity lấy token
        return "fake_google_access_token";
    }

    async initUpload(fileName, fileSize, mimeType) {
        console.log(`[GoogleDrive] Khởi tạo phiên upload cho file: ${fileName}`);
        // TODO: Gọi Google Drive API tạo Resumable Upload URL
        return "https://fake.googleapis.com/upload/drive/v3/files?uploadType=resumable";
    }

    async uploadChunk(uploadUrl, base64Data, offset, totalSize) {
        console.log(`[GoogleDrive] Bơm chunk từ byte ${offset}...`);
        // TODO: Gửi HTTP PUT request đẩy chunk data lên
        return false; // Tạm thời trả về false (chưa xong file)
    }
}