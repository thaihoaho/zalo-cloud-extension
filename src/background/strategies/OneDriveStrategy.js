// src/background/strategies/OneDriveStrategy.js
import ICloudStorageStrategy from './ICloudStorageStrategy.js';

export default class OneDriveStrategy extends ICloudStorageStrategy {
    constructor() {
        super();
        this.accessToken = null;
        // Điền Client ID bạn lấy từ Azure Portal vào đây
        this.clientId = "51ee7d2e-471f-4679-95f3-48c6418a156d"; 
        this.redirectUri = chrome.identity.getRedirectURL();
    }

    async authenticate(interactive = false) {
        // 1. Kiểm tra RAM
        if (this.accessToken && !interactive) return this.accessToken;

        // 2. Kiểm tra Cache
        const cached = await chrome.storage.local.get(['od_token', 'od_token_expiry']);
        const now = Date.now();
        if (cached.od_token && cached.od_token_expiry > now && !interactive) {
            this.accessToken = cached.od_token;
            return this.accessToken;
        }

        console.log(`[OneDrive] Đang xác thực qua WebAuthFlow...`);
        
        // Scope yêu cầu quyền đọc ghi file
        const scopes = encodeURIComponent("Files.ReadWrite.All");
        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${this.clientId}&response_type=token&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${scopes}`;

        return new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow({ url: authUrl, interactive }, async (responseUrl) => {
                if (chrome.runtime.lastError || !responseUrl) {
                    return reject(new Error("Hủy đăng nhập hoặc lỗi xác thực OneDrive."));
                }

                const url = new URL(responseUrl.replace('#', '?'));
                const token = url.searchParams.get('access_token');
                const expiresIn = url.searchParams.get('expires_in') || 3600;

                if (token) {
                    this.accessToken = token;
                    const expiryTime = Date.now() + (parseInt(expiresIn) - 300) * 1000;
                    await chrome.storage.local.set({ 
                        od_token: token, 
                        od_token_expiry: expiryTime 
                    });
                    resolve(token);
                } else {
                    reject(new Error("Không lấy được Access Token từ OneDrive."));
                }
            });
        });
    }

    async _fetchWithAuth(url, options = {}) {
        if (!this.accessToken) {
            await this.authenticate(false).catch(() => this.authenticate(true));
        }

        const makeRequest = () => fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        let response = await makeRequest();
        if (response.status === 401) {
            console.warn("[OneDrive] Token hết hạn, đang làm mới...");
            await chrome.storage.local.remove(['od_token', 'od_token_expiry']);
            this.accessToken = null;
            await this.authenticate(true);
            response = await makeRequest();
        }
        return response;
    }

    async initUpload(fileName, fileSize, mimeType) {
        // Tạo folder và khởi tạo Upload Session trong 1 request với Graph API
        const apiUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/Zalo Cloud Extension/${fileName}:/createUploadSession`;
        
        const response = await this._fetchWithAuth(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item: { "@microsoft.graph.conflictBehavior": "rename" }
            })
        });

        if (!response.ok) throw new Error(`Lỗi khởi tạo OneDrive: ${response.statusText}`);
        const data = await response.json();
        return data.uploadUrl; // Đường ống để bơm chunk
    }

    async uploadChunk(uploadUrl, base64Data, offset, totalSize) {
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const chunkSize = bytes.length;
        const endByte = offset + chunkSize - 1;

        // Lưu ý: Không dùng _fetchWithAuth ở đây vì uploadUrl đã chứa sẵn token bảo mật bên trong nó
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Length': chunkSize.toString(),
                'Content-Range': `bytes ${offset}-${endByte}/${totalSize}`
            },
            body: bytes
        });

        if (response.status === 202) return false; // 202 Accepted: Đang chờ chunk tiếp theo

        if (response.status === 201 || response.status === 200) {
            const fileData = await response.json();
            const fileId = fileData.id;

            // Lấy link Shareable (Public View)
            const shareRes = await this._fetchWithAuth(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/createLink`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'view', scope: 'anonymous' })
            });
            
            const shareData = await shareRes.json();
            return shareData.link.webUrl;
        }

        throw new Error(`Lỗi đẩy chunk OneDrive: ${response.status}`);
    }

    async getStorageQuota() {
        const response = await this._fetchWithAuth('https://graph.microsoft.com/v1.0/me/drive');
        if (!response.ok) throw new Error("Không thể lấy dung lượng OneDrive.");
        
        const data = await response.json();
        return {
            limit: data.quota.total,
            usage: data.quota.used
        };
    }
}