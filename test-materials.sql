-- Bilişim Malzemeleri Depo Takip Sistemi - Örnek Test Verileri (Materials)
-- Bu scripti Supabase SQL Editor'de çalıştırarak envanterinizi doldurabilirsiniz.

INSERT INTO materials (name, type, brand_model, quantity, specifications, barcode)
VALUES 
('Dell OptiPlex 7090 Tower', 'Masaüstü Bilgisayar', 'Dell OptiPlex 7090', 15, '{"işlemci": "i7-11700", "ram": "16GB", "ssd": "512GB"}', 'TR-PC-001'),
('HP ProBook 450 G8', 'Dizüstü Bilgisayar', 'HP ProBook 450', 10, '{"işlemci": "i5-1135G7", "ram": "8GB", "ssd": "256GB"}', 'TR-LP-001'),
('MacBook Pro 14"', 'Dizüstü Bilgisayar', 'Apple M2 Pro', 5, '{"işlemci": "M2 Pro", "ram": "16GB", "ssd": "512GB"}', 'TR-LP-002'),
('Samsung 27" CF390', 'Ekran', 'Samsung LC27F390FHMXUF', 20, '{"boyut": "27 inç", "çözünürlük": "1920x1080", "panel": "VA"}', 'TR-MON-001'),
('Dell 24" P2422H', 'Ekran', 'Dell P2422H', 25, '{"boyut": "24 inç", "çözünürlük": "1920x1080", "panel": "IPS"}', 'TR-MON-002'),
('HP LaserJet Pro M404dn', 'Yazıcı', 'HP LaserJet Pro M404dn', 8, '{"tip": "Lazer", "renk": "Siyah-Beyaz", "bağlantı": "Network"}', 'TR-PRT-001'),
('Zebra ZD220', 'Barkod Yazıcı', 'Zebra ZD220t', 4, '{"tip": "Termal Transfer", "çözünürlük": "203 dpi"}', 'TR-BPRT-001'),
('Logitech MK270 Set', 'Klavye, Mouse', 'Logitech MK270', 50, '{"tip": "Kablosuz", "dil": "Türkçe Q"}', 'TR-ACC-001'),
('Logitech C922 Pro', 'Diğer', 'Logitech C922', 12, '{"tip": "Webcam", "çözünürlük": "1080p 30fps"}', 'TR-ACC-002'),
('Cisco C9200L-24T-4G', 'Diğer', 'Cisco Catalyst 9200L', 3, '{"tip": "Switch", "port": "24 Port", "hız": "1G"}', 'TR-NET-001'),
('Canon CanoScan LiDE 300', 'Tarayıcı', 'Canon LiDE 300', 6, '{"tip": "Flatbed", "çözünürlük": "2400x2400 dpi"}', 'TR-SCN-001'),
('Asus Zenbook 14', 'Dizüstü Bilgisayar', 'Asus UX3402', 7, '{"işlemci": "i7-1260P", "ram": "16GB", "ssd": "512GB OLED"}', 'TR-LP-003');
