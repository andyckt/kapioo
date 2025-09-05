"use client"

import { useState } from "react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Check,
  AlertCircle,
  Calendar,
  Tag,
  Utensils,
  Package
} from "lucide-react"

// Define types based on the daily-delivery.tsx file
type ComboType = 'A' | 'B'
type ComboItem = {
  id: string
  name: string
  calories: number
  tags: string[]
  typeA: {
    dishes: string[]
    voucherType: 'twoDish'
  }
  typeB: {
    dishes: string[]
    voucherType: 'threeDish'
  }
}

type DayData = {
  date: string
  displayName: string
  week: number
  combos: ComboItem[]
}

export function DailyDeliveryManagement() {
  // State for managing the data
  const [days, setDays] = useState<Record<string, DayData>>({
    // Week 1
    'monday-w1': {
      date: 'Sep 1',
      displayName: 'monday',
      week: 1,
      combos: [
        {
          id: 'monday-w1-combo1',
          name: '套餐 1',
          calories: 650,
          tags: ["Fresh", "Healthy", "Vegetarian"],
          typeA: {
            dishes: ["红烧肉", "清炒时蔬", "杨枝甘露"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["红烧肉", "清炒时蔬", "杨枝甘露", "酸梅汤", "春卷"],
            voucherType: 'threeDish'
          }
        },
        {
          id: 'monday-w1-combo2',
          name: '套餐 2',
          calories: 850,
          tags: ["Gourmet", "Seafood"],
          typeA: {
            dishes: ["北京烤鸭", "松露炒饭", "芒果布丁"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["北京烤鸭", "松露炒饭", "芒果布丁", "花雕酒", "凉拌海蜇"],
            voucherType: 'threeDish'
          }
        }
      ]
    },
    'tuesday-w1': {
      date: 'Sep 2',
      displayName: 'tuesday',
      week: 1,
      combos: [
        {
          id: 'tuesday-w1-combo1',
          name: '套餐 1',
          calories: 620,
          tags: ["Fresh", "High Protein"],
          typeA: {
            dishes: ["宫保鸡丁", "蒜蓉空心菜", "桂花糕"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["宫保鸡丁", "蒜蓉空心菜", "桂花糕", "乌龙茶", "鲜虾春卷"],
            voucherType: 'threeDish'
          }
        },
        {
          id: 'tuesday-w1-combo2',
          name: '套餐 2',
          calories: 780,
          tags: ["Gourmet", "Comfort Food"],
          typeA: {
            dishes: ["水煮鱼", "榨菜肉丝面", "红豆沙"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["水煮鱼", "榨菜肉丝面", "红豆沙", "青梅酒", "酱牛肉"],
            voucherType: 'threeDish'
          }
        }
      ]
    },
    'wednesday-w1': {
      date: 'Sep 3',
      displayName: 'wednesday',
      week: 1,
      combos: [
        {
          id: 'wednesday-w1-combo1',
          name: '套餐 1',
          calories: 680,
          tags: ["Healthy", "Vegetarian"],
          typeA: {
            dishes: ["麻婆豆腐", "上汤娃娃菜", "芝麻汤圆"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["麻婆豆腐", "上汤娃娃菜", "芝麻汤圆", "菊花茶", "香菇青菜包"],
            voucherType: 'threeDish'
          }
        },
        {
          id: 'wednesday-w1-combo2',
          name: '套餐 2',
          calories: 820,
          tags: ["Gourmet", "High Protein"],
          typeA: {
            dishes: ["东坡肉", "虾仁炒蛋", "桃胶雪燕"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["东坡肉", "虾仁炒蛋", "桃胶雪燕", "梅子酒", "卤鸭翅"],
            voucherType: 'threeDish'
          }
        }
      ]
    },
    'thursday-w1': {
      date: 'Sep 4',
      displayName: 'thursday',
      week: 1,
      combos: [
        {
          id: 'thursday-w1-combo1',
          name: '套餐 1',
          calories: 640,
          tags: ["Fresh", "Healthy"],
          typeA: {
            dishes: ["糖醋排骨", "蒜蓉西兰花", "椰汁西米露"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["糖醋排骨", "蒜蓉西兰花", "椰汁西米露", "龙井茶", "蟹黄小笼包"],
            voucherType: 'threeDish'
          }
        },
        {
          id: 'thursday-w1-combo2',
          name: '套餐 2',
          calories: 890,
          tags: ["Gourmet", "High Protein"],
          typeA: {
            dishes: ["葱爆羊肉", "干锅土豆片", "桂圆红枣羹"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["葱爆羊肉", "干锅土豆片", "桂圆红枣羹", "竹叶青酒", "凉拌木耳"],
            voucherType: 'threeDish'
          }
        }
      ]
    },
    'friday-w1': {
      date: 'Sep 5',
      displayName: 'friday',
      week: 1,
      combos: [
        {
          id: 'friday-w1-combo1',
          name: '套餐 1',
          calories: 630,
          tags: ["Fresh", "Vegetarian"],
          typeA: {
            dishes: ["鱼香肉丝", "炝炒油菜", "奶黄包"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["鱼香肉丝", "炝炒油菜", "奶黄包", "普洱茶", "千层饼"],
            voucherType: 'threeDish'
          }
        },
        {
          id: 'friday-w1-combo2',
          name: '套餐 2',
          calories: 800,
          tags: ["Gourmet", "Comfort Food"],
          typeA: {
            dishes: ["辣子鸡", "虾仁豆腐", "蛋黄酥"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["辣子鸡", "虾仁豆腐", "蛋黄酥", "黄酒", "卤鸡爪"],
            voucherType: 'threeDish'
          }
        }
      ]
    },
    'sunday-w1': {
      date: 'Sep 7',
      displayName: 'sunday',
      week: 1,
      combos: [
        {
          id: 'sunday-w1-combo1',
          name: '套餐 1',
          calories: 660,
          tags: ["Fresh", "Healthy"],
          typeA: {
            dishes: ["回锅肉", "蒜泥白肉", "豆沙包"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["回锅肉", "蒜泥白肉", "豆沙包", "铁观音", "香酥鸭"],
            voucherType: 'threeDish'
          }
        },
        {
          id: 'sunday-w1-combo2',
          name: '套餐 2',
          calories: 830,
          tags: ["Seafood", "Gourmet"],
          typeA: {
            dishes: ["清蒸鲈鱼", "腊味炒饭", "龙眼甜汤"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["清蒸鲈鱼", "腊味炒饭", "龙眼甜汤", "绍兴酒", "盐水鸭"],
            voucherType: 'threeDish'
          }
        }
      ]
    },
    
    // Week 2
    'monday-w2': {
      date: 'Sep 8',
      displayName: 'monday',
      week: 2,
      combos: [
        {
          id: 'monday-w2-combo1',
          name: '套餐 1',
          calories: 610,
          tags: ["Fresh", "Vegetarian"],
          typeA: {
            dishes: ["小笼包", "上海炒面", "芒果西米露"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["小笼包", "上海炒面", "芒果西米露", "乌梅汁", "锅贴"],
            voucherType: 'threeDish'
          }
        },
        {
          id: 'monday-w2-combo2',
          name: '套餐 2',
          calories: 840,
          tags: ["Gourmet", "Comfort Food"],
          typeA: {
            dishes: ["梅菜扣肉", "蛋炒饭", "红豆糯米糍"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["梅菜扣肉", "蛋炒饭", "红豆糯米糍", "桂花酒", "凉拌海带"],
            voucherType: 'threeDish'
          }
        }
      ]
    },
    'tuesday-w2': {
      date: 'Sep 9',
      displayName: 'tuesday',
      week: 2,
      combos: [
        {
          id: 'tuesday-w2-combo1',
          name: '套餐 1',
          calories: 670,
          tags: ["Seafood", "Healthy"],
          typeA: {
            dishes: ["酸菜鱼", "蒜蓉茼蒿", "桃胶银耳羹"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["酸菜鱼", "蒜蓉茼蒿", "桃胶银耳羹", "茉莉花茶", "虾饺"],
            voucherType: 'threeDish'
          }
        },
        {
          id: 'tuesday-w2-combo2',
          name: '套餐 2',
          calories: 750,
          tags: ["Vegetarian", "Comfort Food"],
          typeA: {
            dishes: ["干煸四季豆", "葱油拌面", "芋圆"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["干煸四季豆", "葱油拌面", "芋圆", "米酒", "卤水鸡"],
            voucherType: 'threeDish'
          }
        }
      ]
    },
    'wednesday-w2': {
      date: 'Sep 10',
      displayName: 'wednesday',
      week: 2,
      combos: [
        {
          id: 'wednesday-w2-combo1',
          name: '套餐 1',
          calories: 620,
          tags: ["Vegetarian", "Healthy"],
          typeA: {
            dishes: ["鱼香茄子", "蒸蛋", "桂花糖藕"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["鱼香茄子", "蒸蛋", "桂花糖藕", "菊花普洱", "萝卜糕"],
            voucherType: 'threeDish'
          }
        },
        {
          id: 'wednesday-w2-combo2',
          name: '套餐 2',
          calories: 880,
          tags: ["Seafood", "Gourmet"],
          typeA: {
            dishes: ["香辣蟹", "扬州炒饭", "椰汁糕"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["香辣蟹", "扬州炒饭", "椰汁糕", "玫瑰露酒", "卤水鹅翅"],
            voucherType: 'threeDish'
          }
        }
      ]
    },
    'thursday-w2': {
      date: 'Sep 11',
      displayName: 'thursday',
      week: 2,
      combos: [
        {
          id: 'thursday-w2-combo1',
          name: '套餐 1',
          calories: 690,
          tags: ["High Protein", "Fresh"],
          typeA: {
            dishes: ["蚝油牛肉", "清炒菠菜", "杏仁豆腐"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["蚝油牛肉", "清炒菠菜", "杏仁豆腐", "铁观音", "灌汤包"],
            voucherType: 'threeDish'
          }
        },
        {
          id: 'thursday-w2-combo2',
          name: '套餐 2',
          calories: 810,
          tags: ["Comfort Food", "Gourmet"],
          typeA: {
            dishes: ["辣椒炒肉", "腊肠煲仔饭", "莲子羹"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["辣椒炒肉", "腊肠煲仔饭", "莲子羹", "黄酒", "卤水鸭舌"],
            voucherType: 'threeDish'
          }
        }
      ]
    },
    'friday-w2': {
      date: 'Sep 12',
      displayName: 'friday',
      week: 2,
      combos: [
        {
          id: 'friday-w2-combo1',
          name: '套餐 1',
          calories: 640,
          tags: ["Healthy", "Fresh"],
          typeA: {
            dishes: ["香菇滑鸡", "上汤西洋菜", "豆腐花"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["香菇滑鸡", "上汤西洋菜", "豆腐花", "大红袍", "蛋挞"],
            voucherType: 'threeDish'
          }
        },
        {
          id: 'friday-w2-combo2',
          name: '套餐 2',
          calories: 860,
          tags: ["Gourmet", "Comfort Food"],
          typeA: {
            dishes: ["咕噜肉", "干炒牛河", "姜汁撞奶"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["咕噜肉", "干炒牛河", "姜汁撞奶", "桃花酿", "烧卖"],
            voucherType: 'threeDish'
          }
        }
      ]
    },
    'sunday-w2': {
      date: 'Sep 14',
      displayName: 'sunday',
      week: 2,
      combos: [
        {
          id: 'sunday-w2-combo1',
          name: '套餐 1',
          calories: 650,
          tags: ["Fresh", "High Protein"],
          typeA: {
            dishes: ["叉烧", "虾仁云吞", "杨枝甘露"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["叉烧", "虾仁云吞", "杨枝甘露", "普洱", "萝卜牛腩煲"],
            voucherType: 'threeDish'
          }
        },
        {
          id: 'sunday-w2-combo2',
          name: '套餐 2',
          calories: 790,
          tags: ["Gourmet", "Comfort Food"],
          typeA: {
            dishes: ["白切鸡", "荷叶饭", "芝麻糊"],
            voucherType: 'twoDish'
          },
          typeB: {
            dishes: ["白切鸡", "荷叶饭", "芝麻糊", "竹叶青", "卤水鸡爪"],
            voucherType: 'threeDish'
          }
        }
      ]
    }
  })
  
  // State for managing tags
  const [availableTags, setAvailableTags] = useState<string[]>([
    "Fresh", "Healthy", "Vegetarian", "High Protein", "Gourmet", "Seafood", "Comfort Food"
  ])
  
  // State for editing
  const [selectedDay, setSelectedDay] = useState<string>('monday-w1')
  const [editingCombo, setEditingCombo] = useState<string | null>(null)
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [newTag, setNewTag] = useState<string>('')
  const [newDish, setNewDish] = useState<string>('')
  
  // State for date editing
  const [editedDate, setEditedDate] = useState<string>('')
  const [editedDisplayName, setEditedDisplayName] = useState<string>('')
  const [editedWeek, setEditedWeek] = useState<number>(1)
  
  // Helper function to update a combo
  const updateCombo = (dayId: string, comboId: string, updatedCombo: Partial<ComboItem>) => {
    setDays(prevDays => {
      const day = prevDays[dayId]
      if (!day) return prevDays
      
      const updatedCombos = day.combos.map(combo => 
        combo.id === comboId ? { ...combo, ...updatedCombo } : combo
      )
      
      return {
        ...prevDays,
        [dayId]: {
          ...day,
          combos: updatedCombos
        }
      }
    })
  }
  
  // Helper function to add a tag to a combo
  const addTagToCombo = (dayId: string, comboId: string, tag: string) => {
    setDays(prevDays => {
      const day = prevDays[dayId]
      if (!day) return prevDays
      
      const updatedCombos = day.combos.map(combo => {
        if (combo.id === comboId && !combo.tags.includes(tag)) {
          return {
            ...combo,
            tags: [...combo.tags, tag]
          }
        }
        return combo
      })
      
      return {
        ...prevDays,
        [dayId]: {
          ...day,
          combos: updatedCombos
        }
      }
    })
  }
  
  // Helper function to remove a tag from a combo
  const removeTagFromCombo = (dayId: string, comboId: string, tagToRemove: string) => {
    setDays(prevDays => {
      const day = prevDays[dayId]
      if (!day) return prevDays
      
      const updatedCombos = day.combos.map(combo => {
        if (combo.id === comboId) {
          return {
            ...combo,
            tags: combo.tags.filter(tag => tag !== tagToRemove)
          }
        }
        return combo
      })
      
      return {
        ...prevDays,
        [dayId]: {
          ...day,
          combos: updatedCombos
        }
      }
    })
  }
  
  // Helper function to add a dish to a combo
  const addDishToCombo = (dayId: string, comboId: string, dish: string, type: 'typeA' | 'typeB') => {
    setDays(prevDays => {
      const day = prevDays[dayId]
      if (!day) return prevDays
      
      const updatedCombos = day.combos.map(combo => {
        if (combo.id === comboId && !combo[type].dishes.includes(dish)) {
          return {
            ...combo,
            [type]: {
              ...combo[type],
              dishes: [...combo[type].dishes, dish]
            }
          }
        }
        return combo
      })
      
      return {
        ...prevDays,
        [dayId]: {
          ...day,
          combos: updatedCombos
        }
      }
    })
  }
  
  // Helper function to remove a dish from a combo
  const removeDishFromCombo = (dayId: string, comboId: string, dishToRemove: string, type: 'typeA' | 'typeB') => {
    setDays(prevDays => {
      const day = prevDays[dayId]
      if (!day) return prevDays
      
      const updatedCombos = day.combos.map(combo => {
        if (combo.id === comboId) {
          return {
            ...combo,
            [type]: {
              ...combo[type],
              dishes: combo[type].dishes.filter(dish => dish !== dishToRemove)
            }
          }
        }
        return combo
      })
      
      return {
        ...prevDays,
        [dayId]: {
          ...day,
          combos: updatedCombos
        }
      }
    })
  }
  
  // Helper function to add a new tag to the available tags
  const addNewTag = () => {
    if (newTag && !availableTags.includes(newTag)) {
      setAvailableTags([...availableTags, newTag])
      setNewTag('')
    }
  }
  
  // Helper function to update a day
  const updateDay = (dayId: string, updatedDay: Partial<DayData>) => {
    setDays(prevDays => {
      const day = prevDays[dayId]
      if (!day) return prevDays
      
      return {
        ...prevDays,
        [dayId]: {
          ...day,
          ...updatedDay
        }
      }
    })
  }
  
  // Start editing a day
  const startEditingDay = (dayId: string) => {
    const day = days[dayId]
    if (day) {
      setEditingDay(dayId)
      setEditedDate(day.date)
      setEditedDisplayName(day.displayName)
      setEditedWeek(day.week)
    }
  }
  
  // Save day edits
  const saveEditedDay = () => {
    if (editingDay) {
      updateDay(editingDay, {
        date: editedDate,
        displayName: editedDisplayName,
        week: editedWeek
      })
      setEditingDay(null)
    }
  }
  
  // Cancel day editing
  const cancelEditingDay = () => {
    setEditingDay(null)
  }

  return (
    <div className="flex-1 space-y-6">
      <Tabs defaultValue="dates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dates" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Dates</span>
          </TabsTrigger>
          <TabsTrigger value="combos" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>Combos & Dishes</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Dates Management Tab */}
        <TabsContent value="dates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Date Management</CardTitle>
              <CardDescription>Manage delivery dates and week assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Current Delivery Schedule</h3>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => {
                        // Generate a new unique day ID
                        const newDayId = `new-day-${Date.now()}`;
                        // Add a new day with default values
                        setDays(prevDays => ({
                          ...prevDays,
                          [newDayId]: {
                            date: 'New Date',
                            displayName: 'new-day',
                            week: 1,
                            combos: [
                              {
                                id: `${newDayId}-combo1`,
                                name: '套餐 1',
                                calories: 650,
                                tags: ["Fresh", "Healthy"],
                                typeA: {
                                  dishes: ["Dish 1", "Dish 2", "Dish 3"],
                                  voucherType: 'twoDish'
                                },
                                typeB: {
                                  dishes: ["Dish 1", "Dish 2", "Dish 3", "Dish 4", "Dish 5"],
                                  voucherType: 'threeDish'
                                }
                              }
                            ]
                          }
                        }));
                        // Start editing the new day immediately
                        startEditingDay(newDayId);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Day
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Day</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Week</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(days).map(([dayId, day]) => (
                        <TableRow key={dayId}>
                          {editingDay === dayId ? (
                            <>
                              <TableCell>
                                <Input
                                  value={editedDisplayName}
                                  onChange={(e) => setEditedDisplayName(e.target.value)}
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={editedDate}
                                  onChange={(e) => setEditedDate(e.target.value)}
                                  className="w-full"
                                  placeholder="e.g. Sep 1"
                                />
                              </TableCell>
                              <TableCell>
                                <Select value={editedWeek.toString()} onValueChange={(value) => setEditedWeek(parseInt(value))}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select week" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">Week 1</SelectItem>
                                    <SelectItem value="2">Week 2</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                                  Editing
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={saveEditedDay} className="text-green-600">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={cancelEditingDay} className="text-red-500">
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="font-medium capitalize">{day.displayName}</TableCell>
                              <TableCell>{day.date}</TableCell>
                              <TableCell>Week {day.week}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                                  Active
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => startEditingDay(dayId)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-red-500"
                                  onClick={() => {
                                    // Show confirmation dialog in a real app
                                    if (confirm(`Are you sure you want to delete ${day.displayName} (${day.date})?`)) {
                                      setDays(prevDays => {
                                        const newDays = { ...prevDays };
                                        delete newDays[dayId];
                                        return newDays;
                                      });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Combos & Dishes Management Tab */}
        <TabsContent value="combos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Combo & Dish Management</CardTitle>
              <CardDescription>Manage combo meals and their dishes for each day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <Label htmlFor="day-select" className="text-base font-medium">Select Day</Label>
                    <Select value={selectedDay} onValueChange={setSelectedDay}>
                      <SelectTrigger id="day-select" className="w-[250px] mt-1">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(days).map(([dayId, day]) => (
                          <SelectItem key={dayId} value={dayId}>
                            {day.displayName.charAt(0).toUpperCase() + day.displayName.slice(1)} (Week {day.week}) - {day.date}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Combo
                  </Button>
                </div>
                
                {days[selectedDay]?.combos.map((combo) => (
                  <Card key={combo.id} className="border">
                    <CardHeader className="pb-2 bg-muted/50">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{combo.name}</CardTitle>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingCombo(combo.id === editingCombo ? null : combo.id)}>
                            {combo.id === editingCombo ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{combo.calories} KCAL</span>
                        <div className="flex gap-1">
                          {combo.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {combo.id === editingCombo ? (
                      <CardContent className="pt-4">
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`combo-name-${combo.id}`}>Combo Name</Label>
                              <Input 
                                id={`combo-name-${combo.id}`} 
                                value={combo.name} 
                                onChange={(e) => updateCombo(selectedDay, combo.id, { name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`combo-calories-${combo.id}`}>Calories</Label>
                              <Input 
                                id={`combo-calories-${combo.id}`} 
                                type="number" 
                                value={combo.calories} 
                                onChange={(e) => updateCombo(selectedDay, combo.id, { calories: parseInt(e.target.value) })}
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label>Tags</Label>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs"
                                onClick={() => {
                                  if (newTag && !availableTags.includes(newTag)) {
                                    setAvailableTags([...availableTags, newTag]);
                                    addTagToCombo(selectedDay, combo.id, newTag);
                                    setNewTag('');
                                  }
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Create New Tag
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {combo.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                  {tag}
                                  <button 
                                    onClick={() => removeTagFromCombo(selectedDay, combo.id, tag)}
                                    className="ml-1 text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                              <div className="flex gap-2 items-center mt-1">
                                <Input
                                  placeholder="New tag..."
                                  value={newTag}
                                  onChange={(e) => setNewTag(e.target.value)}
                                  className="h-8 w-[120px] text-sm"
                                />
                                <Select onValueChange={(tag) => {
                                  addTagToCombo(selectedDay, combo.id, tag)
                                }}>
                                  <SelectTrigger className="w-[150px] h-8 text-sm">
                                    <SelectValue placeholder="Add existing tag" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableTags
                                      .filter(tag => !combo.tags.includes(tag))
                                      .map(tag => (
                                        <SelectItem key={tag} value={tag}>
                                          {tag}
                                        </SelectItem>
                                      ))
                                    }
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t">
                              <Label className="text-sm text-muted-foreground mb-2 block">Available Tags</Label>
                              <div className="flex flex-wrap gap-2">
                                {availableTags.map((tag) => (
                                  <div key={tag} className="flex items-center border rounded-md p-1">
                                    <Badge variant="secondary" className="mr-1">{tag}</Badge>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 text-red-500"
                                      onClick={() => setAvailableTags(availableTags.filter(t => t !== tag))}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-6 border-t pt-4">
                            <div>
                              <h3 className="text-lg font-medium mb-4">Dish Management</h3>
                              
                              <div className="bg-blue-50 p-4 rounded-md mb-6">
                                <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                                  <Package className="h-4 w-4 mr-2" />
                                  2-Dish Voucher Option
                                </h4>
                                <p className="text-sm text-blue-600 mb-4">These dishes are included in the 2-dish voucher option.</p>
                                
                                <div className="space-y-2">
                                  {combo.typeA.dishes.map((dish, index) => (
                                    <div key={dish} className="flex items-center justify-between bg-white p-3 rounded-md border border-blue-100">
                                      <div className="flex items-center">
                                        <span className="font-medium text-blue-900">{index + 1}.</span>
                                        <span className="ml-2">{dish}</span>
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => removeDishFromCombo(selectedDay, combo.id, dish, 'typeA')}
                                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <div className="flex gap-2 mt-4">
                                    <Input 
                                      placeholder="Add new dish to 2-dish option" 
                                      value={newDish} 
                                      onChange={(e) => setNewDish(e.target.value)} 
                                      className="border-blue-200 focus:border-blue-400"
                                    />
                                    <Button 
                                      variant="outline" 
                                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                      onClick={() => {
                                        if (newDish) {
                                          addDishToCombo(selectedDay, combo.id, newDish, 'typeA')
                                          setNewDish('')
                                        }
                                      }}
                                    >
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-green-50 p-4 rounded-md">
                                <h4 className="font-medium text-green-800 mb-2 flex items-center">
                                  <Package className="h-4 w-4 mr-2" />
                                  3-Dish Voucher Option
                                </h4>
                                <p className="text-sm text-green-600 mb-4">These dishes are included in the 3-dish voucher option.</p>
                                
                                <div className="space-y-2">
                                  {combo.typeB.dishes.map((dish, index) => (
                                    <div key={dish} className="flex items-center justify-between bg-white p-3 rounded-md border border-green-100">
                                      <div className="flex items-center">
                                        <span className="font-medium text-green-900">{index + 1}.</span>
                                        <span className="ml-2">{dish}</span>
                                        {combo.typeA.dishes.includes(dish) && (
                                          <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-600 border-green-200">
                                            Also in 2-dish option
                                          </Badge>
                                        )}
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => removeDishFromCombo(selectedDay, combo.id, dish, 'typeB')}
                                        className="text-green-500 hover:text-green-700 hover:bg-green-50"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <div className="flex gap-2 mt-4">
                                    <Input 
                                      placeholder="Add new dish to 3-dish option" 
                                      value={newDish} 
                                      onChange={(e) => setNewDish(e.target.value)} 
                                      className="border-green-200 focus:border-green-400"
                                    />
                                    <Button 
                                      variant="outline" 
                                      className="border-green-200 text-green-600 hover:bg-green-50"
                                      onClick={() => {
                                        if (newDish) {
                                          addDishToCombo(selectedDay, combo.id, newDish, 'typeB')
                                          setNewDish('')
                                        }
                                      }}
                                    >
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    ) : (
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium mb-2 text-blue-700">2-Dish Option</h4>
                            <div className="space-y-1">
                              {combo.typeA.dishes.map((dish, index) => (
                                <div key={dish} className="text-sm py-1 px-2 rounded bg-blue-50">
                                  {index + 1}. {dish}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2 text-green-700">3-Dish Option</h4>
                            <div className="space-y-1">
                              {combo.typeB.dishes.map((dish, index) => (
                                <div key={dish} className="text-sm py-1 px-2 rounded bg-green-50">
                                  {index + 1}. {dish}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>
    </div>
  )
}
