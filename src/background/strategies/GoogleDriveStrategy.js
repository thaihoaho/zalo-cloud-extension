// src/background/strategies/GoogleDriveStrategy.js
import ICloudStorageStrategy from './ICloudStorageStrategy.js';

export default class GoogleDriveStrategy extends ICloudStorageStrategy {

    constructor() {
        super();
        this.accessToken = null;
    }

    async authenticate() {
        console.log("[GoogleDrive] Đang tiến hành xác thực OAuth2 qua Web Flow...");
        const manifest = chrome.runtime.getManifest();
        const clientId = manifest.oauth2.client_id;
        const scopes = encodeURIComponent(manifest.oauth2.scopes.join(' '));
        const redirectUri = encodeURIComponent(chrome.identity.getRedirectURL());
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}`;

        return new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
                if (chrome.runtime.lastError || !responseUrl) {
                    return reject(new Error(chrome.runtime.lastError ? chrome.runtime.lastError.message : "Đã đóng cửa sổ đăng nhập."));
                }
                const url = new URL(responseUrl.replace('#', '?'));
                const token = url.searchParams.get('access_token');
                if (token) {
                    console.log("[GoogleDrive] Đăng nhập thành công! Đã nắm trong tay Token.");
                    this.accessToken = token;
                    resolve(token);
                } else {
                    reject(new Error("Không tìm thấy Access Token."));
                }
            });
        });
    }

    /**
     * Hàm phụ trợ: Tìm hoặc tạo thư mục trên Google Drive
     */
    async _getOrCreateFolder(folderName = "Zalo Cloud Extension") {
        console.log(`[GoogleDrive] Đang kiểm tra thư mục: "${folderName}"...`);

        // 1. Tìm xem thư mục đã tồn tại chưa (không lấy các thư mục nằm trong thùng rác)
        const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)`, {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });
        const searchData = await searchRes.json();

        if (searchData.files && searchData.files.length > 0) {
            console.log(`[GoogleDrive] Thư mục đã tồn tại. ID: ${searchData.files[0].id}`);
            return searchData.files[0].id;
        }

        // 2. Nếu chưa có, tiến hành tạo mới
        console.log(`[GoogleDrive] Chưa có thư mục, tiến hành tạo mới...`);
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder'
            })
        });

        const createData = await createRes.json();
        console.log(`[GoogleDrive] Đã tạo thư mục thành công. ID: ${createData.id}`);
        return createData.id;
    }

    /**
     * Khởi tạo đường ống Resumable Upload với server Google
     */
    async initUpload(fileName, fileSize, mimeType) {
        console.log(`[GoogleDrive] Khởi tạo phiên upload cho file: ${fileName}`);

        const folderId = await this._getOrCreateFolder("Zalo Cloud Extension");

        const metadata = {
            name: fileName,
            parents: [folderId] // CHỈ ĐỊNH: Bỏ file này vào trong thư mục vừa tạo
        };

        // Gọi API xin mở đường ống tải lên (Resumable Upload)
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'X-Upload-Content-Type': mimeType || 'application/octet-stream',
                'X-Upload-Content-Length': fileSize
            },
            body: JSON.stringify(metadata)
        });

        if (!response.ok) {
            throw new Error(`Lỗi khởi tạo upload: ${response.statusText}`);
        }

        //Lấy URL đường ống (nằm trong header 'Location' mà Google trả về)
        const uploadUrl = response.headers.get('Location');
        console.log("[GoogleDrive] Đã thiết lập xong ống nước. URL:", uploadUrl);

        return uploadUrl;
    }

    async uploadChunk(uploadUrl, base64Data, offset, totalSize) {
        console.log(`[GoogleDrive] Bơm chunk từ byte ${offset}...`);
        // TODO: Đẩy data lên
        return false;
    }
}