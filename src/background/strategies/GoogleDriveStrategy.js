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
    async _getOrCreateFolder(folderName = "Zalo Cloud Extension") {
        console.log(`[GoogleDrive] Đang kiểm tra thư mục: "${folderName}"...`);

        const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)`, {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });
        const searchData = await searchRes.json();

        if (searchData.files && searchData.files.length > 0) {
            console.log(`[GoogleDrive] Thư mục đã tồn tại. ID: ${searchData.files[0].id}`);
            return searchData.files[0].id;
        }

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

    async initUpload(fileName, fileSize, mimeType) {
        console.log(`[GoogleDrive] Khởi tạo phiên upload cho file: ${fileName}`);

        const folderId = await this._getOrCreateFolder("Zalo Cloud Extension");

        const metadata = {
            name: fileName,
            parents: [folderId]
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

        const uploadUrl = response.headers.get('Location');
        console.log("[GoogleDrive] Đã thiết lập xong ống. URL:", uploadUrl);

        return uploadUrl;
    }

    async uploadChunk(uploadUrl, base64Data, offset, totalSize) {
        console.log(`[GoogleDrive] Bơm chunk từ byte ${offset}...`);

        // Dịch ngược chuỗi Base64 thành Dữ liệu nhị phân (Binary)
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const chunkSize = bytes.length;
        const endByte = offset + chunkSize - 1;

        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Length': chunkSize.toString(),
                'Content-Range': `bytes ${offset}-${endByte}/${totalSize}`
            },
            body: bytes
        });

        if (response.status === 308) {
            // Mã 308 (Resume Incomplete): Google báo "Đã nhận được mảnh này"
            console.log(`[GoogleDrive] Đã đẩy xong mảnh ${offset} -> ${endByte}. Đang chờ mảnh tiếp theo...`);
            return false; // Báo hiệu là chưa up xong file
        }

        if (response.ok) {
            // Mã 200 hoặc 201: Google báo "Đã nhận được mảnh cuối cùng, ghép file hoàn tất!"
            const fileData = await response.json();
            const fileId = fileData.id;
            console.log(`[GoogleDrive] 🎉 UPLOAD HOÀN TẤT! File ID: ${fileId}`);

            console.log(`[GoogleDrive] Đang mở quyền Public (Anyone with the link) cho file...`);
            try {
                await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        role: 'reader',
                        type: 'anyone'
                    })
                });
                console.log(`[GoogleDrive] 🔓 Đã set quyền Public View thành công!`);
            } catch (permError) {
                console.error(`[GoogleDrive] ⚠️ Lỗi khi set quyền (File vẫn up thành công):`, permError);
            }
            return `https://drive.google.com/file/d/${fileId}/view`;
        }

        // Nếu rơi vào các lỗi khác (Mất mạng, file quá lớn, hết dung lượng Drive...)
        throw new Error(`Lỗi khi đẩy chunk: ${response.status} - ${response.statusText}`);
    }
}