CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT, title_ar TEXT, title_en TEXT, city TEXT, mode TEXT,
  start_date TEXT, end_date TEXT, deadline TEXT, org TEXT, link TEXT,
  closed INTEGER DEFAULT 0, published INTEGER DEFAULT 1
);
-- جدول طلبات الفعاليات (submissions) يُنشأ تلقائيًا عند أول استخدام
