"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  MessageSquare,
  Star,
} from "lucide-react";

interface DishRatingItem {
  dishId: string;
  dishName: string;
  rating: number;
  comment?: string;
}

interface MealRatingItem {
  _id: string;
  overallRating: number;
  deliveryDate: string;
  dishRatings: DishRatingItem[];
  comment?: string;
  userEmail?: string;
  submittedAt: string;
  createdAt: string;
}

export function MealFeedbackManagement() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<MealRatingItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchFeedback = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", String(pagination.limit));
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/admin/meal-rating?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");

      setItems(data.items || []);
      setPagination((prev) => ({
        ...prev,
        page: data.pagination?.page ?? page,
        total: data.pagination?.total ?? 0,
        pages: data.pagination?.pages ?? 1,
      }));
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to fetch feedback",
        variant: "destructive",
      });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback(pagination.page);
  }, [pagination.page, startDate, endDate]);

  const handleApplyFilters = () => {
    fetchFeedback(1);
  };

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const headers = [
        "Delivery Date",
        "User Email",
        "Overall Rating",
        "Overall Comment",
        "Dish Ratings Summary",
        "Per-Dish Comments",
        "Submitted At",
      ];
      const rows = items.map((r) => {
        const dishSummary =
          r.dishRatings.length > 0
            ? r.dishRatings.map((d) => `${d.dishName}: ${d.rating}`).join("; ")
            : "-";
        const dishCommentsSummary =
          r.dishRatings.some((d) => d.comment)
            ? r.dishRatings
                .filter((d) => d.comment)
                .map((d) => `${d.dishName}: ${d.comment || ""}`)
                .join(" | ")
            : "-";
        return [
          r.deliveryDate,
          r.userEmail?.trim() || "Not logged in",
          r.overallRating,
          r.comment || "",
          dishSummary,
          dishCommentsSummary,
          r.submittedAt ? format(new Date(r.submittedAt), "yyyy-MM-dd HH:mm") : "",
        ];
      });
      const escapeCsvCell = (val: unknown) => {
        const s = val == null ? "" : String(val);
        return `"${s.replace(/"/g, '""')}"`;
      };
      const csvContent =
        headers.join(",") +
        "\n" +
        rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `meal-feedback-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast({ title: "Exported", description: "CSV downloaded successfully." });
    } catch (err) {
      toast({
        title: "Export failed",
        description: "Could not export CSV.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meal Feedback</CardTitle>
        <CardDescription>
          Submitted ratings from the /mealrating page. Use for QR codes on delivery
          packaging.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Set the rating date and dish names in the <strong>Dish Names</strong> tab.
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={handleApplyFilters} variant="secondary">
            Apply Filters
          </Button>
          <Button
            onClick={exportToCSV}
            disabled={isExporting || items.length === 0}
            variant="outline"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="ml-2">Export CSV</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No feedback submitted yet.
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead>Dishes</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <>
                      <TableRow
                        key={item._id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          setExpandedId(expandedId === item._id ? null : item._id)
                        }
                      >
                        <TableCell className="w-10">
                          {expandedId === item._id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell>{item.deliveryDate}</TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[140px] truncate" title={item.userEmail || "Not logged in"}>
                          {item.userEmail || "Not logged in"}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-0.5">
                            {item.overallRating}{" "}
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          </span>
                        </TableCell>
                        <TableCell>
                          {item.dishRatings.length > 0
                            ? `${item.dishRatings.length} rated`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {item.comment ? (
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {item.submittedAt
                            ? format(new Date(item.submittedAt), "MMM d, HH:mm")
                            : "-"}
                        </TableCell>
                      </TableRow>
                      {expandedId === item._id && (
                        <TableRow key={`${item._id}-exp`}>
                          <TableCell colSpan={7} className="bg-muted/30">
                            <div className="p-4 space-y-3">
                              <div>
                                <p className="font-medium mb-1">Submitted by:</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.userEmail || "Not logged in"}
                                </p>
                              </div>
                              {item.dishRatings.length > 0 && (
                                <div>
                                  <p className="font-medium mb-2">Dish ratings:</p>
                                  <ul className="list-disc list-inside space-y-2 text-sm">
                                    {item.dishRatings.map((d) => (
                                      <li key={d.dishId}>
                                        {d.dishName}: {d.rating}
                                        <Star className="inline h-3 w-3 ml-1 fill-amber-400 text-amber-400" />
                                        {d.comment && (
                                          <div className="ml-4 mt-1 text-muted-foreground italic">
                                            &quot;{d.comment}&quot;
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {item.comment && (
                                <div>
                                  <p className="font-medium mb-1">Overall comment:</p>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {item.comment}
                                  </p>
                                </div>
                              )}
                              {!item.comment && item.dishRatings.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Overall rating only, no dish breakdown or comment.
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchFeedback(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => fetchFeedback(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
