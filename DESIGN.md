---
name: ".NET Interview Practice"
description: "Không gian luyện phỏng vấn cho lập trình viên .NET"
colors:
  primary: "#4f46e5"
  primary-hover: "#4338ca"
  indigo-soft: "#eceefe"
  session-panel: "#4539c4"
  code-background: "#182339"
  text: "#0f172a"
  text-support: "#475569"
  page: "#f8fafc"
  surface: "#ffffff"
  border: "#e2e8f0"
  success: "#116044"
  warning: "#85511a"
  danger: "#b42337"
typography:
  headline:
    fontFamily: "Lexend Variable, Segoe UI, sans-serif"
    fontSize: "2rem"
    fontWeight: 640
    lineHeight: 1.28
    letterSpacing: "-0.032em"
  title:
    fontFamily: "Lexend Variable, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 640
    lineHeight: 1.28
  body:
    fontFamily: "Lexend Variable, Segoe UI, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.6
  code:
    fontFamily: "Consolas, SFMono-Regular, Liberation Mono, monospace"
    fontSize: "0.875rem"
    lineHeight: 1.65
rounded:
  badge: "6px"
  control: "8px"
  panel: "12px"
spacing:
  compact: "8px"
  control: "12px"
  section: "20px"
  outer: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    height: "41px"
    padding: "8px 12px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "#2d3954"
    rounded: "{rounded.control}"
    height: "41px"
    padding: "8px 12px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "#414b68"
    rounded: "{rounded.control}"
    height: "41px"
    padding: "8px 12px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    height: "41px"
    padding: "8px 12px"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "42px"
    padding: "8px 10px"
  active-nav:
    backgroundColor: "{colors.indigo-soft}"
    textColor: "#3833a9"
    rounded: "{rounded.control}"
    height: "43px"
  topic-badge:
    backgroundColor: "#e8edff"
    textColor: "#304eb5"
    rounded: "{rounded.badge}"
    padding: "4px 8px"
  content-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "22px"
---

# Design System · .NET Interview Practice

## Overview

Giao diện sáng cho công cụ học .NET. Bề mặt trắng giữ đề bài và nội dung đang viết dễ quét. Đoạn mã đi cùng đề ở nơi giúp người học bắt đầu thao tác.

## Colors

Indigo phục vụ thao tác chính và trạng thái được chọn. Màu nền slate nhạt phân biệt không gian làm việc với thanh điều hướng. Chip chủ đề và thông báo có nhãn chữ.

## Typography

Lexend Variable có tập ký tự tiếng Việt và Latin. Dùng cỡ body 16 px, headline 32 px với desktop và khoảng 25 px ở mobile. Đề bài dài giữ chiều ngang tối đa 72 ký tự tương đối. Dùng monospace cho đoạn mã và đồng hồ.

## Layout

Sidebar rộng 228 px trên desktop, thu gọn từ 860 px. Tại 670 px, các cột tự luyện và mock xếp dọc. Đề, editor và kết quả chuyển qua nhóm nút trong không gian làm bài. Nội dung editor xuống dòng theo khung.

## Elevation & Depth

Viền mảnh phân định panel và thanh điều hướng. Hộp thoại dùng shadow lệch nhẹ để nổi trên lớp backdrop. Chuyển trạng thái màu ở 140 ms và tôn trọng reduced motion.

## Shapes

Bo góc 12 px cho panel, 8 px cho nút và input, 6 px cho nhãn. Hành động chính trên mobile chừa chiều cao ít nhất 44 px.

## Components

Nút chính dùng tác vụ tạo thay đổi. Nút phụ dùng thao tác cạnh nội dung. Lỗi và đồng bộ bản nháp có nhãn trạng thái riêng. Icon Lucide dùng một trọng lượng nét trong từng nhóm. Dialog gốc quản lý focus và đóng bằng Escape.

## Do's and Don'ts

- Dùng nhãn chữ cùng màu trạng thái.
- Giữ focus thấy rõ trên cả bề mặt sáng và vùng bắt đầu luyện indigo.
- Giữ số liệu từ hoạt động đã lưu và hiện trạng thái trống khi chưa có dữ liệu.
