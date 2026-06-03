-- Seed data for Finanzas Familiares
-- Generated from the original Excel: GastosMensuales, Resumen, Planificación
-- Excludes calculated fields (cards.disponible = credito - pendiente)

-- Clean existing data (order matters for foreign keys)
DELETE FROM expenses;
DELETE FROM balances;
DELETE FROM cards;
DELETE FROM loans;
DELETE FROM months;
DELETE FROM entities;

-- ============================================================
-- ENTITIES
-- ============================================================
INSERT INTO entities (id, name, color) VALUES
('62f62687-ac9e-44f5-b286-51a40dbefab2', 'CAIXABANK', '#0ea5e9'),
('44438461-b359-48e8-b0af-4370f68038ae', 'ING', '#f97316');

-- ============================================================
-- MONTHS
-- ============================================================
INSERT INTO months (id, name, status, created_at) VALUES
('d84c30c3-9b81-4328-9ec1-1bd43d8339ab', 'Junio 2026', 'open', '2026-06-03T17:47:24.239835+00:00');

-- ============================================================
-- EXPENSES (Junio 2026)
-- ============================================================
INSERT INTO expenses (id, month_id, dia, concepto, importe, entidad, estado) VALUES

-- Día 1
('a6bc0a80-0bb3-4f3d-b8dd-6f466cf2f892', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 1, 'Retenido', 1319.00, 'ING', 'X'),
('e52a037d-e831-417c-af83-679f8b665107', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 1, 'Alquiler piso', 518.52, 'CAIXABANK', 'P'),
('4d265a8b-f079-4352-a91b-68b6d82fcbe3', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 1, 'Préstamo Caixabank (último)', 120.71, 'CAIXABANK', 'P'),
('b59027a8-53ab-41e0-bc82-6cd54c54c826', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 1, 'Paga Semanal Adri', 160.00, 'CAIXABANK', 'X'),
('cb29b808-742c-406b-b704-06ebb0dba088', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 1, 'Gimnasio Adri', 35.00, 'CAIXABANK', 'P'),
('79c75ca3-e4fa-4c82-a679-86d296f18f87', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 1, 'Seguro Coche Abril (Anual)', 158.30, 'CAIXABANK', '-'),
('471cb411-9dee-4aa3-ad1c-666e8f0a8c8a', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 1, 'Caixabank Paym (Último)', 156.95, 'CAIXABANK', 'P'),
('d632abcb-b95d-4e79-87a0-fa270f5d8808', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 1, 'Préstamo Carrefour 2021', 148.30, 'CAIXABANK', 'P'),
('856abbe3-2156-49a0-8398-211c3201eb08', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 1, 'Carrefour Crédito (Último)', 106.85, 'CAIXABANK', 'P'),
('fdcfbfa8-6acb-4cf7-b918-93255267f99d', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 1, 'Comunidad', 87.50, 'CAIXABANK', 'P'),
('3303761b-9ced-4a83-8f15-3d554f6889f8', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 1, 'Visa Classic (Último)', 64.03, 'CAIXABANK', 'P'),
('406ce7f5-fac4-4ec5-a2ae-01f64deb3046', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 1, 'Endesa Gas (Bimensual)', 67.08, 'ING', 'P'),

-- Día 2
('0d4c13e2-fc58-41d1-abef-63f1edeb699c', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 2, 'Spotify DUO', 16.99, 'ING', 'P'),
('c702315d-06e5-4e9a-b17c-a1420ac01822', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 2, 'La Alianza', 50.60, 'CAIXABANK', 'P'),

-- Día 3
('15b28ee6-ac9d-4dd3-8ac1-250653ab5d49', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 3, 'Préstamo ING', 350.17, 'ING', 'P'),
('a528a44f-765a-4ac9-9a5e-463e91885299', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 3, 'Seguro Mayo (Anual)', 153.30, 'CAIXABANK', '-'),

-- Día 4
('316f654c-115d-484c-99ba-b876f1b6e8b1', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 4, 'ITV (Anual-Mayo)', 30.36, 'ING', '-'),

-- Día 5
('a7059847-e73e-4478-b06d-3b0a1a0ddf66', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 5, 'Mastercard ING', 1524.69, 'ING', 'X'),
('4413b563-5e98-4e81-b437-265c7c5fd0df', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 5, 'Revisión coche (Anual) Mayo', 200.79, 'CAIXABANK', '-'),

-- Día 6
('9cd24564-5ead-4c5f-bacb-5adce2be92d4', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 6, 'Microondas (Último)', 19.23, 'CAIXABANK', 'X'),

-- Día 7
('42f5147c-4306-4552-94bd-787eef7f52c4', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 7, 'Tren', 20.00, 'CAIXABANK', 'X'),
('4c98142e-ea1b-4364-89ce-ba366b9f1822', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 7, 'O2', 71.00, 'CAIXABANK', 'X'),

-- Día 9
('0a1ed2da-20b2-4afe-94e2-3dcbb82d0caf', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 9, 'Microsoft 365', 13.00, 'CAIXABANK', 'X'),
('ff353a61-1a2c-46ab-983c-15703174e17b', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 9, 'Google One', 2.99, 'ING', 'X'),

-- Día 13
('b3d6e4e3-2713-4033-9431-43197c6d3ae1', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 13, 'Telefónica Móviles', 34.40, 'CAIXABANK', 'X'),

-- Día 18
('1a89f64d-ad3d-4041-9dff-90c3292849a8', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 18, 'Luminar Neo Anual (Abril)', 59.50, 'ING', '-'),

-- Día 19
('e9eec868-81e8-4964-9806-9b3939ebdfa8', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 19, 'Seguro Vida Rafa', 48.13, 'ING', 'X'),

-- Día 22
('1051108c-7f63-4725-8422-82b99d2b1cea', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 22, 'AnyList (Anual)', 8.88, 'ING', '-'),

-- Día 24
('6a3cc935-0ca4-42e5-8cb4-24710f838492', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 24, 'Endesa Electricidad', 69.38, 'ING', 'X'),
('cd1c1fb7-a3d2-4808-94ad-7d4c106b329c', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 24, 'HBO Max', 7.99, 'ING', 'X'),

-- Día 27
('84f54252-d200-4f6a-b2b6-7c5244b2ae4a', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 27, 'Amazon Prime (Anual)', 49.90, 'CAIXABANK', '-'),

-- Día 30
('d1cd8508-5959-41b8-809d-14a248989876', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 30, 'Retenido', 2455.36, 'CAIXABANK', 'X');

-- ============================================================
-- LOANS (excluding pendiente which is calculated: cuota * faltan)
-- ============================================================
INSERT INTO loans (id, entidad, capital_inicial, total_a_pagar, fecha_inicial, fecha_final, cuotas, interes, cuota, faltan) VALUES
('97ff3abe-0b6e-4c6d-88a6-0264f8d26df7', 'Xiaomi Pad 5', 154.71, 154.71, '2024-11-22', '2026-10-22', 24, 0.00, 7.60, 4),
('d44ff655-6ed1-4e72-b149-ee8cdfd4f3fb', 'Oppo Find X5', 450.00, 450.00, '2024-09-22', '2027-08-25', 36, 0.00, 16.50, 14),
('14941722-8e3a-42a0-a510-c30d6b9f6d90', 'Oppo Find X5 Lite', 275.45, 275.45, '2024-09-22', '2027-08-25', 36, 0.00, 10.30, 14),
('c60c6a83-cdf6-4bb7-bb7c-cbb34ea0cdaa', 'Carrefour 2', 10000.00, 10000.00, '2021-04-01', '2029-03-01', 96, 10.71, 148.30, 32),
('d0ff63a5-b422-4ffd-b50b-00121b5cfb5b', 'ING', 22500.00, 22500.00, '2023-10-03', '2030-09-03', 84, 7.99, 350.17, 51);

-- ============================================================
-- CARDS (excluding disponible which is calculated: credito - pendiente)
-- ============================================================
INSERT INTO cards (id, tarjeta, credito, cuota, pendiente) VALUES
('f9202866-938c-4d07-9096-6aed48504483', 'Carrefour Contado', 1100.00, 0.00, 0.00),
('439aa5a1-ccfd-4973-924a-1d95742b5590', 'Carrefour Crédito', 3000.00, 0.00, 0.00),
('c54e3177-f01e-48b5-8984-27558d82482e', 'Visa CAIXABANK', 3000.00, 544.64, 2455.36),
('203af3b1-4a41-4a1b-bfb3-c2c71457a4bb', 'Visa ING', 2000.00, 1454.79, 1502.96);

-- ============================================================
-- BALANCES (Junio 2026)
-- ============================================================
INSERT INTO balances (id, month_id, caixabank, hucha, ing_nomina, ing_naranja) VALUES
('68802141-7650-4f6c-a726-ed8a7aeb2daa', 'd84c30c3-9b81-4328-9ec1-1bd43d8339ab', 3955.75, 500.00, 6108.86, 10020.19);
