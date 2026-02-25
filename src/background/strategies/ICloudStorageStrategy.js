export default class ICloudStorageStrategy {

    constructor() {
        if (this.constructor === ICloudStorageStrategy) {
            throw new Error("LỖI: Không thể khởi tạo trực tiếp Interface ICloudStorageStrategy. Bạn phải kế thừa nó.");
        }
    }

    /**
     * 1. Xác thực người dùng (OAuth2)
     * @returns {Promise<string>} Access Token
     */
    async authenticate() {
        throw new Error("Method 'authenticate()' bắt buộc phải được implement.");
    }

    /**
     * 2. Khởi tạo phiên tải lên (Resumable Upload Session)
     * @param {string} fileName - Tên file
     * @param {number} fileSize - Tổng dung lượng file
     * @param {string} mimeType - Loại file (vd: image/png)
     * @returns {Promise<string>} Upload URL (Đường ống để bơm chunk vào)
     */
    async initUpload(fileName, fileSize, mimeType) {
        throw new Error("Method 'initUpload()' bắt buộc phải được implement.");
    }

    /**
     * 3. Bơm dữ liệu lên Cloud (Upload Chunk)
     * @param {string} uploadUrl - URL lấy từ hàm initUpload
     * @param {string} base64Data - Dữ liệu chunk bị băm nhỏ
     * @param {number} offset - Vị trí byte bắt đầu của chunk này
     * @param {number} totalSize - Tổng dung lượng file gốc
     * @returns {Promise<boolean|string>} Trả về True nếu còn tiếp, trả về Link File nếu là chunk cuối.
     */
    async uploadChunk(uploadUrl, base64Data, offset, totalSize) {
        throw new Error("Method 'uploadChunk()' bắt buộc phải được implement.");
    }
}