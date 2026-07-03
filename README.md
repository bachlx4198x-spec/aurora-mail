# Aurora Mail

Ứng dụng email desktop hiện đại, xây bằng Electron — giao diện lấy cảm hứng từ macOS Mail
/ iPadOS Mail, hỗ trợ kết nối tài khoản email thật qua IMAP/SMTP (giống cách thiết lập
trong Thunderbird hoặc Outlook).

## ⚠️ Lưu ý quan trọng

Mã nguồn này được viết và kiểm tra cú pháp (`node --check`) trong một sandbox không có
kết nối mạng đến máy chủ tải file nhị phân của Electron, nên **chưa chạy thử được bằng
mắt và chưa build được file .exe trong môi trường đó**. Bạn cần chạy các bước dưới đây
trên máy tính của mình (có mạng Internet bình thường) để cài đặt, chạy thử và đóng gói.

Logic kết nối IMAP/SMTP (`src/mailEngine.js`) dùng đúng các thư viện chuẩn của Node.js
(`imap`, `mailparser`, `nodemailer`) nhưng chưa được test với một hộp thư thật — bạn nên
thử với tài khoản của mình và báo lại nếu gặp lỗi.

## Yêu cầu

- [Node.js](https://nodejs.org) bản 18 trở lên
- npm (đi kèm Node.js)

## Chạy thử ứng dụng (chế độ phát triển)

```bash
npm install
npm start
```

Ứng dụng sẽ mở với một **tài khoản demo** có sẵn dữ liệu mẫu để bạn xem giao diện ngay,
không cần tài khoản email thật.

## Thêm tài khoản email thật

1. Nhấn **"+ Thêm tài khoản email"** ở góc dưới sidebar.
2. Chọn nhanh preset Gmail / Outlook / Yahoo / iCloud, hoặc chọn "Tuỳ chỉnh" để tự nhập
   host/port IMAP-SMTP (giống Thunderbird).
3. Với Gmail/Outlook/Yahoo hiện đại, bạn thường cần dùng **mật khẩu ứng dụng (App
   Password)** thay vì mật khẩu đăng nhập thường, vì các nhà cung cấp này đã tắt
   "Less secure app access". Google: Tài khoản → Bảo mật → Mật khẩu ứng dụng.
4. Nhấn **"Kiểm tra kết nối"** trước khi lưu để chắc chắn thông tin đúng.

## Đóng gói ra file .exe (Windows)

Cách đáng tin cậy nhất là build **trên máy Windows**:

```bash
npm install
npm run build:win
```

File `.exe` (bản portable, chạy được ngay không cần cài đặt) sẽ nằm trong thư mục `dist/`.

### Nếu bạn build từ macOS/Linux

`electron-builder` cần **Wine** để đóng gói cho Windows khi build chéo từ macOS/Linux:

```bash
# macOS
brew install --cask wine-stable

# Ubuntu/Debian
sudo apt install wine
```

Sau đó chạy `npm run build:win` như trên.

### Cách khác: dùng GitHub Actions (không cần máy Windows, khuyên dùng)

Project này đã có sẵn workflow tại `.github/workflows/build.yml` — chỉ cần đẩy code lên
GitHub là tự động build ra `.exe` trên máy chủ Windows miễn phí của GitHub. Xem hướng dẫn
chi tiết từng bước ở file `HUONG_DAN_GITHUB_ACTIONS.md`.

## Cấu trúc thư mục

```
mailapp/
├── main.js            # Electron main process (cửa sổ, IPC)
├── preload.js          # Cầu nối an toàn giữa renderer và main
├── src/
│   ├── index.html       # Giao diện (sidebar, danh sách thư, khung đọc)
│   ├── style.css         # Thiết kế kiểu macOS/iPad
│   ├── renderer.js        # Logic giao diện phía client
│   ├── store.js            # Lưu tài khoản cục bộ (mật khẩu mã hoá bằng OS keychain)
│   └── mailEngine.js        # Kết nối IMAP (đọc thư) & SMTP (gửi thư)
├── assets/icon.png     # Icon ứng dụng
└── package.json         # Cấu hình build electron-builder
```

## Bảo mật mật khẩu

Mật khẩu tài khoản được mã hoá bằng `safeStorage` của Electron (Keychain trên macOS,
DPAPI trên Windows, libsecret trên Linux) trước khi lưu vào đĩa tại thư mục dữ liệu
người dùng của ứng dụng.
