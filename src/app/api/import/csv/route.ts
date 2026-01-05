import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/import/csv - Import CSV data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, companyId: true, role: true },
    });

    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file || !type) {
      return NextResponse.json(
        { error: "File and type are required" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/"/g, "").toLowerCase());

    const errors: string[] = [];
    let imported = 0;

    if (type === "bookings") {
      imported = await importBookings(
        lines.slice(1),
        headers,
        user.companyId,
        user.id,
        errors
      );
    } else if (type === "clients") {
      imported = await importClients(
        lines.slice(1),
        headers,
        user.companyId,
        user.id,
        errors
      );
    } else {
      return NextResponse.json({ error: "Invalid import type" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      imported,
      errors: errors.slice(0, 20), // Limit errors returned
      totalErrors: errors.length,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to import CSV" },
      { status: 500 }
    );
  }
}

async function importBookings(
  rows: string[],
  headers: string[],
  companyId: string,
  userId: string,
  errors: string[]
): Promise<number> {
  let imported = 0;

  // Map common header variations (including Launch27/booking software exports)
  const headerMap: Record<string, string[]> = {
    date: ["date", "scheduled_date", "booking_date", "appointment_date", "service_date", "booking start date time"],
    client_name: ["client_name", "client", "customer", "customer_name", "name", "full name", "full_name"],
    first_name: ["first_name", "first name", "firstname"],
    last_name: ["last_name", "last name", "lastname"],
    email: ["email", "email_address", "email address", "e-mail"],
    phone: ["phone", "phone_number", "phone number", "telephone", "mobile"],
    address: ["address", "street", "street_address", "street address"],
    apt: ["apt", "apt.", "apt. no.", "apartment", "unit"],
    city: ["city"],
    state: ["state", "st"],
    zip: ["zip", "zipcode", "zip_code", "postal", "zip/postal code", "zip/postal_code"],
    service_type: ["service_type", "type", "service", "cleaning_type", "frequency"],
    price: ["price", "amount", "total", "cost", "rate", "final amount (usd)", "final_amount", "service total (usd)"],
    status: ["status", "booking_status", "booking status"],
    cleaner: ["cleaner", "assigned_to", "team_member", "provider", "provider/team", "provider/team (without ids)", "provider details"],
    duration: ["duration", "hours", "time", "estimated job length (hh:mm)"],
    bedrooms: ["bedrooms", "beds", "br"],
    bathrooms: ["bathrooms", "baths", "ba"],
    sqft: ["sqft", "sq ft", "square_feet", "squarefeet", "house sq ft"],
    notes: ["notes", "note", "comments", "description", "booking note", "private customer note"],
    frequency: ["frequency", "occurrence"],
    tip: ["tip", "tip (usd)"],
    extras: ["extras"],
  };

  const getColumnIndex = (field: string): number => {
    const variations = headerMap[field] || [field];
    for (const variation of variations) {
      const index = headers.indexOf(variation);
      if (index !== -1) return index;
    }
    return -1;
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.trim()) continue;

    try {
      const values = parseCSVRow(row);

      const getValue = (field: string): string => {
        const index = getColumnIndex(field);
        return index >= 0 ? (values[index] || "").trim() : "";
      };

      // Get client name - try full name first, then combine first + last
      let clientName = getValue("client_name");
      if (!clientName) {
        const firstName = getValue("first_name");
        const lastName = getValue("last_name");
        if (firstName || lastName) {
          clientName = `${firstName} ${lastName}`.trim();
        }
      }

      const address = getValue("address");
      const apt = getValue("apt");
      const fullAddress = apt ? `${address} ${apt}`.trim() : address;
      const dateStr = getValue("date");
      const priceStr = getValue("price");

      if (!clientName || !dateStr) {
        errors.push(`Row ${i + 2}: Missing required fields (client_name or date)`);
        continue;
      }

      // Parse date
      const scheduledDate = parseDate(dateStr);
      if (!scheduledDate) {
        errors.push(`Row ${i + 2}: Invalid date format "${dateStr}"`);
        continue;
      }

      // Parse price
      const price = parseFloat(priceStr.replace(/[$,]/g, "")) || 0;

      // Find or create client
      let client = await prisma.client.findFirst({
        where: {
          companyId,
          name: { equals: clientName, mode: "insensitive" },
        },
      });

      if (!client) {
        client = await prisma.client.create({
          data: {
            companyId,
            userId,
            name: clientName,
            email: getValue("email") || null,
            phone: getValue("phone") || null,
          },
        });
      }

      // Find or create address
      let addressRecord = null;
      if (fullAddress) {
        addressRecord = await prisma.address.findFirst({
          where: {
            clientId: client.id,
            street: { equals: fullAddress, mode: "insensitive" },
          },
        });

        if (!addressRecord) {
          const sqftStr = getValue("sqft");
          addressRecord = await prisma.address.create({
            data: {
              clientId: client.id,
              street: fullAddress,
              city: getValue("city") || "Unknown",
              state: getValue("state") || "CA",
              zip: getValue("zip") || "00000",
              bedrooms: parseInt(getValue("bedrooms")) || null,
              bathrooms: parseFloat(getValue("bathrooms")) || null,
              squareFootage: sqftStr ? parseInt(sqftStr.replace(/,/g, "")) : null,
            },
          });
        }
      } else {
        // Create a placeholder address if none provided
        addressRecord = await prisma.address.findFirst({
          where: { clientId: client.id },
        });

        if (!addressRecord) {
          addressRecord = await prisma.address.create({
            data: {
              clientId: client.id,
              street: "Address not provided",
              city: getValue("city") || "Unknown",
              state: getValue("state") || "TX",
              zip: getValue("zip") || "00000",
            },
          });
        }
      }

      // Map service type
      const serviceTypeStr = getValue("service_type").toLowerCase();
      let serviceType: "STANDARD" | "DEEP" | "MOVE_OUT" = "STANDARD";
      if (serviceTypeStr.includes("deep")) serviceType = "DEEP";
      else if (serviceTypeStr.includes("move")) serviceType = "MOVE_OUT";

      // Map status
      const statusStr = getValue("status").toLowerCase();
      let status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" = "COMPLETED";
      if (statusStr.includes("schedul") || statusStr.includes("upcoming")) status = "SCHEDULED";
      else if (statusStr.includes("cancel")) status = "CANCELLED";
      else if (statusStr.includes("no show") || statusStr.includes("no-show")) status = "NO_SHOW";

      // Parse duration
      const durationStr = getValue("duration");
      const duration = parseInt(durationStr) || 120; // Default 2 hours

      // Create booking
      await prisma.booking.create({
        data: {
          companyId,
          userId,
          clientId: client.id,
          addressId: addressRecord.id,
          scheduledDate,
          duration: duration > 24 ? duration : duration * 60, // Convert hours to minutes if needed
          serviceType,
          status,
          price,
          isPaid: status === "COMPLETED",
          paidAt: status === "COMPLETED" ? scheduledDate : null,
          notes: getValue("notes") || null,
        },
      });

      imported++;
    } catch (err) {
      errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return imported;
}

async function importClients(
  rows: string[],
  headers: string[],
  companyId: string,
  userId: string,
  errors: string[]
): Promise<number> {
  let imported = 0;

  // Map common header variations (including Launch27/booking software exports)
  const headerMap: Record<string, string[]> = {
    name: ["name", "client_name", "customer_name", "full_name", "full name"],
    first_name: ["first_name", "first name", "firstname"],
    last_name: ["last_name", "last name", "lastname"],
    email: ["email", "email_address", "email address", "e-mail"],
    phone: ["phone", "phone_number", "phone number", "telephone", "mobile"],
    address: ["address", "street", "street_address"],
    apt: ["apt", "apt.", "apt. no.", "apartment", "unit"],
    city: ["city"],
    state: ["state", "st"],
    zip: ["zip", "zipcode", "zip_code", "postal", "zip/postal code"],
    tags: ["tags", "labels", "categories"],
    notes: ["notes", "note", "comments"],
    status: ["status"],
    num_bookings: ["number of bookings", "num_bookings", "bookings"],
  };

  const getColumnIndex = (field: string): number => {
    const variations = headerMap[field] || [field];
    for (const variation of variations) {
      const index = headers.indexOf(variation);
      if (index !== -1) return index;
    }
    return -1;
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.trim()) continue;

    try {
      const values = parseCSVRow(row);

      const getValue = (field: string): string => {
        const index = getColumnIndex(field);
        return index >= 0 ? (values[index] || "").trim() : "";
      };

      // Get name - try full name first, then combine first + last
      let name = getValue("name");
      if (!name) {
        const firstName = getValue("first_name");
        const lastName = getValue("last_name");
        if (firstName || lastName) {
          name = `${firstName} ${lastName}`.trim();
        }
      }

      if (!name) {
        errors.push(`Row ${i + 2}: Missing required field (name)`);
        continue;
      }

      // Check if client already exists
      const existingClient = await prisma.client.findFirst({
        where: {
          companyId,
          OR: [
            { name: { equals: name, mode: "insensitive" } },
            ...(getValue("email")
              ? [{ email: { equals: getValue("email"), mode: "insensitive" as const } }]
              : []),
          ],
        },
      });

      if (existingClient) {
        errors.push(`Row ${i + 2}: Client "${name}" already exists`);
        continue;
      }

      // Parse tags
      const tagsStr = getValue("tags");
      const tags = tagsStr ? tagsStr.split(/[;|,]/).map((t) => t.trim()).filter(Boolean) : [];

      // Create client
      const client = await prisma.client.create({
        data: {
          companyId,
          userId,
          name,
          email: getValue("email") || null,
          phone: getValue("phone") || null,
          tags,
          notes: getValue("notes") || null,
        },
      });

      // Create address if provided
      const address = getValue("address");
      if (address) {
        await prisma.address.create({
          data: {
            clientId: client.id,
            street: address,
            city: getValue("city") || "Unknown",
            state: getValue("state") || "TX",
            zip: getValue("zip") || "00000",
          },
        });
      }

      imported++;
    } catch (err) {
      errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return imported;
}

function parseCSVRow(row: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim().replace(/^"|"$/g, ""));
  return values;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try various date formats
  const formats = [
    // ISO
    /^(\d{4})-(\d{2})-(\d{2})/,
    // US format MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    // US format MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})/,
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // ISO format
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      } else {
        // US format
        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
      }
    }
  }

  // Try native parsing as fallback
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}
