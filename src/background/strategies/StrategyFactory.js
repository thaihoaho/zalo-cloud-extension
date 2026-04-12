// src/background/strategies/StrategyFactory.js
import GoogleDriveStrategy from './GoogleDriveStrategy.js';
import OneDriveStrategy from './OneDriveStrategy.js';
import DropboxStrategy from './DropboxStrategy.js';

export default class StrategyFactory {
    /**
     * Lấy một Strategy duy nhất
     * @param {string} target - "google_drive", "onedrive", hoặc "dropbox"
     * @returns {ICloudStorageStrategy}
     */
    static getStrategy(target) {
        switch (target) {
            case 'google_drive':
                return new GoogleDriveStrategy();
            case 'onedrive':
                return new OneDriveStrategy();
            case 'dropbox':
                return new DropboxStrategy();
            default:
                throw new Error(`[StrategyFactory] Lỗi: Không hỗ trợ nền tảng cloud '${target}'`);
        }
    }

    /**
     * Khởi tạo các Strategy dựa trên danh sách các nền tảng được chọn
     * @param {string | string[]} targets - Ví dụ: "google_drive", "onedrive"
     * @returns {ICloudStorageStrategy[]} Mảng các đối tượng xử lý (Strategies)
     */
    static getStrategies(targets) {
        const targetList = Array.isArray(targets) ? targets : [targets];
        return targetList.map(target => this.getStrategy(target));
    }
}
