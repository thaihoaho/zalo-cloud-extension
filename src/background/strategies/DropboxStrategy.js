// src/background/strategies/DropboxStrategy.js
import ICloudStorageStrategy from './ICloudStorageStrategy.js';

export default class DropboxStrategy extends ICloudStorageStrategy {

    static APP_KEY = 'iou7wtiomsdq338';

    constructor() {
        super();
        this.accessToken = null;
        this.pendingFileName = null;
    }

    async authenticate(interactive = false) {
        if (this.accessToken && !interactive) return this.accessToken;

        const cached = await chrome.storage.local.get(['dbx_token', 'dbx_token_expiry']);
        if (cached.dbx_token && cached.dbx_token_expiry > Date.now() && !interactive) {
            this.accessToken = cached.dbx_token;
            return this.accessToken;
        }

        console.log(`[Dropbox] Authenticating via WebAuthFlow (interactive: ${interactive})...`);

        const redirectUri = encodeURIComponent(chrome.identity.getRedirectURL());
        const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${DropboxStrategy.APP_KEY}&response_type=token&redirect_uri=${redirectUri}&token_access_type=legacy`;

        return new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (responseUrl) => {
                if (chrome.runtime.lastError || !responseUrl) {
                    return reject(new Error(
                        chrome.runtime.lastError?.message ?? 'Login required to continue.'
                    ));
                }

                // Dropbox returns token in fragment (#access_token=...)
                const url = new URL(responseUrl.replace('#', '?'));
                const token = url.searchParams.get('access_token');
                const expiresIn = url.searchParams.get('expires_in') || 14400;

                if (!token) return reject(new Error('Access token not found in response.'));

                this.accessToken = token;
                const expiryTime = Date.now() + (parseInt(expiresIn) - 300) * 1000;
                await chrome.storage.local.set({ dbx_token: token, dbx_token_expiry: expiryTime });
                resolve(token);
            });
        });
    }

    async _fetchWithAuth(url, options = {}) {
        if (!this.accessToken) {
            try {
                await this.authenticate(false);
            } catch {
                await this.authenticate(true);
            }
        }

        const makeRequest = async () => {
            const headers = {
                ...options.headers,
                'Authorization': `Bearer ${this.accessToken}`
            };
            // Dropbox-API-Arg must be ASCII — escape Unicode to \uXXXX
            if (headers['Dropbox-API-Arg']) {
                headers['Dropbox-API-Arg'] = JSON.stringify(
                    JSON.parse(headers['Dropbox-API-Arg'])
                ).replace(/[^\x00-\x7F]/g, c => `\\u${c.codePointAt(0).toString(16).padStart(4, '0')}`);
            }
            return fetch(url, { ...options, headers });
        };

        let response = await makeRequest();

        if (response.status === 401) {
            console.warn('[Dropbox] Token expired, re-authenticating...');
            await chrome.storage.local.remove(['dbx_token', 'dbx_token_expiry']);
            this.accessToken = null;
            await this.authenticate(true);
            response = await makeRequest();
        }

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`HTTP ${response.status}: ${body}`);
        }

        return response;
    }

    async initUpload(fileName) {
        const response = await this._fetchWithAuth(
            'https://content.dropboxapi.com/2/files/upload_session/start',
            {
                method: 'POST',
                headers: {
                    'Dropbox-API-Arg': JSON.stringify({ close: false }),
                    'Content-Type': 'application/octet-stream'
                },
                body: ''
            }
        );

        const data = await response.json();
        this.pendingFileName = fileName.normalize('NFC');
        return data.session_id;
    }

    async uploadChunk(uploadUrl, base64Data, offset, totalSize) {
        const session_id = uploadUrl;

        const binaryString = atob(base64Data);
        const chunkBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            chunkBytes[i] = binaryString.charCodeAt(i);
        }

        const chunkSize = chunkBytes.length;
        const isFinalChunk = offset + chunkSize >= totalSize;

        if (!isFinalChunk) {
            await this._fetchWithAuth(
                'https://content.dropboxapi.com/2/files/upload_session/append_v2',
                {
                    method: 'POST',
                    headers: {
                        'Dropbox-API-Arg': JSON.stringify({ cursor: { session_id, offset }, close: false }),
                        'Content-Type': 'application/octet-stream'
                    },
                    body: chunkBytes
                }
            );
            return false;
        }

        const finishResponse = await this._fetchWithAuth(
            'https://content.dropboxapi.com/2/files/upload_session/finish',
            {
                method: 'POST',
                headers: {
                    'Dropbox-API-Arg': JSON.stringify({
                        cursor: { session_id, offset },
                        commit: {
                            path: `/Zalo Cloud Extension/${this.pendingFileName}`,
                            mode: 'add',
                            autorename: true
                        }
                    }),
                    'Content-Type': 'application/octet-stream'
                },
                body: chunkBytes
            }
        );

        // autorename may change the filename (e.g. slide (1).pdf), use path_display from response
        const finishData = await finishResponse.json();
        const filePath = finishData.path_display;

        const linkResponse = await this._fetchWithAuth(
            'https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: filePath, settings: { requested_visibility: 'public' } })
            }
        ).catch(async (err) => {
            const match = err.message.match(/^HTTP \d+: ([\s\S]*)$/);
            if (match) {
                try {
                    const errBody = JSON.parse(match[1]);
                    if (errBody?.error?.['.tag'] === 'shared_link_already_exists') {
                        return { _alreadyExists: true, url: errBody.error.shared_link_already_exists?.metadata?.url ?? null };
                    }
                } catch { /* not JSON, rethrow */ }
            }
            throw err;
        });

        if (linkResponse._alreadyExists) {
            if (linkResponse.url) return linkResponse.url;

            // Fallback: fetch existing link via list_shared_links
            const listResponse = await this._fetchWithAuth(
                'https://api.dropboxapi.com/2/sharing/list_shared_links',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: filePath, direct_only: true })
                }
            );
            const listData = await listResponse.json();
            return listData.links[0].url;
        }

        const linkData = await linkResponse.json();
        return linkData.url;
    }

    async getStorageQuota() {
        const response = await this._fetchWithAuth(
            'https://api.dropboxapi.com/2/users/get_space_usage',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'null'
            }
        );

        const data = await response.json();
        return {
            usage: data.used,
            limit: data.allocation.allocated
        };
    }
}
