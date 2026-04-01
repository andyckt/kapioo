"use client"

import { Calendar, Filter, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate } from "@/lib/format"
import type { AdminOrderDeliveryDateOption, AdminOrderFilters } from "@/lib/types/orders"

interface OrderFiltersBarProps {
  filters: AdminOrderFilters
  onFiltersChange: (next: AdminOrderFilters) => void
  onSearch: () => void
  onClear: () => void
  areas: string[]
  deliveryDates: AdminOrderDeliveryDateOption[]
  showAdvanced: boolean
  onShowAdvancedChange: (show: boolean) => void
  comboNames?: string[]
  searchPlaceholder: string
}

function formatRangeDate(date: string) {
  return date ? formatDate(new Date(`${date}T00:00:00`)) : ""
}

export function OrderFiltersBar({
  filters,
  onFiltersChange,
  onSearch,
  onClear,
  areas,
  deliveryDates,
  showAdvanced,
  onShowAdvancedChange,
  comboNames,
  searchPlaceholder,
}: OrderFiltersBarProps) {
  return (
    <>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-8"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSearch()
              }
            }}
          />
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => onShowAdvancedChange(!showAdvanced)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          {showAdvanced ? "Hide Filters" : "Advanced Filters"}
        </Button>

        <Button onClick={onSearch}>Search</Button>
      </div>

      {showAdvanced && (
        <div className="mb-6 rounded-lg border border-border/50 bg-muted/50 p-4">
          <div
            className={`mb-4 grid grid-cols-1 gap-4 ${
              comboNames ? "md:grid-cols-3" : "md:grid-cols-2"
            }`}
          >
            <div className="space-y-2">
              <Label htmlFor="order-filter-area">Area</Label>
              <Select
                value={filters.area}
                onValueChange={(value) => onFiltersChange({ ...filters, area: value })}
              >
                <SelectTrigger id="order-filter-area">
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order-filter-start">Delivery Date Range</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="order-filter-start"
                    type="date"
                    className="pl-8"
                    value={filters.deliveryDate}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, deliveryDate: e.target.value })
                    }
                    list={deliveryDates.length > 0 ? "delivery-date-options-start" : undefined}
                  />
                  {deliveryDates.length > 0 && (
                    <datalist id="delivery-date-options-start">
                      {deliveryDates.map((option) => (
                        <option key={option.date} value={option.date}>
                          {option.display}
                        </option>
                      ))}
                    </datalist>
                  )}
                </div>

                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="order-filter-end"
                    type="date"
                    className="pl-8"
                    value={filters.deliveryDateEnd}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, deliveryDateEnd: e.target.value })
                    }
                    list={deliveryDates.length > 0 ? "delivery-date-options-end" : undefined}
                  />
                  {deliveryDates.length > 0 && (
                    <datalist id="delivery-date-options-end">
                      {deliveryDates.map((option) => (
                        <option key={option.date} value={option.date}>
                          {option.display}
                        </option>
                      ))}
                    </datalist>
                  )}
                </div>
              </div>

              {filters.deliveryDate && filters.deliveryDateEnd && (
                <p className="text-xs text-muted-foreground">
                  Showing orders from {formatRangeDate(filters.deliveryDate)} to{" "}
                  {formatRangeDate(filters.deliveryDateEnd)}
                </p>
              )}
            </div>

            {comboNames && (
              <div className="space-y-2">
                <Label htmlFor="order-filter-combo">Combo Name</Label>
                <Select
                  value={filters.comboName || "all"}
                  onValueChange={(value) => onFiltersChange({ ...filters, comboName: value })}
                >
                  <SelectTrigger id="order-filter-combo">
                    <SelectValue placeholder="Select combo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Combos</SelectItem>
                    {comboNames.map((combo) => (
                      <SelectItem key={combo} value={combo}>
                        {combo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClear} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
            <Button onClick={onSearch}>Apply Filters</Button>
          </div>
        </div>
      )}
    </>
  )
}
