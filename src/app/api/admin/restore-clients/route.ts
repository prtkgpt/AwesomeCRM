import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// All 45 clients to restore
const clientsToRestore = [
  { id: 'cmkg63kgg0004ml9zmmixyomf', name: 'P Gupta', email: 'bizwithpg@gmail.com', phone: '4085719370', createdAt: new Date('2026-01-16 00:55:59.824') },
  { id: 'cmkg387sk0001ml9z2v3m301h', name: 'Linda Dippel', email: '', phone: '5552500779', createdAt: new Date('2026-01-15 23:35:37.844') },
  { id: 'cmkdfje3n0001timsxlgqokez', name: 'Dale Evans', email: '', phone: '(408)608-4579', createdAt: new Date('2026-01-14 02:56:56.099') },
  { id: 'cmkbzyqkd0001ei5fero3c3ov', name: 'Kathy Franks', email: '', phone: '(559)269-3536', createdAt: new Date('2026-01-13 02:53:12.06') },
  { id: 'cmkbzspp1000swqtg0qdycw7k', name: 'Jason Kawamoto', email: 'jkawamoto211@gmail.com', phone: '(559)696-9269', createdAt: new Date('2026-01-13 02:48:30.997') },
  { id: 'cmkbzouue0001wqtgvb7tzocu', name: 'Amiya Kumar Das', email: 'amiya.appu1989@gmail.com', phone: '(301)541-9589', createdAt: new Date('2026-01-13 02:45:31.045') },
  { id: 'cmkbzlico00017gdbk1zk6ni9', name: 'Virginia Vasquez', email: '', phone: '(559)392-2503', createdAt: new Date('2026-01-13 02:42:54.888') },
  { id: 'cmkbzd5a20001w6c20ykxw5el', name: 'Mary Moo', email: 'eugeneit510@gmail.com', phone: '(415)439-9839', createdAt: new Date('2026-01-13 02:36:24.697') },
  { id: 'cmkbyji0n0003y7t2tofnjr8j', name: 'Alexandra Karpilow', email: 'alex.karpilow@gmail.com', phone: '(360)301-5847', createdAt: new Date('2026-01-13 02:13:21.527') },
  { id: 'cmkbydnxt0003bxh1qmsp240u', name: 'Simone Muller', email: '', phone: '(559) 960-7123', createdAt: new Date('2026-01-13 02:08:49.266') },
  { id: 'cmkby7p310001u7rls6cy94ur', name: 'Tony Abi-Rached', email: '', phone: '(559)355-3316', createdAt: new Date('2026-01-13 02:04:10.812') },
  { id: 'cmkby34gf000188p2qe7y2v1w', name: 'David Garcia', email: '', phone: '(408)656-4199', createdAt: new Date('2026-01-13 02:00:37.455') },
  { id: 'cmkbxxxa40001s33jzu21df5t', name: 'Suzanne Nguyen', email: '', phone: '(408)569-0956', createdAt: new Date('2026-01-13 01:56:34.876') },
  { id: 'cmkbu4flr0001velhp636jxtz', name: 'Timothy Anderson', email: '', phone: '(559)317-8953', createdAt: new Date('2026-01-13 00:09:40.095') },
  { id: 'cmkbsrylr0001gcwferokpkxs', name: 'Barbara Thompson', email: '', phone: '(559)960-0850', createdAt: new Date('2026-01-12 23:31:58.574') },
  { id: 'cmkbjxkfo0001z4k0fv7v595d', name: 'Elizabeth Nguyen', email: '', phone: '(510)825-4177', createdAt: new Date('2026-01-12 19:24:23.603') },
  { id: 'cmk7pvq2o000e11lxevhdn4is', name: 'Martha Olmos', email: '', phone: '(559)696-5875', createdAt: new Date('2026-01-10 02:59:50.593') },
  { id: 'cmk7plejy000a11lxscbsdmwo', name: 'Akchhara Pandey', email: 'akchharaa@gmail.com', phone: '(510)902-9495', createdAt: new Date('2026-01-10 02:51:49.102') },
  { id: 'cmk7pimly000511lxffpg3nic', name: 'Maria Duran', email: '', phone: '(209)621-4324', createdAt: new Date('2026-01-10 02:49:39.574') },
  { id: 'cmk7of7du000111lxgklu9j5a', name: 'Arnab Paul', email: 'pa.arnab@gmail.com', phone: '(408)646-5170', createdAt: new Date('2026-01-10 02:19:00.257') },
  { id: 'cmk7ayjhj00012b5cjd1x333u', name: 'Karen Nunn', email: '', phone: '(559)304-9242', createdAt: new Date('2026-01-09 20:02:07.782') },
  { id: 'cmk7awgxm0001n6dqrwgvgz0a', name: 'Kathleen Petroff', email: '', phone: '(559)614-1695', createdAt: new Date('2026-01-09 20:00:31.162') },
  { id: 'cmk7auf6n0007ziax9hyz1yrg', name: 'Loretta Rehbein', email: '', phone: '(559)298-7636', createdAt: new Date('2026-01-09 19:58:55.584') },
  { id: 'cmk7asc5h0004ziax5u58fqb2', name: 'Joy Moore', email: '', phone: '(559)313-0110', createdAt: new Date('2026-01-09 19:57:18.341') },
  { id: 'cmk7ap8d80001ziaxr4svbksn', name: 'Kimberly Troxel', email: '', phone: '(559)284-4648', createdAt: new Date('2026-01-09 19:54:53.468') },
  { id: 'cmk7am368000aguqc9jfrrpul', name: 'Richard Gaxiola', email: '', phone: '(408)593-3097', createdAt: new Date('2026-01-09 19:52:26.769') },
  { id: 'cmk7ak34f000944i7ol5xokl9', name: 'Helen Loy', email: '', phone: '(559)770-5768', createdAt: new Date('2026-01-09 19:50:53.392') },
  { id: 'cmk7agpkk0007guqc52bmj94b', name: 'Cynthia Howell', email: '', phone: '(559)301-3951', createdAt: new Date('2026-01-09 19:48:15.86') },
  { id: 'cmk7acz5g000644i7dk0e05ba', name: 'Laniece Grijalva', email: '', phone: '(951)440-5317', createdAt: new Date('2026-01-09 19:45:21.652') },
  { id: 'cmk7a7yg9000344i77g9b0kj6', name: 'Chin Lu', email: '', phone: '(510)928-1769', createdAt: new Date('2026-01-09 19:41:27.466') },
  { id: 'cmk7a2s5p0004guqcs3e5croo', name: 'Patricia Urrutia', email: '', phone: '(559)705-3223', createdAt: new Date('2026-01-09 19:37:26.03') },
  { id: 'cmk79zvao0001guqc06n3sew1', name: 'Barbara Anderson', email: '', phone: '(559)312-0165', createdAt: new Date('2026-01-09 19:35:10.127') },
  { id: 'cmk77g7c400016ua4q0l82uif', name: 'Doroteo Mejia', email: '', phone: '559-704-6944', createdAt: new Date('2026-01-09 18:23:53.38') },
  { id: 'cmk67p5xg0001gej6fbzte2z4', name: 'Linda Rosado Mendez', email: 'cleanrosadolinda@gmial.com', phone: '5592940580', createdAt: new Date('2026-01-09 01:43:05.283') },
  { id: 'cmk5xs3xt00034ybq1x7eip70', name: 'Rosario Pinedo', email: '', phone: '559-313-3551', createdAt: new Date('2026-01-08 21:05:26.513') },
  { id: 'cmk5xju270006jkhmi0l4u0eb', name: 'Daniel Flores', email: '', phone: '5594548424', createdAt: new Date('2026-01-08 20:59:00.463') },
  { id: 'cmk5r3zuj000111pfauu4i2aq', name: 'Lorraine Rivera', email: 'helperlorraine@gmail.com', phone: '(408)806-4921', createdAt: new Date('2026-01-08 17:58:43.771') },
  { id: 'cmk4mefrm0001qa37futsiwh8', name: 'Susan Ayers', email: 'carecaoncierge+45@thehelperbees.com', phone: '775-857-9645', createdAt: new Date('2026-01-07 22:59:06.705') },
  { id: 'cmk4kv6p30001bv42u96i5b41', name: 'Rosa Bailon', email: 'careconciergeadvisorsss@thehelperbees.com', phone: '619-251-1181', createdAt: new Date('2026-01-07 22:16:08.87') },
  { id: 'cmk3dxnis0004frucnxs1q3vn', name: 'Mark Condell', email: '', phone: '2096267675', createdAt: new Date('2026-01-07 02:14:20.5') },
  { id: 'cmk3d4g4h000baazpd0m1tagm', name: 'Raghbir Dindral', email: 'dindral@awesomemaids.com', phone: '209-480-3916', createdAt: new Date('2026-01-07 01:51:37.889') },
  { id: 'cmk35wmy10001y7ys2vb83au2', name: 'Jessica Smith', email: 'theoriginalsock@gmail.com', phone: '630-310-2999', createdAt: new Date('2026-01-06 22:29:36.168') },
  { id: 'cmk253q9y00012qwinzgxlpgt', name: 'Tameem Rahel', email: '', phone: '7024166330', createdAt: new Date('2026-01-06 05:19:21.285') },
  { id: 'cmk249ptb00015jl62xmor980', name: 'Mark Condell', email: '', phone: '2096267675', createdAt: new Date('2026-01-06 04:56:01.006') },
  { id: 'cmk0rilwt000c78nvcgdepshg', name: 'Jaya Singhal', email: 'singhaljaya@gmail.com', phone: '4088380687', createdAt: new Date('2026-01-05 06:11:14.669') },
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, companyId: true, role: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    let restored = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (const clientData of clientsToRestore) {
      try {
        // Check if client already exists
        const existing = await prisma.client.findUnique({
          where: { id: clientData.id },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Restore client
        await prisma.client.create({
          data: {
            id: clientData.id,
            companyId: user.companyId,
            userId: user.id,
            name: clientData.name,
            email: clientData.email || null,
            phone: clientData.phone || null,
            createdAt: clientData.createdAt,
            updatedAt: clientData.createdAt,
          },
        });

        restored++;
      } catch (error: any) {
        errors.push(`${clientData.name}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      restored,
      skipped,
      errors: errors.slice(0, 10),
      totalClients: clientsToRestore.length,
      message: `Successfully restored ${restored} clients. ${skipped} already existed. ${errors.length} errors.`,
    });
  } catch (error: any) {
    console.error('Client restoration error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
