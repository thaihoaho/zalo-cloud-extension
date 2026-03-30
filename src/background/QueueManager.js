// src/background/QueueManager.js

export default class QueueManager {
    constructor(maxConcurrent = 2) {
        this.maxConcurrent = maxConcurrent; // Số lượng file tải lên đồng thời tối đa
        this.queue = [];
        this.activeCount = 0;
    }

    /**
     * Thêm một task vào hàng đợi
     * @param {Function} taskFn - Một hàm async thực hiện việc upload
     * @returns {Promise} - Trả về kết quả của task khi hoàn thành
     */
    enqueue(taskFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ taskFn, resolve, reject });
            console.log(`[QueueManager] Đã thêm task. Hàng đợi hiện tại: ${this.queue.length}, Đang chạy: ${this.activeCount}`);
            this.processNext();
        });
    }

    async processNext() {
        // Nếu đã đạt giới hạn song song hoặc không còn gì trong hàng đợi thì dừng
        if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        const { taskFn, resolve, reject } = this.queue.shift();
        this.activeCount++;

        console.log(`[QueueManager] Bắt đầu xử lý task mới. Đang chạy: ${this.activeCount}`);

        try {
            const result = await taskFn();
            resolve(result);
        } catch (error) {
            console.error("[QueueManager] Task thất bại:", error);
            reject(error);
        } finally {
            this.activeCount--;
            // Khi một task xong, tự động tìm task tiếp theo để chạy
            this.processNext();
        }
    }
}
