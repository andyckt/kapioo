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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface RatingDishRow {
  _id: string;
  name: string;
  nameEn?: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
}

export function RatingDishManagement() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [dishes, setDishes] = useState<RatingDishRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState("");
  const [activeDateSaving, setActiveDateSaving] = useState(false);

  useEffect(() => {
    fetch("/api/meal-rating/active-date")
      .then((res) => res.json())
      .then((data) => setActiveDate(data?.date ?? ""))
      .catch(() => setActiveDate(""));
  }, []);

  const saveActiveDate = async () => {
    if (!activeDate || !/^\d{4}-\d{2}-\d{2}$/.test(activeDate)) {
      toast({
        title: "Invalid date",
        description: "Please enter a date in YYYY-MM-DD format.",
        variant: "destructive",
      });
      return;
    }
    setActiveDateSaving(true);
    try {
      const res = await fetch("/api/admin/meal-rating/active-date", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: activeDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({ title: "Saved", description: "Rating date updated. Users will see this date on the form." });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save",
        variant: "destructive",
      });
    } finally {
      setActiveDateSaving(false);
    }
  };

  const fetchDishes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/rating-dishes");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setDishes(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to fetch dishes",
        variant: "destructive",
      });
      setDishes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDishes();
  }, []);

  const handleAdd = () => {
    setName("");
    setNameEn("");
    setSortOrder(dishes.length);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a dish name.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/rating-dishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          nameEn: nameEn.trim() || undefined,
          sortOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add dish");

      toast({ title: "Dish added", description: `"${name}" is now available for rating.` });
      setDialogOpen(false);
      fetchDishes();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add dish",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this dish? It will no longer appear on the rating form.")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/rating-dishes?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      toast({ title: "Dish deactivated", description: "It will no longer appear on the form." });
      fetchDishes();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to deactivate dish",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meal Rating Setup</CardTitle>
        <CardDescription>
          Set the rating date and dish names for next week&apos;s feedback. Users see this when they scan the QR code.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-2">
          <Label>Rating date (shown to users on /mealrating)</Label>
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              type="date"
              value={activeDate}
              onChange={(e) => setActiveDate(e.target.value)}
              className="w-40"
            />
            <Button
              size="sm"
              onClick={saveActiveDate}
              disabled={activeDateSaving}
            >
              {activeDateSaving ? "Saving…" : "Save"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Set this to the delivery date you want feedback for.
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Dish names</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Manage which dishes appear on the rating form. Active dishes are shown to users.
          </p>
        <div className="flex justify-end">
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Dish
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : dishes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            No dishes configured. Add dishes so they appear on the rating form.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name (Chinese)</TableHead>
                  <TableHead>Name (English)</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {dishes.map((d) => (
                  <TableRow key={d._id}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>{d.nameEn || "-"}</TableCell>
                    <TableCell>{d.sortOrder}</TableCell>
                    <TableCell>
                      <span
                        className={
                          d.active
                            ? "text-green-600 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {d.active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {d.active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(d._id)}
                          disabled={deletingId === d._id}
                        >
                          {deletingId === d._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Dish</DialogTitle>
            <DialogDescription>
              Add a dish name that customers can rate. Use Chinese for the primary
              name and English as optional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="dish-name">Name (Chinese)</Label>
              <Input
                id="dish-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 红烧肉"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dish-name-en">Name (English, optional)</Label>
              <Input
                id="dish-name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Braised Pork"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dish-sort">Sort order</Label>
              <Input
                id="dish-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
