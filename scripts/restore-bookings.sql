-- Bookings restoration SQL
-- Total bookings found: 239

INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0001', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzouue0001wqtgvb7tzocu', a.id, '2025-01-10T13:00:00-08:00'::timestamp, 234, 170.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzouue0001wqtgvb7tzocu' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0002', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzouue0001wqtgvb7tzocu', a.id, '2025-02-07T12:00:00-08:00'::timestamp, 234, 170.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzouue0001wqtgvb7tzocu' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0003', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzd5a20001w6c20ykxw5el', a.id, '2025-02-11T14:00:00-08:00'::timestamp, 240, 324.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzd5a20001w6c20ykxw5el' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0004', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzd5a20001w6c20ykxw5el', a.id, '2025-03-11T12:00:00-07:00'::timestamp, 240, 324.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzd5a20001w6c20ykxw5el' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0005', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk0rilwt000c78nvcgdepshg', a.id, '2025-03-26T11:00:00-07:00'::timestamp, 240, 100.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk0rilwt000c78nvcgdepshg' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0006', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk5xju270006jkhmi0l4u0eb', a.id, '2025-04-19T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk5xju270006jkhmi0l4u0eb' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0007', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzlico00017gdbk1zk6ni9', a.id, '2025-04-24T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzlico00017gdbk1zk6ni9' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0008', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzyqkd0001ei5fero3c3ov', a.id, '2025-04-28T09:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzyqkd0001ei5fero3c3ov' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0009', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzd5a20001w6c20ykxw5el', a.id, '2025-05-01T08:30:00-07:00'::timestamp, 240, 324.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzd5a20001w6c20ykxw5el' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0010', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzouue0001wqtgvb7tzocu', a.id, '2025-05-02T12:00:00-07:00'::timestamp, 234, 170.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzouue0001wqtgvb7tzocu' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0011', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk5xju270006jkhmi0l4u0eb', a.id, '2025-05-17T10:00:00-07:00'::timestamp, 180, 175.0, 'COMPLETED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk5xju270006jkhmi0l4u0eb' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0012', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzlico00017gdbk1zk6ni9', a.id, '2025-05-22T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzlico00017gdbk1zk6ni9' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0013', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7acz5g000644i7dk0e05ba', a.id, '2025-05-27T09:30:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7acz5g000644i7dk0e05ba' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0014', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk0rilwt000c78nvcgdepshg', a.id, '2025-05-27T12:00:00-07:00'::timestamp, 180, 165.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk0rilwt000c78nvcgdepshg' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0015', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk4mefrm0001qa37futsiwh8', a.id, '2025-05-28T09:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk4mefrm0001qa37futsiwh8' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0016', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk4kv6p30001bv42u96i5b41', a.id, '2025-05-28T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk4kv6p30001bv42u96i5b41' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0017', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzd5a20001w6c20ykxw5el', a.id, '2025-05-29T08:30:00-07:00'::timestamp, 240, 324.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzd5a20001w6c20ykxw5el' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0018', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzyqkd0001ei5fero3c3ov', a.id, '2025-05-29T13:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzyqkd0001ei5fero3c3ov' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0019', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk4mefrm0001qa37futsiwh8', a.id, '2025-05-30T16:00:00-07:00'::timestamp, 45, 50.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk4mefrm0001qa37futsiwh8' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0020', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk4mefrm0001qa37futsiwh8', a.id, '2025-05-31T08:15:00-07:00'::timestamp, 60, 0.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk4mefrm0001qa37futsiwh8' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0021', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7agpkk0007guqc52bmj94b', a.id, '2025-05-31T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7agpkk0007guqc52bmj94b' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0022', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk5xs3xt00034ybq1x7eip70', a.id, '2025-05-31T14:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk5xs3xt00034ybq1x7eip70' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0023', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbsrylr0001gcwferokpkxs', a.id, '2025-06-11T11:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbsrylr0001gcwferokpkxs' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0024', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk77g7c400016ua4q0l82wif', a.id, '2025-06-13T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk77g7c400016ua4q0l82wif' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0025', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk5xju270006jkhmi0l4u0eb', a.id, '2025-06-14T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk5xju270006jkhmi0l4u0eb' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0026', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7agpkk0007guqc52bmj94b', a.id, '2025-06-20T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7agpkk0007guqc52bmj94b' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0027', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7acz5g000644i7dk0e05ba', a.id, '2025-06-24T09:30:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7acz5g000644i7dk0e05ba' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0028', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzlico00017gdbk1zk6ni9', a.id, '2025-06-24T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzlico00017gdbk1zk6ni9' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0029', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkdfje3n0001timsxlgqokez', a.id, '2025-06-25T09:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkdfje3n0001timsxlgqokez' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0030', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzyqkd0001ei5fero3c3ov', a.id, '2025-06-25T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzyqkd0001ei5fero3c3ov' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0031', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk4kv6p30001bv42u96i5b41', a.id, '2025-06-25T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk4kv6p30001bv42u96i5b41' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0032', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk0rilwt000c78nvcgdepshg', a.id, '2025-06-25T10:30:00-07:00'::timestamp, 240, 165.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk0rilwt000c78nvcgdepshg' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0033', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzd5a20001w6c20ykxw5el', a.id, '2025-06-26T08:30:00-07:00'::timestamp, 240, 324.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzd5a20001w6c20ykxw5el' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0034', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzouue0001wqtgvb7tzocu', a.id, '2025-06-27T12:00:00-07:00'::timestamp, 234, 170.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzouue0001wqtgvb7tzocu' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0035', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk5xs3xt00034ybq1x7eip70', a.id, '2025-06-28T14:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk5xs3xt00034ybq1x7eip70' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0036', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7a7yg9000344i77g9b0kj6', a.id, '2025-07-01T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7a7yg9000344i77g9b0kj6' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0037', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk4mefrm0001qa37futsiwh8', a.id, '2025-07-01T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk4mefrm0001qa37futsiwh8' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0038', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk35wmy10001y7ys2vb83au2', a.id, '2025-07-09T10:00:00-07:00'::timestamp, 390, 323.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk35wmy10001y7ys2vb83au2' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0039', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk0rilwt000c78nvcgdepshg', a.id, '2025-07-09T10:30:00-07:00'::timestamp, 240, 165.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk0rilwt000c78nvcgdepshg' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0040', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7ayjhj00012b5cjd1x333u', a.id, '2025-07-10T11:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7ayjhj00012b5cjd1x333u' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0041', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk77g7c400016ua4q0l82wif', a.id, '2025-07-11T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk77g7c400016ua4q0l82wif' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0042', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbsrylr0001gcwferokpkxs', a.id, '2025-07-11T16:30:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbsrylr0001gcwferokpkxs' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0043', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk5xju270006jkhmi0l4u0eb', a.id, '2025-07-12T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk5xju270006jkhmi0l4u0eb' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0044', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkdfje3n0001timsxlgqokez', a.id, '2025-07-16T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkdfje3n0001timsxlgqokez' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0045', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7plejy000a11lxscbsdmwo', a.id, '2025-07-16T10:00:00-07:00'::timestamp, 390, 375.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7plejy000a11lxscbsdmwo' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0046', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzlico00017gdbk1zk6ni9', a.id, '2025-07-17T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzlico00017gdbk1zk6ni9' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0047', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7agpkk0007guqc52bmj94b', a.id, '2025-07-18T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7agpkk0007guqc52bmj94b' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0048', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk5r3zuj000111pfauu4i2aq', a.id, '2025-07-19T09:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk5r3zuj000111pfauu4i2aq' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0049', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7auf6n0007ziax9hyz1yrg', a.id, '2025-07-19T11:00:00-07:00'::timestamp, 180, 350.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7auf6n0007ziax9hyz1yrg' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0050', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7ak34f000944i7ol5xokl9', a.id, '2025-07-19T15:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7ak34f000944i7ol5xokl9' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0051', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk0rilwt000c78nvcgdepshg', a.id, '2025-07-21T11:30:00-07:00'::timestamp, 240, 165.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk0rilwt000c78nvcgdepshg' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0052', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7ap8d80001ziaxr4svbksn', a.id, '2025-07-22T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7ap8d80001ziaxr4svbksn' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0053', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzyqkd0001ei5fero3c3ov', a.id, '2025-07-23T09:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzyqkd0001ei5fero3c3ov' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0054', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk4kv6p30001bv42u96i5b41', a.id, '2025-07-23T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk4kv6p30001bv42u96i5b41' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0055', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk35wmy10001y7ys2vb83au2', a.id, '2025-07-23T10:00:00-07:00'::timestamp, 240, 218.16, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk35wmy10001y7ys2vb83au2' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0056', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7acz5g000644i7dk0e05ba', a.id, '2025-07-24T10:30:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7acz5g000644i7dk0e05ba' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0057', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk4mefrm0001qa37futsiwh8', a.id, '2025-07-26T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk4mefrm0001qa37futsiwh8' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0058', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk5xs3xt00034ybq1x7eip70', a.id, '2025-07-26T15:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk5xs3xt00034ybq1x7eip70' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0059', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7of7du000111lxgklu9j5a', a.id, '2025-07-27T10:00:00-07:00'::timestamp, 144, 170.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7of7du000111lxgklu9j5a' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0060', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7ak34f000944i7ol5xokl9', a.id, '2025-07-29T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7ak34f000944i7ol5xokl9' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0061', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzd5a20001w6c20ykxw5el', a.id, '2025-07-31T08:00:00-07:00'::timestamp, 240, 324.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzd5a20001w6c20ykxw5el' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0062', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7plejy000a11lxscbsdmwo', a.id, '2025-08-01T09:00:00-07:00'::timestamp, 240, 225.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7plejy000a11lxscbsdmwo' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0063', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzouue0001wqtgvb7tzocu', a.id, '2025-08-01T12:00:00-07:00'::timestamp, 234, 170.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzouue0001wqtgvb7tzocu' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0064', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7a7yg9000344i77g9b0kj6', a.id, '2025-08-05T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7a7yg9000344i77g9b0kj6' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0065', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk35wmy10001y7ys2vb83au2', a.id, '2025-08-06T10:00:00-07:00'::timestamp, 240, 218.16, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk35wmy10001y7ys2vb83au2' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0066', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk77g7c400016ua4q0l82wif', a.id, '2025-08-08T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk77g7c400016ua4q0l82wif' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0067', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk5xju270006jkhmi0l4u0eb', a.id, '2025-08-09T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk5xju270006jkhmi0l4u0eb' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0068', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7agpkk0007guqc52bmj94b', a.id, '2025-08-12T09:00:00-07:00'::timestamp, 180, 175.0, 'COMPLETED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7agpkk0007guqc52bmj94b' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0069', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk4mefrm0001qa37futsiwh8', a.id, '2025-08-13T11:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk4mefrm0001qa37futsiwh8' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0070', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzlico00017gdbk1zk6ni9', a.id, '2025-08-14T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzlico00017gdbk1zk6ni9' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0071', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk0rilwt000c78nvcgdepshg', a.id, '2025-08-14T10:00:00-07:00'::timestamp, 240, 165.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk0rilwt000c78nvcgdepshg' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0072', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk5xs3xt00034ybq1x7eip70', a.id, '2025-08-15T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk5xs3xt00034ybq1x7eip70' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0073', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7plejy000a11lxscbsdmwo', a.id, '2025-08-15T10:00:00-07:00'::timestamp, 240, 225.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7plejy000a11lxscbsdmwo' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0074', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7auf6n0007ziax9hyz1yrg', a.id, '2025-08-15T14:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7auf6n0007ziax9hyz1yrg' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0075', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7ak34f000944i7ol5xokl9', a.id, '2025-08-16T15:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7ak34f000944i7ol5xokl9' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0076', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7ayjhj00012b5cjd1x333u', a.id, '2025-08-17T13:30:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7ayjhj00012b5cjd1x333u' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0077', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk5r3zuj000111pfauu4i2aq', a.id, '2025-08-18T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk5r3zuj000111pfauu4i2aq' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0078', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbsrylr0001gcwferokpkxs', a.id, '2025-08-19T11:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbsrylr0001gcwferokpkxs' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0079', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk4kv6p30001bv42u96i5b41', a.id, '2025-08-20T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk4kv6p30001bv42u96i5b41' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0080', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk35wmy10001y7ys2vb83au2', a.id, '2025-08-20T10:00:00-07:00'::timestamp, 240, 218.16, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk35wmy10001y7ys2vb83au2' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0081', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzd5a20001w6c20ykxw5el', a.id, '2025-08-21T08:30:00-07:00'::timestamp, 240, 324.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzd5a20001w6c20ykxw5el' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0082', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzyqkd0001ei5fero3c3ov', a.id, '2025-08-22T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzyqkd0001ei5fero3c3ov' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0083', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkdfje3n0001timsxlgqokez', a.id, '2025-08-23T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkdfje3n0001timsxlgqokez' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0084', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7of7du000111lxgklu9j5a', a.id, '2025-08-23T14:00:00-07:00'::timestamp, 144, 170.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7of7du000111lxgklu9j5a' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0085', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7ap8d80001ziaxr4svbksn', a.id, '2025-08-25T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7ap8d80001ziaxr4svbksn' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0086', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk35wmy10001y7ys2vb83au2', a.id, '2025-08-28T14:00:00-07:00'::timestamp, 240, 218.16, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk35wmy10001y7ys2vb83au2' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0087', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmkbzouue0001wqtgvb7tzocu', a.id, '2025-08-29T09:30:00-07:00'::timestamp, 234, 170.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmkbzouue0001wqtgvb7tzocu' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0088', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7ak34f000944i7ol5xokl9', a.id, '2025-09-02T15:30:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7ak34f000944i7ol5xokl9' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0089', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk35wmy10001y7ys2vb83au2', a.id, '2025-09-03T10:00:00-07:00'::timestamp, 240, 218.16, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk35wmy10001y7ys2vb83au2' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0090', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk0rilwt000c78nvcgdepshg', a.id, '2025-09-05T10:00:00-07:00'::timestamp, 240, 165.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk0rilwt000c78nvcgdepshg' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0091', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk5xs3xt00034ybq1x7eip70', a.id, '2025-09-05T13:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk5xs3xt00034ybq1x7eip70' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0092', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk5xju270006jkhmi0l4u0eb', a.id, '2025-09-06T14:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk5xju270006jkhmi0l4u0eb' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0093', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk35wmy10001y7ys2vb83au2', a.id, '2025-09-10T10:00:00-07:00'::timestamp, 240, 218.16, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk35wmy10001y7ys2vb83au2' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0094', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7auf6n0007ziax9hyz1yrg', a.id, '2025-09-11T12:30:00-07:00'::timestamp, 190, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7auf6n0007ziax9hyz1yrg' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0095', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7a7yg9000344i77g9b0kj6', a.id, '2025-09-12T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7a7yg9000344i77g9b0kj6' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0096', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7a2s5p0004guqcs3e5croo', a.id, '2025-09-13T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7a2s5p0004guqcs3e5croo' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0097', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7ayjhj00012b5cjd1x333u', a.id, '2025-09-14T13:30:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7ayjhj00012b5cjd1x333u' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0098', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk5r3zuj000111pfauu4i2aq', a.id, '2025-09-15T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk5r3zuj000111pfauu4i2aq' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0099', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7plejy000a11lxscbsdmwo', a.id, '2025-09-15T14:00:00-07:00'::timestamp, 240, 225.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7plejy000a11lxscbsdmwo' LIMIT 1
ON CONFLICT (id) DO NOTHING;
INSERT INTO "Booking" (id, "companyId", "userId", "clientId", "addressId", "scheduledDate", duration, price, status, "serviceType", "createdAt", "updatedAt")
SELECT 'restored_booking_0100', 'cmk0rbc6z000178nvcrlt1h3a', 'cmk0rbc78000378nvqhm3idx7', 'cmk7ap8d80001ziaxr4svbksn', a.id, '2025-09-16T10:00:00-07:00'::timestamp, 180, 175.0, 'SCHEDULED', 'STANDARD', NOW(), NOW()
FROM "Address" a WHERE a."clientId" = 'cmk7ap8d80001ziaxr4svbksn' LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Run: SELECT COUNT(*) FROM "Booking" WHERE "companyId" = 'cmk0rbc6z000178nvcrlt1h3a';
