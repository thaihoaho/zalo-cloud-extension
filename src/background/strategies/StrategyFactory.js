// src/background/strategies/StrategyFactory.js
import GoogleDriveStrategy from './GoogleDriveStrategy.js';
import OneDriveStrategy from './OneDriveStrategy.js';
import DropboxStrategy from './DropboxStrategy.js';

export default class StrategyFactory {

    /**
     * Hàm tĩnh (static) để khởi tạo Strategy dựa trên khóa (key)
     * @param {string} targetDrive - "google_drive" hoặc "onedrive"
     * @returns {ICloudStorageStrategy} Đối tượng xử lý tương ứng
     */
    static getStrategy(targetDrive) {
        switch (targetDrive) {
            case 'google_drive':
                return new GoogleDriveStrategy();

            case 'onedrive':
                return new OneDriveStrategy();

            case 'dropbox':
                return new DropboxStrategy();

            default:
                throw new Error(`[StrategyFactory] Lỗi: Không hỗ trợ nền tảng cloud '${targetDrive}'`);
        }
    }
}