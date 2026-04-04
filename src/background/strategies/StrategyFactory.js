// src/background/strategies/StrategyFactory.js
import GoogleDriveStrategy from './GoogleDriveStrategy.js';
import OneDriveStrategy from './OneDriveStrategy.js';

export default class StrategyFactory {
    /**
     * Khởi tạo các Strategy dựa trên danh sách các nền tảng được chọn
     * @param {string | string[]} targets - Ví dụ: "google_drive", "onedrive"
     * @returns {ICloudStorageStrategy[]} Mảng các đối tượng xử lý (Strategies)
     */
    static getStrategies(targets) {
        // Chuẩn hóa đầu vào thành mảng
        const targetList = Array.isArray(targets) ? targets : [targets];
        
        const activeStrategies = [];

        for (const target of targetList) {
            switch (target) {
                case 'google_drive':
                    activeStrategies.push(new GoogleDriveStrategy());
                    break;

                case 'onedrive':
                    activeStrategies.push(new OneDriveStrategy());
                    break;

                default:
                    console.warn(`[StrategyFactory] Bỏ qua nền tảng không hỗ trợ: '${target}'`);
            }
        }

        if (activeStrategies.length === 0) {
            throw new Error(`[StrategyFactory] Không có nền tảng cloud nào hợp lệ.`);
        }

        return activeStrategies; // Trả về MẢNG
    }
}