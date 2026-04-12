// src/background/strategies/GoogleDriveStrategy.js
import ICloudStorageStrategy from './ICloudStorageStrategy.js';

export default class GoogleDriveStrategy extends ICloudStorageStrategy {

    constructor() {
        super();
        this.accessToken = null;
        this.authPromise = null;
    }

    async authenticate(interactive = false) {
        if (this.authPromise) return this.authPromise;

        this.authPromise = (async () => {
            try {
                if (this.accessToken && !interactive) return this.accessToken;

                const cached = await chrome.storage.local.get(['gd_token', 'gd_token_expiry']);
                const now = Date.now();
                if (cached.gd_token && cached.gd_token_expiry > now && !interactive) {
                    this.accessToken = cached.gd_token;
                    return this.accessToken;
                }

                console.log(`[GoogleDrive] Đang xác thực qua WebAuthFlow (interactive: ${interactive})...`);

                const manifest = chrome.runtime.getManifest();
                const clientId = manifest.oauth2.client_id;
                const scopes = encodeURIComponent(manifest.oauth2.scopes.join(' '));
                const redirectUri = encodeURIComponent(chrome.identity.getRedirectURL());
                const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}`;

                return await new Promise((resolve, reject) => {
                    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive }, async (responseUrl) => {
                        if (chrome.runtime.lastError || !responseUrl) {
                            return reject(new Error(chrome.runtime.lastError ? chrome.runtime.lastError.message : "Cần đăng nhập để tiếp tục."));
                        }

                        const url = new URL(responseUrl.replace('#', '?'));
                        const token = url.searchParams.get('access_token');
                        const expiresIn = url.searchParams.get('expires_in') || 3600;

                        if (token) {
                            this.accessToken = token;
                            // Lưu vào storage, trừ đi 5 phút trừ hao
                            const expiryTime = Date.now() + (parseInt(expiresIn) - 300) * 1000;
                            await chrome.storage.local.set({
                                gd_token: token,
                                gd_token_expiry: expiryTime
                            });
                            resolve(token);
                        } else {
                            reject(new Error("Không tìm thấy Access Token trong phản hồi."));
                        }
                    });
                });
            } finally {
                this.authPromise = null;
            }
        })();

        return this.authPromise;
    }
    async _fetchWithAuth(url, options = {}) {
        // Thử lấy token từ cache/storage trước (non-interactive)
        if (!this.accessToken) {
            try {
                await this.authenticate(false);
            } catch (e) {
                // Nếu không có token trong cache, buộc phải hiện UI
                await this.authenticate(true);
            }
        }

        const makeRequest = async () => {
            return fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
        };

        let response = await makeRequest();

        if (response.status === 401) {
            console.warn("[GoogleDrive] Token hết hạn hoặc không hợp lệ, đang thử làm mới...");
            await chrome.storage.local.remove(['gd_token', 'gd_token_expiry']);
            this.accessToken = null;
            await this.authenticate(true);
            response = await makeRequest();
        }

        return response;
    }

    async _getOrCreateFolder(folderName = "Zalo Cloud Extension") {
        console.log(`[GoogleDrive] Đang kiểm tra thư mục: "${folderName}"...`);

        const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
        const searchRes = await this._fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)`);
        const searchData = await searchRes.json();

        if (searchData.files && searchData.files.length > 0) {
            console.log(`[GoogleDrive] Thư mục đã tồn tại. ID: ${searchData.files[0].id}`);
            return searchData.files[0].id;
        }

        console.log(`[GoogleDrive] Chưa có thư mục, tiến hành tạo mới...`);
        const createRes = await this._fetchWithAuth('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder'
            })
        });

        const createData = await createRes.json();
        return createData.id;
    }

    async initUpload(fileName, fileSize, mimeType) {
        const folderId = await this._getOrCreateFolder();

        const metadata = {
            name: fileName,
            parents: [folderId]
        };

        const response = await this._fetchWithAuth('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Upload-Content-Type': mimeType || 'application/octet-stream',
                'X-Upload-Content-Length': fileSize
            },
            body: JSON.stringify(metadata)
        });

        if (!response.ok) throw new Error(`Lỗi khởi tạo upload: ${response.statusText}`);
        return response.headers.get('Location');
    }

    async uploadChunk(uploadUrl, base64Data, offset, totalSize) {
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const chunkSize = bytes.length;
        const endByte = offset + chunkSize - 1;

        // Lưu ý: Upload chunk không dùng Authorization Header vì Google đã cấp Upload URL riêng biệt có quyền hạn sẵn
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Length': chunkSize.toString(),
                'Content-Range': `bytes ${offset}-${endByte}/${totalSize}`
            },
            body: bytes
        });

        if (response.status === 308) return false;

        if (response.ok) {
            const fileData = await response.json();
            const fileId = fileData.id;

            try {
                await this._fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: 'reader', type: 'anyone' })
                });
            } catch (e) {
                console.warn("[GoogleDrive] Không thể mở quyền chia sẻ (có thể do giới hạn Workspace):", e);
            }

            return `https://drive.google.com/file/d/${fileId}/view`;
        }

        throw new Error(`Lỗi khi đẩy chunk: ${response.status}`);
    }

    async getStorageQuota() {
        try {
            const response = await this._fetchWithAuth('https://www.googleapis.com/drive/v3/about?fields=storageQuota');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Google API Error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
            }

            const data = await response.json();
            if (!data.storageQuota) {
                throw new Error("Không tìm thấy thông tin dung lượng trong phản hồi từ Google.");
            }

            return {
                limit: data.storageQuota.limit ? parseInt(data.storageQuota.limit) : 15 * 1024 * 1024 * 1024, // Mặc định 15GB nếu không giới hạn/không lấy được
                usage: data.storageQuota.usage ? parseInt(data.storageQuota.usage) : 0
            };
        } catch (error) {
            console.error("[GoogleDrive] Lỗi lấy quota:", error);
            throw error;
        }
    }
}