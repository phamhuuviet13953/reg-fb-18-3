// Xử lý chuyển tab chính
document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo tabs
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Đảm bảo tab đầu tiên được hiển thị khi tải trang
    document.getElementById('thao-tac').classList.add('active');
    tabs[0].classList.add('active');
    
    // Thêm event listener cho mỗi tab
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Xóa class active từ tất cả các tab
            tabs.forEach(t => t.classList.remove('active'));
            
            // Thêm class active vào tab được nhấp
            this.classList.add('active');
            
            // Ẩn tất cả nội dung tab
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            // Hiển thị nội dung của tab được chọn
            const tabId = this.getAttribute('data-tab');
            const activeContent = document.getElementById(tabId);
            if (activeContent) {
                activeContent.classList.add('active');
            } else {
                console.error(`Tab content with id "${tabId}" not found`);
            }
        });
    });

    // Xử lý chuyển tab xác minh
    const verificationTabs = document.querySelectorAll('.verification-tab');
    const verificationContents = document.querySelectorAll('.verification-content');
    
    verificationTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Xóa class active từ tất cả các tab xác minh
            verificationTabs.forEach(t => t.classList.remove('active'));
            
            // Thêm class active vào tab xác minh được nhấp
            this.classList.add('active');
            
            // Ẩn tất cả nội dung tab xác minh
            verificationContents.forEach(content => {
                content.style.display = 'none';
            });
            
            // Hiển thị nội dung của tab xác minh được chọn
            const tabId = this.getAttribute('data-vtab');
            const activeContent = document.getElementById(tabId + '-content');
            if (activeContent) {
                activeContent.style.display = 'block';
            } else {
                console.error(`Verification content with id "${tabId}-content" not found`);
            }
        });
    });

    // Các chức năng khác của giao diện
    setupDeviceControls();
    setupSettingControls();
    setupRegManager();
});

// Xử lý chức năng thiết bị
function setupDeviceControls() {
    // Làm mới danh sách thiết bị
    const refreshButton = document.getElementById('refreshAllDevicesButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            // Tạm thời alert để biết chức năng hoạt động
            alert('Đang làm mới danh sách thiết bị...');
            // TODO: Thêm code gọi đến ADB để lấy danh sách thiết bị
        });
    }

    // Thêm listener cho các nút chức năng chính
    const functionButtons = [
        { id: 'homeButton', action: 'Đang nhấn phím Home' },
        { id: 'enable4gButton', action: 'Đang bật 4G' },
        { id: 'disable4gButton', action: 'Đang tắt 4G' },
        { id: 'clearAllButton', action: 'Đang xóa tất cả dữ liệu' },
        { id: 'enableTimeButton', action: 'Đang bật múi giờ tự động' },
        { id: 'saveRegionButton', action: 'Đang lưu khu vực' },
        { id: 'saveTimeButton', action: 'Đang lưu thời gian' },
        { id: 'dpiButton', action: 'Đang thay đổi DPI' }
    ];

    functionButtons.forEach(button => {
        const elem = document.getElementById(button.id);
        if (elem) {
            elem.addEventListener('click', function() {
                // Hiển thị trạng thái trong phần status
                const statusElem = document.getElementById('status');
                if (statusElem) {
                    statusElem.innerHTML = `<div style="color: green; padding: 10px;">${button.action}...</div>`;
                }
                // TODO: Thêm code thực hiện chức năng tương ứng
            });
        }
    });
}

// Xử lý chức năng cấu hình
function setupSettingControls() {
    // Xử lý các nút sửa thông tin tài khoản
    const accountButtons = [
        { selector: 'button:contains("Sửa họ")', file: 'ho.txt' },
        { selector: 'button:contains("Sửa tên")', file: 'ten.txt' },
        { selector: 'button:contains("Sửa mật khẩu")', file: 'matkhau.txt' }
    ];

    // Polyfill cho :contains selector
    document.querySelectorAll('.button').forEach(button => {
        if (button.textContent.includes('Sửa họ')) {
            button.addEventListener('click', function() {
                alert('Đang mở file ho.txt');
                // TODO: Thêm code mở file ho.txt
            });
        } else if (button.textContent.includes('Sửa tên')) {
            button.addEventListener('click', function() {
                alert('Đang mở file ten.txt');
                // TODO: Thêm code mở file ten.txt
            });
        } else if (button.textContent.includes('Sửa mật khẩu')) {
            button.addEventListener('click', function() {
                alert('Đang mở file matkhau.txt');
                // TODO: Thêm code mở file matkhau.txt
            });
        }
    });

    // Xử lý nút folder ảnh
    document.querySelectorAll('.button').forEach(button => {
        if (button.textContent.includes('Folder ảnh')) {
            button.addEventListener('click', function() {
                alert('Đang mở thư mục ảnh avatar');
                // TODO: Thêm code mở thư mục ảnh
            });
        }
    });
}

// Xử lý quản lý đăng ký
function setupRegManager() {
    // Xử lý các nút file trong tab quản lý reg
    const fileButtons = document.querySelectorAll('.file-button');
    fileButtons.forEach(button => {
        button.addEventListener('click', function() {
            const fileType = this.textContent.trim();
            let fileName = '';
            
            switch(fileType) {
                case 'WIN VERIFY':
                    fileName = 'winverify.txt';
                    break;
                case 'WIN NOVERY':
                    fileName = 'winnovery.txt';
                    break;
                case 'THẤT BẠI':
                    fileName = 'thatbai.txt';
                    break;
            }
            
            if (fileName) {
                alert(`Đang mở file ${fileName}`);
                // TODO: Thêm code mở file tương ứng
            }
        });
    });
}