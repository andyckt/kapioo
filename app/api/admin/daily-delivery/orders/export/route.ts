import { NextResponse } from "next/server";

import { errorJson, parseSearchParams } from "@/lib/api";
import { requireAdminMfa } from "@/lib/auth/guards";
import { adminDailyOrdersQuerySchema } from "@/lib/contracts/daily-order";
import connectToDatabase from "@/lib/db";
import { buildAdminDailyOrdersMongoQuery } from "@/lib/orders/admin-daily-query";
import {
  resolveEffectiveOrderCustomerInfo,
  type DeliveryAddress,
  type EffectiveCustomerInfo,
} from "@/lib/orders/effective-customer-info";
import Combo from "@/models/Combo";
import DailyDeliveryOrder from "@/models/DailyDeliveryOrder";
import Day from "@/models/Day";
import User from "@/models/User";
import * as XLSX from "xlsx";

type AdminExportUser = {
  _id?: unknown;
  name?: string;
  email?: string;
};

function formatAddress(address: DeliveryAddress | null | undefined): string {
  if (!address) return "No address provided";

  let formattedAddress = "";

  if (address.unitNumber) {
    formattedAddress += `Unit ${address.unitNumber}, `;
  }

  formattedAddress += String(address.streetAddress || "");

  if (address.city || address.province || address.postalCode) {
    formattedAddress += `, ${address.city || ""} ${address.province || ""} ${address.postalCode || ""}`;
  }

  if (address.country) {
    formattedAddress += `, ${address.country}`;
  }

  if (address.buzzCode) {
    formattedAddress += ` (Buzz code: ${address.buzzCode})`;
  }

  return formattedAddress;
}

function formatCombo(combo: Record<string, unknown>): string {
  let comboText = (combo.name as string) || "套餐";

  const typeA = combo.typeA as { dishes?: string[] } | undefined;
  if (typeA?.dishes && typeA.dishes.length > 0) {
    typeA.dishes.forEach((dish: string, index: number) => {
      comboText += `\n${index + 1}. ${dish}`;
    });
  }

  const typeB = combo.typeB as { dishes?: string[] } | undefined;
  if (typeB?.dishes && typeB.dishes.length > 0) {
    const typeADishes = typeA?.dishes || [];
    const uniqueTypeBDishes = typeB.dishes.filter((dish: string) => !typeADishes.includes(dish));

    if (uniqueTypeBDishes.length > 0) {
      const dishNumber = (typeA?.dishes?.length || 0) + 1;
      uniqueTypeBDishes.forEach((dish: string, index: number) => {
        comboText += `\n${dishNumber + index}. ${dish} (3菜)`;
      });
    }
  }

  return comboText;
}

async function convertToWorksheetData(
  data: Array<Record<string, unknown>>,
  targetDate: string
): Promise<unknown[][]> {
  const filteredData = data
    .map((order) => ({
      ...order,
      items: (order.items as Array<{ date?: string }>).filter((item) => item.date === targetDate),
    }))
    .filter((order) => (order.items as unknown[]).length > 0) as Record<string, unknown>[];

  if (filteredData.length === 0) {
    return [];
  }

  const comboDetailsMap = new Map<string, Set<string>>();

  filteredData.forEach((order) => {
    (order.items as Array<{ comboName?: string; type?: string; dishes?: string[] }>).forEach(
      (item) => {
        if (item.comboName) {
          const comboKey = `${item.comboName} (${item.type === "A" ? "2-dish" : "3-dish"})`;

          if (!comboDetailsMap.has(comboKey)) {
            comboDetailsMap.set(comboKey, new Set<string>());
          }

          if (item.dishes && Array.isArray(item.dishes) && item.dishes.length > 0) {
            item.dishes.forEach((dish: string) => {
              comboDetailsMap.get(comboKey)?.add(dish);
            });
          }
        }
      }
    );
  });

  const comboKeys: string[] = [];
  const comboDisplayNames: string[] = [];

  Array.from(comboDetailsMap.keys())
    .sort()
    .forEach((comboKey) => {
      const dishes = comboDetailsMap.get(comboKey) || new Set<string>();
      const dishList = Array.from(dishes).join(" + ");

      comboKeys.push(comboKey);
      const displayName = dishList ? `${comboKey}: ${dishList}` : comboKey;
      comboDisplayNames.push(displayName);
    });

  const baseHeaders = ["Order ID", "User Name", "Email", "Phone Number", "Delivery Address", "Area"];

  const dateStatusHeaders = [
    "Status",
    "Delivery Date",
    "Delivery Day",
    "Date Ordered",
    "Two-Dish Vouchers",
    "Three-Dish Vouchers",
    "Special Instructions",
  ];

  const headers = [...baseHeaders, ...comboDisplayNames, ...dateStatusHeaders];

  const worksheetData: unknown[][] = [];

  try {
    const firstItems =
      filteredData.length > 0 &&
      filteredData[0].items &&
      (filteredData[0].items as Array<{ day?: string }>).length > 0
        ? (filteredData[0].items as Array<{ day?: string }>)
        : null;
    const firstDayId = firstItems ? firstItems[0].day : null;

    if (firstDayId) {
      const day = await Day.findOne({ dayId: firstDayId }).lean();

      const dayLean = day as unknown as { dayId?: string } | null;
      if (dayLean?.dayId) {
        const combos = await Combo.find({ dayId: dayLean.dayId }).lean();

        if (combos && combos.length > 0) {
          const formattedCombos = combos.map((combo) => formatCombo(combo as Record<string, unknown>));
          const emptyColumns = new Array(headers.length - combos.length).fill("");
          worksheetData.push([...formattedCombos, ...emptyColumns]);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error fetching combos for reference row:", err);
  }

  worksheetData.push(headers);

  filteredData.forEach((order) => {
    const items = order.items as Array<{ date?: string; day?: string; comboName?: string; type?: string; quantity?: number }>;
    const dateCreated = new Date(order.createdAt as string | Date).toISOString().split("T")[0];
    const deliveryDate = items && items.length > 0 ? items[0].date : "N/A";
    const deliveryDay =
      items && items.length > 0 ? (items[0].day ? items[0].day.split("-")[0] : "N/A") : "N/A";

    const effectiveInfo = (order.effectiveCustomerInfo as EffectiveCustomerInfo | undefined) || undefined;
    const address = formatAddress(
      effectiveInfo?.deliveryAddress || (order.deliveryAddress as DeliveryAddress | undefined)
    );

    const baseRow = [
      order.orderId,
      order.userName || "",
      order.userEmail || "",
      effectiveInfo?.phoneNumber || order.phoneNumber || "",
      address,
      effectiveInfo?.area || order.area || "",
    ];

    const comboQuantities: Record<string, number> = {};
    comboKeys.forEach((comboKey) => {
      comboQuantities[comboKey] = 0;
    });

    items.forEach((item) => {
      if (item.comboName && item.quantity) {
        const comboKey = `${item.comboName} (${item.type === "A" ? "2-dish" : "3-dish"})`;
        if (comboKeys.includes(comboKey)) {
          comboQuantities[comboKey] = (comboQuantities[comboKey] || 0) + item.quantity;
        }
      }
    });

    const comboQuantitiesRow = comboKeys.map((comboKey) => {
      const quantity = comboQuantities[comboKey] || 0;
      return quantity > 0 ? quantity : "";
    });

    const voucherCost = order.voucherCost as { twoDish?: number; threeDish?: number } | undefined;
    const dateStatusRow = [
      order.status,
      deliveryDate,
      deliveryDay,
      dateCreated,
      voucherCost?.twoDish || 0,
      voucherCost?.threeDish || 0,
      effectiveInfo?.specialInstructions || order.specialInstructions || "",
    ];

    const fullRow = [...baseRow, ...comboQuantitiesRow, ...dateStatusRow];
    worksheetData.push(fullRow);
  });

  return worksheetData;
}

export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }

    await connectToDatabase();

    const { data, error } = parseSearchParams(request, adminDailyOrdersQuerySchema);
    if (error) {
      return error;
    }

    const query = await buildAdminDailyOrdersMongoQuery(data);

    const orders = await DailyDeliveryOrder.find(query).sort({ createdAt: -1 }).lean();

    const userIds = orders.map((order) => order.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select("name email")
      .lean();

    const userMap = users.reduce<Record<string, (typeof users)[0]>>((map, user) => {
      map[String(user._id)] = user;
      return map;
    }, {});

    const formatUserNameWithPhone = (userName: string, phoneNumber: string): string => {
      if (!userName) return "Unknown";
      if (!phoneNumber) return userName;

      const digitsOnly = phoneNumber.replace(/\D/g, "");
      const lastFourDigits = digitsOnly.slice(-4);

      if (lastFourDigits.length === 4) {
        return `${userName}-${lastFourDigits}`;
      }

      return userName;
    };

    const ordersWithUserInfo = orders.map((order) => {
      const user = userMap[order.userId.toString()] as AdminExportUser | undefined;
      const effectiveCustomerInfo = resolveEffectiveOrderCustomerInfo(order, user);
      const userName = effectiveCustomerInfo.name || user?.name || "Unknown";
      const formattedUserName = formatUserNameWithPhone(
        userName,
        effectiveCustomerInfo.phoneNumber || order.phoneNumber || ""
      );

      return {
        ...order,
        userName: formattedUserName,
        userEmail: effectiveCustomerInfo.email || user?.email || "Unknown",
        effectiveCustomerInfo,
      } as Record<string, unknown>;
    });

    const uniqueDates = new Set<string>();
    ordersWithUserInfo.forEach((order) => {
      (order.items as Array<{ date?: string }>).forEach((item) => {
        if (item.date) {
          uniqueDates.add(item.date);
        }
      });
    });

    const sortedDates = Array.from(uniqueDates).sort((a, b) => {
      const dateA = new Date(`${a}, 2026`);
      const dateB = new Date(`${b}, 2026`);
      return dateA.getTime() - dateB.getTime();
    });

    const workbook = XLSX.utils.book_new();

    for (const date of sortedDates) {
      const worksheetData = await convertToWorksheetData(ordersWithUserInfo, date);

      if (worksheetData.length > 0) {
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        const sheetName = date.replace(/[:\\/?*\[\]]/g, "-").substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    }

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="daily-delivery-orders-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    console.error("Error exporting daily delivery orders:", error);
    return errorJson("Failed to export orders", 500);
  }
}
