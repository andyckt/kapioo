"use client"

import { useEffect } from "react"
import { CheckCircle, ChevronDown, History, Loader2, Mail, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { PRODUCT_LINE_LABELS } from "@/lib/product-lines/names"

import { DailyMenuCombosTab } from "./daily-menu-combos-tab"
import { DailyMenuDatesTab } from "./daily-menu-dates-tab"
import { DailyMenuDialogs } from "./daily-menu-dialogs"
import { sortDaysByWeekAndName } from "./helpers"
import { useComboEditing } from "./use-combo-editing"
import { useDailyMenuData } from "./use-daily-menu-data"
import { useDaySchedule } from "./use-day-schedule"
import { useMenuHistory } from "./use-menu-history"
import { useMenuNotifications } from "./use-menu-notifications"
import { useWeekOperations } from "./use-week-operations"

export function DailyDeliveryManagement() {
  const data = useDailyMenuData()
  const schedule = useDaySchedule({
    days: data.days,
    setDays: data.setDays,
  })
  const weekOperations = useWeekOperations({
    days: data.days,
    fetchData: () => data.fetchData(),
    setActiveWeekFilter: schedule.setActiveWeekFilter,
  })
  const comboEditing = useComboEditing({
    days: data.days,
    setDays: data.setDays,
    availableTags: data.availableTags,
    setAvailableTags: data.setAvailableTags,
    dishTranslations: data.dishTranslations,
    setDishTranslations: data.setDishTranslations,
  })
  const history = useMenuHistory()
  const notifications = useMenuNotifications()

  useEffect(() => {
    if (!comboEditing.selectedDay) {
      const firstDay = sortDaysByWeekAndName(Object.entries(data.days))[0]?.[0]
      if (firstDay) {
        comboEditing.setSelectedDay(firstDay)
      }
    }
  }, [comboEditing, data.days])

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{PRODUCT_LINE_LABELS.daily.en} Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage delivery dates, menus, and combos
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void data.fetchData()}
            disabled={data.isLoading}
            size="sm"
          >
            <RefreshCcw className={`h-4 w-4 sm:mr-2 ${data.isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{data.isLoading ? "Refreshing..." : "Refresh"}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              history.setShowHistoryModal(true)
              void history.fetchHistory()
            }}
            size="sm"
          >
            <History className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">View History</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => notifications.setShowNotificationDialog(true)}
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Mail className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Notify Users</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                disabled={weekOperations.isActivatingNextWeek}
              >
                {weekOperations.isActivatingNextWeek ? (
                  <>
                    <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                    <span className="hidden sm:inline">Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Manage Status</span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void weekOperations.bulkActivateNextWeek()}>
                Activate All Next Week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void weekOperations.bulkDeactivateNextWeek()}>
                Deactivate All Next Week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void weekOperations.bulkActivateThisWeek()}>
                Activate All This Week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void weekOperations.bulkDeactivateThisWeek()}>
                Deactivate All This Week
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {data.isLoading ? (
        <div className="flex h-[300px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p>Loading data...</p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="dates" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dates">Dates</TabsTrigger>
            <TabsTrigger value="combos">Combos & Dishes</TabsTrigger>
          </TabsList>

          <TabsContent value="dates" className="space-y-4">
            <DailyMenuDatesTab
              days={data.days}
              activeWeekFilter={schedule.activeWeekFilter}
              setActiveWeekFilter={schedule.setActiveWeekFilter}
              editingDay={schedule.editingDay}
              editedDate={schedule.editedDate}
              setEditedDate={schedule.setEditedDate}
              editedDisplayName={schedule.editedDisplayName}
              setEditedDisplayName={schedule.setEditedDisplayName}
              editedWeek={schedule.editedWeek}
              setEditedWeek={schedule.setEditedWeek}
              editedIsActive={schedule.editedIsActive}
              setEditedIsActive={schedule.setEditedIsActive}
              startEditingDay={schedule.startEditingDay}
              saveEditedDay={() => void schedule.saveEditedDay()}
              cancelEditingDay={schedule.cancelEditingDay}
              deleteDay={(dayId) => void schedule.deleteDay(dayId)}
              showDayCreationModal={schedule.showDayCreationModal}
              setShowDayCreationModal={schedule.setShowDayCreationModal}
              selectedDayOfWeek={schedule.selectedDayOfWeek}
              setSelectedDayOfWeek={schedule.setSelectedDayOfWeek}
              selectedWeekNumber={schedule.selectedWeekNumber}
              setSelectedWeekNumber={schedule.setSelectedWeekNumber}
              startDate={schedule.startDate}
              setStartDate={schedule.setStartDate}
              createDay={() => void schedule.createDay()}
              resetDayCreation={schedule.resetDayCreation}
              calculateDatesForWeek={schedule.calculateDatesForWeek}
              setCalculatedDates={schedule.setCalculatedDates}
              isRollingForward={weekOperations.isRollingForward}
              rollForwardWeek={() => void weekOperations.rollForwardWeek()}
            />
          </TabsContent>

          <TabsContent value="combos" className="space-y-4">
            <DailyMenuCombosTab
              days={data.days}
              availableTags={data.availableTags}
              dishTranslations={data.dishTranslations}
              selectedDay={comboEditing.selectedDay}
              setSelectedDay={comboEditing.setSelectedDay}
              editingCombo={comboEditing.editingCombo}
              setEditingCombo={comboEditing.setEditingCombo}
              newTag={comboEditing.newTag}
              setNewTag={comboEditing.setNewTag}
              newDish={comboEditing.newDish}
              setNewDish={comboEditing.setNewDish}
              bulkDishes={comboEditing.bulkDishes}
              setBulkDishes={comboEditing.setBulkDishes}
              editingDish={comboEditing.editingDish}
              setEditingDish={comboEditing.setEditingDish}
              editedDishName={comboEditing.editedDishName}
              setEditedDishName={comboEditing.setEditedDishName}
              editingDishTranslation={comboEditing.editingDishTranslation}
              dishTranslationInput={comboEditing.dishTranslationInput}
              setDishTranslationInput={comboEditing.setDishTranslationInput}
              updateCombo={comboEditing.updateCombo}
              saveComboChanges={comboEditing.saveComboChanges}
              toggleComboMenuPreviewFeatured={comboEditing.toggleComboMenuPreviewFeatured}
              addTagToCombo={comboEditing.addTagToCombo}
              removeTagFromCombo={comboEditing.removeTagFromCombo}
              addDishToCombo={comboEditing.addDishToCombo}
              removeDishFromCombo={comboEditing.removeDishFromCombo}
              updateDishName={comboEditing.updateDishName}
              handleStartDishTranslation={comboEditing.handleStartDishTranslation}
              handleCancelDishTranslation={comboEditing.handleCancelDishTranslation}
              handleSaveDishTranslation={comboEditing.handleSaveDishTranslation}
              addNewTag={comboEditing.addNewTag}
              addCombo={comboEditing.addCombo}
              addComboFromLibrary={comboEditing.addComboFromLibrary}
              deleteCombo={comboEditing.deleteCombo}
              bulkAddDishes={comboEditing.bulkAddDishes}
              syncDishesToTypeB={comboEditing.syncDishesToTypeB}
            />
          </TabsContent>
        </Tabs>
      )}

      <DailyMenuDialogs
        showHistoryModal={history.showHistoryModal}
        setShowHistoryModal={history.setShowHistoryModal}
        historyData={history.historyData}
        isLoadingHistory={history.isLoadingHistory}
        selectedHistoryEntry={history.selectedHistoryEntry}
        setSelectedHistoryEntry={history.setSelectedHistoryEntry}
        deleteHistoryEntry={(historyId) => void history.deleteHistoryEntry(historyId)}
        deleteHistoryWeek={(entries, label) => history.deleteHistoryWeek(entries, label)}
        showNotificationDialog={notifications.showNotificationDialog}
        setShowNotificationDialog={notifications.setShowNotificationDialog}
        showProgressDialog={notifications.showProgressDialog}
        setShowProgressDialog={notifications.setShowProgressDialog}
        isSendingNotifications={notifications.isSendingNotifications}
        notificationProgress={notifications.notificationProgress}
        sendMenuUpdateNotifications={() => void notifications.sendMenuUpdateNotifications()}
      />
    </div>
  )
}
