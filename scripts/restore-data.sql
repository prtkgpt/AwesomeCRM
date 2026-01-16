-- Data Restoration SQL Script for Awesome Maids LLC
-- Run with: psql 'postgresql://neondb_owner:npg_Yz39qZgQfKTD@ep-icy-waterfall-a495ypod-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require' -f scripts/restore-data.sql

-- Company and User IDs (update if needed)
DO $$
DECLARE
    v_company_id TEXT := 'cmjz0bvdy0000hnly2pvx5u5f';
    v_user_id TEXT;
    v_address_id TEXT;
    v_client_id TEXT;
BEGIN
    -- Get an admin user for this company
    SELECT id INTO v_user_id FROM "User" WHERE "companyId" = v_company_id AND role IN ('OWNER', 'ADMIN') LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No admin user found for company %', v_company_id;
    END IF;

    RAISE NOTICE 'Using user ID: %', v_user_id;
    RAISE NOTICE 'Restoring 45 clients for Awesome Maids LLC...';

    -- Client 1: P Gupta
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkg63kgg0004ml9zmmixyomf') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkg63kgg0004ml9zmmixyomf', v_company_id, v_user_id, 'P Gupta', 'bizwithpg@gmail.com', '4085719370', '2026-01-16 00:55:59.824', NOW());
        RAISE NOTICE 'Restored: P Gupta';
    END IF;

    -- Client 2: Linda Dippel
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkg387sk0001ml9z2v3m301h') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkg387sk0001ml9z2v3m301h', v_company_id, v_user_id, 'Linda Dippel', NULL, '5552500779', '2026-01-15 23:35:37.844', NOW());
        RAISE NOTICE 'Restored: Linda Dippel';
    END IF;

    -- Client 3: Dale Evans
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkdfje3n0001timsxlgqokez') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkdfje3n0001timsxlgqokez', v_company_id, v_user_id, 'Dale Evans', NULL, '(408)608-4579', '2026-01-14 02:56:56.099', NOW());
        RAISE NOTICE 'Restored: Dale Evans';
    END IF;

    -- Client 4: Kathy Franks
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkbzyqkd0001ei5fero3c3ov') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkbzyqkd0001ei5fero3c3ov', v_company_id, v_user_id, 'Kathy Franks', NULL, '(559)269-3536', '2026-01-13 02:53:12.06', NOW());
        RAISE NOTICE 'Restored: Kathy Franks';
    END IF;

    -- Client 5: Jason Kawamoto
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkbzspp1000swqtg0qdycw7k') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkbzspp1000swqtg0qdycw7k', v_company_id, v_user_id, 'Jason Kawamoto', 'jkawamoto211@gmail.com', '(559)696-9269', '2026-01-13 02:48:30.997', NOW());
        RAISE NOTICE 'Restored: Jason Kawamoto';
    END IF;

    -- Client 6: Amiya Kumar Das
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkbzouue0001wqtgvb7tzocu') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkbzouue0001wqtgvb7tzocu', v_company_id, v_user_id, 'Amiya Kumar Das', 'amiya.appu1989@gmail.com', '(301)541-9589', '2026-01-13 02:45:31.045', NOW());
        RAISE NOTICE 'Restored: Amiya Kumar Das';
    END IF;

    -- Client 7: Virginia Vasquez
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkbzlico00017gdbk1zk6ni9') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkbzlico00017gdbk1zk6ni9', v_company_id, v_user_id, 'Virginia Vasquez', NULL, '(559)392-2503', '2026-01-13 02:42:54.888', NOW());
        RAISE NOTICE 'Restored: Virginia Vasquez';
    END IF;

    -- Client 8: Mary Moo
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkbzd5a20001w6c20ykxw5el') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkbzd5a20001w6c20ykxw5el', v_company_id, v_user_id, 'Mary Moo', 'eugeneit510@gmail.com', '(415)439-9839', '2026-01-13 02:36:24.697', NOW());
        RAISE NOTICE 'Restored: Mary Moo';
    END IF;

    -- Client 9: Alexandra Karpilow
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkbyji0n0003y7t2tofnjr8j') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkbyji0n0003y7t2tofnjr8j', v_company_id, v_user_id, 'Alexandra Karpilow', 'alex.karpilow@gmail.com', '(360)301-5847', '2026-01-13 02:13:21.527', NOW());
        RAISE NOTICE 'Restored: Alexandra Karpilow';
    END IF;

    -- Client 10: Simone Muller
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkbydnxt0003bxh1qmsp240u') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkbydnxt0003bxh1qmsp240u', v_company_id, v_user_id, 'Simone Muller', NULL, '(559) 960-7123', '2026-01-13 02:08:49.266', NOW());
        RAISE NOTICE 'Restored: Simone Muller';
    END IF;

    -- Client 11: Tony Abi-Rached
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkby7p310001u7rls6cy94ur') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkby7p310001u7rls6cy94ur', v_company_id, v_user_id, 'Tony Abi-Rached', NULL, '(559)355-3316', '2026-01-13 02:04:10.812', NOW());
        RAISE NOTICE 'Restored: Tony Abi-Rached';
    END IF;

    -- Client 12: David Garcia
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkby34gf000188p2qe7y2v1w') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkby34gf000188p2qe7y2v1w', v_company_id, v_user_id, 'David Garcia', NULL, '(408)656-4199', '2026-01-13 02:00:37.455', NOW());
        RAISE NOTICE 'Restored: David Garcia';
    END IF;

    -- Client 13: Suzanne Nguyen
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkbxxxa40001s33jzu21df5t') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkbxxxa40001s33jzu21df5t', v_company_id, v_user_id, 'Suzanne Nguyen', NULL, '(408)569-0956', '2026-01-13 01:56:34.876', NOW());
        RAISE NOTICE 'Restored: Suzanne Nguyen';
    END IF;

    -- Client 14: Timothy Anderson
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkbu4flr0001velhp636jxtz') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkbu4flr0001velhp636jxtz', v_company_id, v_user_id, 'Timothy Anderson', NULL, '(559)317-8953', '2026-01-13 00:09:40.095', NOW());
        RAISE NOTICE 'Restored: Timothy Anderson';
    END IF;

    -- Client 15: Barbara Thompson
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkbsrylr0001gcwferokpkxs') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkbsrylr0001gcwferokpkxs', v_company_id, v_user_id, 'Barbara Thompson', NULL, '(559)960-0850', '2026-01-12 23:31:58.574', NOW());
        RAISE NOTICE 'Restored: Barbara Thompson';
    END IF;

    -- Client 16: Elizabeth Nguyen
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmkbjxkfo0001z4k0fv7v595d') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmkbjxkfo0001z4k0fv7v595d', v_company_id, v_user_id, 'Elizabeth Nguyen', NULL, '(510)825-4177', '2026-01-12 19:24:23.603', NOW());
        RAISE NOTICE 'Restored: Elizabeth Nguyen';
    END IF;

    -- Client 17: Martha Olmos
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7pvq2o000e11lxevhdn4is') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7pvq2o000e11lxevhdn4is', v_company_id, v_user_id, 'Martha Olmos', NULL, '(559)696-5875', '2026-01-10 02:59:50.593', NOW());
        RAISE NOTICE 'Restored: Martha Olmos';
    END IF;

    -- Client 18: Akchhara Pandey
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7plejy000a11lxscbsdmwo') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7plejy000a11lxscbsdmwo', v_company_id, v_user_id, 'Akchhara Pandey', 'akchharaa@gmail.com', '(510)902-9495', '2026-01-10 02:51:49.102', NOW());
        RAISE NOTICE 'Restored: Akchhara Pandey';
    END IF;

    -- Client 19: Maria Duran
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7pimly000511lxffpg3nic') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7pimly000511lxffpg3nic', v_company_id, v_user_id, 'Maria Duran', NULL, '(209)621-4324', '2026-01-10 02:49:39.574', NOW());
        RAISE NOTICE 'Restored: Maria Duran';
    END IF;

    -- Client 20: Arnab Paul
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7of7du000111lxgklu9j5a') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7of7du000111lxgklu9j5a', v_company_id, v_user_id, 'Arnab Paul', 'pa.arnab@gmail.com', '(408)646-5170', '2026-01-10 02:19:00.257', NOW());
        RAISE NOTICE 'Restored: Arnab Paul';
    END IF;

    -- Client 21: Karen Nunn
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7ayjhj00012b5cjd1x333u') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7ayjhj00012b5cjd1x333u', v_company_id, v_user_id, 'Karen Nunn', NULL, '(559)304-9242', '2026-01-09 20:02:07.782', NOW());
        RAISE NOTICE 'Restored: Karen Nunn';
    END IF;

    -- Client 22: Kathleen Petroff
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7awgxm0001n6dqrwgvgz0a') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7awgxm0001n6dqrwgvgz0a', v_company_id, v_user_id, 'Kathleen Petroff', NULL, '(559)614-1695', '2026-01-09 20:00:31.162', NOW());
        RAISE NOTICE 'Restored: Kathleen Petroff';
    END IF;

    -- Client 23: Loretta Rehbein
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7auf6n0007ziax9hyz1yrg') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7auf6n0007ziax9hyz1yrg', v_company_id, v_user_id, 'Loretta Rehbein', NULL, '(559)298-7636', '2026-01-09 19:58:55.584', NOW());
        RAISE NOTICE 'Restored: Loretta Rehbein';
    END IF;

    -- Client 24: Joy Moore
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7asc5h0004ziax5u58fqb2') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7asc5h0004ziax5u58fqb2', v_company_id, v_user_id, 'Joy Moore', NULL, '(559)313-0110', '2026-01-09 19:57:18.341', NOW());
        RAISE NOTICE 'Restored: Joy Moore';
    END IF;

    -- Client 25: Kimberly Troxel
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7ap8d80001ziaxr4svbksn') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7ap8d80001ziaxr4svbksn', v_company_id, v_user_id, 'Kimberly Troxel', NULL, '(559)284-4648', '2026-01-09 19:54:53.468', NOW());
        RAISE NOTICE 'Restored: Kimberly Troxel';
    END IF;

    -- Client 26: Richard Gaxiola
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7am368000aguqc9jfrrpul') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7am368000aguqc9jfrrpul', v_company_id, v_user_id, 'Richard Gaxiola', NULL, '(408)593-3097', '2026-01-09 19:52:26.769', NOW());
        RAISE NOTICE 'Restored: Richard Gaxiola';
    END IF;

    -- Client 27: Helen Loy
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7ak34f000944i7ol5xokl9') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7ak34f000944i7ol5xokl9', v_company_id, v_user_id, 'Helen Loy', NULL, '(559)770-5768', '2026-01-09 19:50:53.392', NOW());
        RAISE NOTICE 'Restored: Helen Loy';
    END IF;

    -- Client 28: Cynthia Howell
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7agpkk0007guqc52bmj94b') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7agpkk0007guqc52bmj94b', v_company_id, v_user_id, 'Cynthia Howell', NULL, '(559)301-3951', '2026-01-09 19:48:15.86', NOW());
        RAISE NOTICE 'Restored: Cynthia Howell';
    END IF;

    -- Client 29: Laniece Grijalva
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7acz5g000644i7dk0e05ba') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7acz5g000644i7dk0e05ba', v_company_id, v_user_id, 'Laniece Grijalva', NULL, '(951)440-5317', '2026-01-09 19:45:21.652', NOW());
        RAISE NOTICE 'Restored: Laniece Grijalva';
    END IF;

    -- Client 30: Chin Lu
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7a7yg9000344i77g9b0kj6') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7a7yg9000344i77g9b0kj6', v_company_id, v_user_id, 'Chin Lu', NULL, '(510)928-1769', '2026-01-09 19:41:27.466', NOW());
        RAISE NOTICE 'Restored: Chin Lu';
    END IF;

    -- Client 31: Patricia Urrutia
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk7a2s5p0004guqcs3e5croo') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk7a2s5p0004guqcs3e5croo', v_company_id, v_user_id, 'Patricia Urrutia', NULL, '(559)705-3223', '2026-01-09 19:37:26.03', NOW());
        RAISE NOTICE 'Restored: Patricia Urrutia';
    END IF;

    -- Client 32: Barbara Anderson
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk79zvao0001guqc06n3sew1') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk79zvao0001guqc06n3sew1', v_company_id, v_user_id, 'Barbara Anderson', NULL, '(559)312-0165', '2026-01-09 19:35:10.127', NOW());
        RAISE NOTICE 'Restored: Barbara Anderson';
    END IF;

    -- Client 33: Doroteo Mejia
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk77g7c400016ua4q0l82wif') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk77g7c400016ua4q0l82wif', v_company_id, v_user_id, 'Doroteo Mejia', NULL, '559-704-6944', '2026-01-09 18:23:53.38', NOW());
        RAISE NOTICE 'Restored: Doroteo Mejia';
    END IF;

    -- Client 34: Linda Rosado Mendez
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk67p5xg0001gej6fbzte2z4') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk67p5xg0001gej6fbzte2z4', v_company_id, v_user_id, 'Linda Rosado Mendez', 'cleanrosadolinda@gmial.com', '5592940580', '2026-01-09 01:43:05.283', NOW());
        RAISE NOTICE 'Restored: Linda Rosado Mendez';
    END IF;

    -- Client 35: Rosario Pinedo
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk5xs3xt00034ybq1x7eip70') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk5xs3xt00034ybq1x7eip70', v_company_id, v_user_id, 'Rosario Pinedo', NULL, '559-313-3551', '2026-01-08 21:05:26.513', NOW());
        RAISE NOTICE 'Restored: Rosario Pinedo';
    END IF;

    -- Client 36: Daniel Flores
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk5xju270006jkhmi0l4u0eb') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk5xju270006jkhmi0l4u0eb', v_company_id, v_user_id, 'Daniel Flores', NULL, '5594548424', '2026-01-08 20:59:00.463', NOW());
        RAISE NOTICE 'Restored: Daniel Flores';
    END IF;

    -- Client 37: Lorraine Rivera
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk5r3zuj000111pfauu4i2aq') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk5r3zuj000111pfauu4i2aq', v_company_id, v_user_id, 'Lorraine Rivera', 'helperlorraine@gmail.com', '(408)806-4921', '2026-01-08 17:58:43.771', NOW());
        RAISE NOTICE 'Restored: Lorraine Rivera';
    END IF;

    -- Client 38: Susan Ayers
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk4mefrm0001qa37futsiwh8') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk4mefrm0001qa37futsiwh8', v_company_id, v_user_id, 'Susan Ayers', 'carecaoncierge+45@thehelperbees.com', '775-857-9645', '2026-01-07 22:59:06.705', NOW());
        RAISE NOTICE 'Restored: Susan Ayers';
    END IF;

    -- Client 39: Rosa Bailon
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk4kv6p30001bv42u96i5b41') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk4kv6p30001bv42u96i5b41', v_company_id, v_user_id, 'Rosa Bailon', 'careconciergeadvisorsss@thehelperbees.com', '619-251-1181', '2026-01-07 22:16:08.87', NOW());
        RAISE NOTICE 'Restored: Rosa Bailon';
    END IF;

    -- Client 40: Mark Condell
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk3dxnis0004frucnxs1q3vn') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk3dxnis0004frucnxs1q3vn', v_company_id, v_user_id, 'Mark Condell', NULL, '2096267675', '2026-01-07 02:14:20.5', NOW());
        RAISE NOTICE 'Restored: Mark Condell';
    END IF;

    -- Client 41: Raghbir Dindral
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk3d4g4h000baazpd0m1tagm') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk3d4g4h000baazpd0m1tagm', v_company_id, v_user_id, 'Raghbir Dindral', 'dindral@awesomemaids.com', '209-480-3916', '2026-01-07 01:51:37.889', NOW());
        RAISE NOTICE 'Restored: Raghbir Dindral';
    END IF;

    -- Client 42: Jessica Smith
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk35wmy10001y7ys2vb83au2') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk35wmy10001y7ys2vb83au2', v_company_id, v_user_id, 'Jessica Smith', 'theoriginalsock@gmail.com', '630-310-2999', '2026-01-06 22:29:36.168', NOW());
        RAISE NOTICE 'Restored: Jessica Smith';
    END IF;

    -- Client 43: Tameem Rahel
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk253q9y00012qwinzgxlpgt') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk253q9y00012qwinzgxlpgt', v_company_id, v_user_id, 'Tameem Rahel', NULL, '7024166330', '2026-01-06 05:19:21.285', NOW());
        RAISE NOTICE 'Restored: Tameem Rahel';
    END IF;

    -- Client 44: Mark Condell (duplicate)
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk249ptb00015jl62xmor980') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk249ptb00015jl62xmor980', v_company_id, v_user_id, 'Mark Condell', NULL, '2096267675', '2026-01-06 04:56:01.006', NOW());
        RAISE NOTICE 'Restored: Mark Condell (2)';
    END IF;

    -- Client 45: Jaya Singhal
    IF NOT EXISTS (SELECT 1 FROM "Client" WHERE id = 'cmk0rilwt000c78nvcgdepshg') THEN
        INSERT INTO "Client" (id, "companyId", "userId", name, email, phone, "createdAt", "updatedAt")
        VALUES ('cmk0rilwt000c78nvcgdepshg', v_company_id, v_user_id, 'Jaya Singhal', 'singhaljaya@gmail.com', '4088380687', '2026-01-05 06:11:14.669', NOW());
        RAISE NOTICE 'Restored: Jaya Singhal';
    END IF;

    RAISE NOTICE '============================================';
    RAISE NOTICE 'Client restoration complete!';
    RAISE NOTICE '============================================';

END $$;

-- Count results
SELECT 'Clients restored' as status, COUNT(*) as count FROM "Client"
WHERE id IN (
    'cmkg63kgg0004ml9zmmixyomf', 'cmkg387sk0001ml9z2v3m301h', 'cmkdfje3n0001timsxlgqokez',
    'cmkbzyqkd0001ei5fero3c3ov', 'cmkbzspp1000swqtg0qdycw7k', 'cmkbzouue0001wqtgvb7tzocu',
    'cmkbzlico00017gdbk1zk6ni9', 'cmkbzd5a20001w6c20ykxw5el', 'cmkbyji0n0003y7t2tofnjr8j',
    'cmkbydnxt0003bxh1qmsp240u', 'cmkby7p310001u7rls6cy94ur', 'cmkby34gf000188p2qe7y2v1w',
    'cmkbxxxa40001s33jzu21df5t', 'cmkbu4flr0001velhp636jxtz', 'cmkbsrylr0001gcwferokpkxs',
    'cmkbjxkfo0001z4k0fv7v595d', 'cmk7pvq2o000e11lxevhdn4is', 'cmk7plejy000a11lxscbsdmwo',
    'cmk7pimly000511lxffpg3nic', 'cmk7of7du000111lxgklu9j5a', 'cmk7ayjhj00012b5cjd1x333u',
    'cmk7awgxm0001n6dqrwgvgz0a', 'cmk7auf6n0007ziax9hyz1yrg', 'cmk7asc5h0004ziax5u58fqb2',
    'cmk7ap8d80001ziaxr4svbksn', 'cmk7am368000aguqc9jfrrpul', 'cmk7ak34f000944i7ol5xokl9',
    'cmk7agpkk0007guqc52bmj94b', 'cmk7acz5g000644i7dk0e05ba', 'cmk7a7yg9000344i77g9b0kj6',
    'cmk7a2s5p0004guqcs3e5croo', 'cmk79zvao0001guqc06n3sew1', 'cmk77g7c400016ua4q0l82wif',
    'cmk67p5xg0001gej6fbzte2z4', 'cmk5xs3xt00034ybq1x7eip70', 'cmk5xju270006jkhmi0l4u0eb',
    'cmk5r3zuj000111pfauu4i2aq', 'cmk4mefrm0001qa37futsiwh8', 'cmk4kv6p30001bv42u96i5b41',
    'cmk3dxnis0004frucnxs1q3vn', 'cmk3d4g4h000baazpd0m1tagm', 'cmk35wmy10001y7ys2vb83au2',
    'cmk253q9y00012qwinzgxlpgt', 'cmk249ptb00015jl62xmor980', 'cmk0rilwt000c78nvcgdepshg'
);
