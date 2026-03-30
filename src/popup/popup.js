document.addEventListener('DOMContentLoaded', async () => {
    const driveSelect = document.getElementById('drive-select');
    const storageText = document.getElementById('storage-text');
    const storageProgress = document.getElementById('storage-progress');
    const statusMsg = document.getElementById('status-msg');

    const result = await chrome.storage.sync.get(['preferred_drive']);
    if (result.preferred_drive) {
        driveSelect.value = result.preferred_drive;
    }

    updateQuotaDisplay();

    driveSelect.addEventListener('change', async () => {
        const newDrive = driveSelect.value;
        await chrome.storage.sync.set({ preferred_drive: newDrive });

        statusMsg.innerText = "Đã lưu cài đặt!";
        statusMsg.style.color = "#28a745";

        updateQuotaDisplay();

        setTimeout(() => {
            statusMsg.innerText = "Cài đặt được tự động lưu";
            statusMsg.style.color = "#888";
        }, 2000);
    });

    async function updateQuotaDisplay() {
        storageText.innerText = "Đang tải...";
        storageProgress.style.width = "0%";

        chrome.runtime.sendMessage({ type: "GET_STORAGE_QUOTA" }, (response) => {
            if (response && response.success) {
                const { limit, usage } = response.quota;
                const percent = Math.round((usage / limit) * 100);

                const usedGB = (usage / (1024 ** 3)).toFixed(1);
                const totalGB = (limit / (1024 ** 3)).toFixed(0);

                storageText.innerText = `${usedGB}GB / ${totalGB}GB (${percent}%)`;
                storageProgress.style.width = `${percent}%`;

                if (percent > 90) {
                    storageProgress.style.background = "linear-gradient(90deg, #ff4d4d, #cc0000)";
                } else {
                    storageProgress.style.background = "linear-gradient(90deg, #00c6ff, #0088ff)";
                }
            } else {
                storageText.innerText = "Lỗi kết nối API";
                console.error("Quota Error:", response ? response.error : "Unknown");
            }
        });
    }
});
