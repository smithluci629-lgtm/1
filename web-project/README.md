# Hướng Dẫn Sử Dụng Web Đã Tách File

## 📁 Cấu Trúc Thư Mục

```
web-project/
├── index.html          # File HTML chính (chỉ chứa cấu trúc)
├── css/
│   └── style.css      # Tất cả CSS styling
└── js/
    └── main.js        # Tất cả JavaScript logic
```

## 🚀 Cách Sử Dụng

### Cách 1: Mở trực tiếp
1. Giải nén file zip
2. Mở file `index.html` bằng trình duyệt
3. Xong!

### Cách 2: Dùng Live Server (Khuyên dùng)
1. Cài VS Code extension "Live Server"
2. Right-click vào `index.html`
3. Chọn "Open with Live Server"

## ✅ Ưu Điểm Của Cấu Trúc Mới

### 1. **Bảo mật tốt hơn**
- File JS riêng → dễ minify/obfuscate code
- Có thể thêm file `.htaccess` để bảo vệ
- Dễ kiểm soát quyền truy cập

### 2. **Tốc độ tải trang**
- Browser cache riêng từng file
- Chỉ tải lại file thay đổi
- Giảm bandwidth

### 3. **Dễ bảo trì**
- Tìm code nhanh hơn
- Sửa lỗi dễ dàng
- Nhiều người làm việc cùng lúc

### 4. **Chuyên nghiệp**
- Cấu trúc rõ ràng
- Dễ scale up
- Theo chuẩn web development

## 📝 Cách Sửa Code

### Sửa Giao Diện (CSS)
1. Mở file `css/style.css`
2. Tìm class cần sửa
3. Thay đổi và save
4. Refresh trình duyệt

### Sửa Chức Năng (JavaScript)
1. Mở file `js/main.js`
2. Tìm function cần sửa
3. Thay đổi và save
4. Refresh trình duyệt

### Sửa Nội Dung (HTML)
1. Mở file `index.html`
2. Tìm phần cần sửa
3. Thay đổi và save
4. Refresh trình duyệt

## 🔒 Bảo Mật API Key

**QUAN TRỌNG:** Trong file `js/main.js` có chứa:
- Supabase URL
- Supabase API Key

Nếu deploy lên server thật, bạn nên:
1. Tạo file `js/config.js` riêng cho các API keys
2. Thêm `config.js` vào `.gitignore`
3. Dùng environment variables

Ví dụ tạo `js/config.js`:
```javascript
export const CONFIG = {
    SUPABASE_URL: 'your-url-here',
    SUPABASE_KEY: 'your-key-here'
};
```

Sau đó import vào `main.js`:
```javascript
import { CONFIG } from './config.js';
const SUPABASE_URL = CONFIG.SUPABASE_URL;
```

## 🌐 Deploy Lên Server

### GitHub Pages (Miễn phí)
1. Tạo repo GitHub mới
2. Upload toàn bộ folder
3. Settings → Pages → chọn branch
4. Xong!

### Netlify (Miễn phí)
1. Kéo thả folder vào netlify.com
2. Xong!

### Hosting thường
1. Upload folder qua FTP
2. Trỏ domain về folder
3. Xong!

## 💡 Tips

1. **Luôn backup** trước khi sửa code
2. **Test trên localhost** trước khi deploy
3. **Dùng browser DevTools** (F12) để debug
4. **Minify CSS/JS** trước khi deploy production

## ❓ Troubleshooting

### Lỗi: File CSS/JS không load
- Kiểm tra đường dẫn file (phải đúng cấu trúc folder)
- Xem Console trong DevTools (F12)

### Lỗi: CORS khi load local
- Dùng Live Server thay vì mở file trực tiếp
- Hoặc disable CORS trong browser (chỉ dùng khi dev)

---

**Chúc bạn code vui! 🎉**
