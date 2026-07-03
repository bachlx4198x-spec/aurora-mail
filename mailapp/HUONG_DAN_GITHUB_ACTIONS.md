# Hướng dẫn build file .exe bằng GitHub Actions

Cách này chạy build trên máy chủ Windows miễn phí của GitHub, nên bạn **không cần cài
Node.js, Electron hay Windows trên máy mình** — chỉ cần một tài khoản GitHub và đẩy code
lên là xong.

---

## Bước 0 — Chuẩn bị

1. Tạo tài khoản GitHub (miễn phí) tại **https://github.com/join** nếu chưa có.
2. Cài **Git** cho máy bạn nếu chưa có: **https://git-scm.com/downloads**
   (Trong lúc cài trên Windows, cứ để mặc định mọi tuỳ chọn là được.)
3. Giải nén file `aurora-mail-source.zip` đã tải về ra một thư mục, ví dụ `Documents/aurora-mail`.

> **Không quen dùng dòng lệnh?** Có thể dùng **GitHub Desktop**
> (https://desktop.github.com) — ứng dụng có giao diện, kéo-thả thay vì gõ lệnh git. Ở
> cuối hướng dẫn có ghi chú cách làm tương đương bằng GitHub Desktop.

---

## Bước 1 — Tạo repository mới trên GitHub

1. Đăng nhập GitHub, vào **https://github.com/new**
2. Đặt tên, ví dụ `aurora-mail`
3. Chọn **Public** (Actions chạy miễn phí không giới hạn) hoặc **Private** (vẫn miễn phí,
   nhưng có giới hạn 2.000 phút build/tháng — build 1 app nhỏ như thế này chỉ tốn
   khoảng 3–5 phút mỗi lần nên vẫn thoải mái).
4. **Không** tick "Add a README file" (vì mình đã có sẵn code).
5. Nhấn **Create repository**. GitHub sẽ hiện ra một trang có sẵn các lệnh git mẫu — giữ
   trang này lại, bạn sẽ cần dòng URL dạng
   `https://github.com/ten-ban/aurora-mail.git`.

---

## Bước 2 — Đẩy (push) code lên GitHub

Mở **Terminal** (macOS/Linux) hoặc **Git Bash / PowerShell** (Windows), di chuyển vào
thư mục vừa giải nén rồi chạy lần lượt:

```bash
cd Documents/aurora-mail

git init
git add .
git commit -m "Aurora Mail - phien ban dau"
git branch -M main
git remote add origin https://github.com/TEN-BAN/aurora-mail.git
git push -u origin main
```

Thay `TEN-BAN/aurora-mail` bằng đúng đường dẫn repo GitHub bạn vừa tạo ở Bước 1.

Lần đầu push, GitHub sẽ yêu cầu đăng nhập — làm theo hướng dẫn trên màn hình (thường mở
trình duyệt để xác thực).

> **Dùng GitHub Desktop thay vì dòng lệnh:** mở app → **File → Add local repository** →
> chọn thư mục `aurora-mail` → **Publish repository**.

---

## Bước 3 — Theo dõi GitHub Actions build

1. Vào trang repo trên GitHub, bấm tab **Actions** ở thanh trên.
2. Bạn sẽ thấy một lượt chạy tên **"Build Windows EXE"** đang chạy (tự động kích hoạt vì
   workflow đã có sẵn ở `.github/workflows/build.yml` và bạn vừa push lên `main`).
3. Bấm vào lượt chạy đó để xem tiến trình theo thời gian thực (khoảng **3–5 phút**):
   - Checkout source code
   - Setup Node.js
   - Install dependencies
   - Build portable .exe
   - Upload .exe as build artifact
4. Nếu có dòng nào báo lỗi màu đỏ, bấm vào để xem chi tiết log (xem mục Xử lý sự cố bên
   dưới).

**Muốn chạy lại thủ công** (không cần push code mới): vào tab Actions → chọn workflow
"Build Windows EXE" ở cột trái → nút **Run workflow** → **Run workflow**.

---

## Bước 4 — Tải file .exe về máy

1. Sau khi lượt chạy hiện dấu tick xanh ✅ (thành công), cuộn xuống cuối trang của lượt
   chạy đó.
2. Trong mục **Artifacts**, bạn sẽ thấy `aurora-mail-windows` — bấm để tải về (file
   `.zip`).
3. Giải nén ra, bên trong là file `.exe` — ví dụ `Aurora Mail-1.0.0-portable.exe`.
4. Đây là bản **portable**: copy sang máy Windows nào cũng chạy được ngay, không cần cài
   đặt.

---

## Bước 5 — Chạy thử trên Windows

Khi mở file `.exe` lần đầu, Windows SmartScreen có thể hiện cảnh báo **"Windows protected
your PC"** — đây là điều bình thường với mọi app chưa mua chứng chỉ ký số (code signing
certificate, thường tốn phí hàng trăm USD/năm), không phải dấu hiệu app có vấn đề. Để
chạy: bấm **More info** → **Run anyway**.

---

## Cập nhật code sau này

Mỗi khi bạn sửa code và muốn build lại:

```bash
git add .
git commit -m "Mo ta thay doi"
git push
```

GitHub Actions sẽ tự động chạy lại và tạo bản `.exe` mới trong Artifacts.

---

## Xử lý sự cố thường gặp

| Lỗi | Nguyên nhân / cách sửa |
|---|---|
| `npm install` lỗi trong Actions log | Thường do sai cú pháp trong `package.json` — kiểm tra lại file này còn nguyên vẹn sau khi giải nén. |
| Không thấy mục **Artifacts** | Build chưa chạy xong hoặc đã lỗi ở bước trước — kiểm tra bước "Build portable .exe" có dấu ✅ chưa. |
| `git push` báo lỗi "Permission denied" hoặc yêu cầu mật khẩu liên tục | GitHub đã bỏ đăng nhập bằng mật khẩu thường; cần dùng Personal Access Token hoặc đăng nhập qua trình duyệt khi được hỏi. Xem: https://docs.github.com/en/authentication |
| Workflow không tự chạy sau khi push | Kiểm tra bạn đã push đúng nhánh `main` (không phải `master`) — nếu repo GitHub mặc định tạo nhánh `master`, đổi lệnh `git branch -M main` ở Bước 2 cho khớp, hoặc sửa `branches: [main]` trong `build.yml` thành `[master]`. |
| Actions bị vô hiệu hoá / báo "Workflows aren't running on this forked repository" | Vào tab **Actions** của repo, bấm nút xanh **"I understand my workflows, go ahead and enable them"**. |
