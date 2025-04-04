"use client"

import { Badge } from "@/components/ui/badge"

import { useState } from "react"
import { Globe, Check, ChevronDown, Languages, ImportIcon as Translate, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function MultiLanguageSupport() {
  const [currentLanguage, setCurrentLanguage] = useState("en")
  const [showLanguageDialog, setShowLanguageDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [autoTranslate, setAutoTranslate] = useState(true)
  const [dateFormat, setDateFormat] = useState("mm/dd/yyyy")
  const [measurementUnit, setMeasurementUnit] = useState("imperial")
  const { toast } = useToast()

  // Available languages
  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "it", name: "Italiano", flag: "🇮🇹" },
    { code: "pt", name: "Português", flag: "🇵🇹" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "ar", name: "العربية", flag: "🇸🇦" },
    { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
    { code: "ru", name: "Русский", flag: "🇷🇺" },
  ]

  // Translations for UI elements
  const translations = {
    en: {
      title: "Language & Localization",
      description: "Customize language and regional settings",
      currentLanguage: "Current Language",
      changeLanguage: "Change Language",
      languageSettings: "Language Settings",
      regionalSettings: "Regional Settings",
      autoTranslate: "Auto-translate meal descriptions",
      dateFormat: "Date Format",
      measurementUnit: "Measurement Units",
      imperial: "Imperial (oz, lb)",
      metric: "Metric (g, kg)",
      save: "Save Changes",
      cancel: "Cancel",
      languageChanged: "Language changed",
      languageChangedDesc: "Your language preference has been updated",
      settingsUpdated: "Settings updated",
      settingsUpdatedDesc: "Your localization settings have been saved",
    },
    es: {
      title: "Idioma y Localización",
      description: "Personaliza el idioma y la configuración regional",
      currentLanguage: "Idioma Actual",
      changeLanguage: "Cambiar Idioma",
      languageSettings: "Configuración de Idioma",
      regionalSettings: "Configuración Regional",
      autoTranslate: "Traducir automáticamente descripciones de comidas",
      dateFormat: "Formato de Fecha",
      measurementUnit: "Unidades de Medida",
      imperial: "Imperial (oz, lb)",
      metric: "Métrico (g, kg)",
      save: "Guardar Cambios",
      cancel: "Cancelar",
      languageChanged: "Idioma cambiado",
      languageChangedDesc: "Tu preferencia de idioma ha sido actualizada",
      settingsUpdated: "Configuración actualizada",
      settingsUpdatedDesc: "Tu configuración de localización ha sido guardada",
    },
    fr: {
      title: "Langue et Localisation",
      description: "Personnalisez la langue et les paramètres régionaux",
      currentLanguage: "Langue Actuelle",
      changeLanguage: "Changer de Langue",
      languageSettings: "Paramètres de Langue",
      regionalSettings: "Paramètres Régionaux",
      autoTranslate: "Traduire automatiquement les descriptions de repas",
      dateFormat: "Format de Date",
      measurementUnit: "Unités de Mesure",
      imperial: "Impérial (oz, lb)",
      metric: "Métrique (g, kg)",
      save: "Enregistrer les Modifications",
      cancel: "Annuler",
      languageChanged: "Langue modifiée",
      languageChangedDesc: "Votre préférence linguistique a été mise à jour",
      settingsUpdated: "Paramètres mis à jour",
      settingsUpdatedDesc: "Vos paramètres de localisation ont été enregistrés",
    },
  }

  // Get translation for current language, fallback to English
  const t = (key) => {
    return (translations[currentLanguage] && translations[currentLanguage][key]) || translations.en[key]
  }

  const handleLanguageChange = (langCode) => {
    setCurrentLanguage(langCode)
    setShowLanguageDialog(false)

    toast({
      title: t("languageChanged"),
      description: t("languageChangedDesc"),
    })
  }

  const handleSaveSettings = () => {
    setShowSettingsDialog(false)

    toast({
      title: t("settingsUpdated"),
      description: t("settingsUpdatedDesc"),
    })
  }

  const getCurrentLanguageInfo = () => {
    return languages.find((lang) => lang.code === currentLanguage) || languages[0]
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>{t("description")}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{t("currentLanguage")}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl">{getCurrentLanguageInfo().flag}</span>
              <span>{getCurrentLanguageInfo().name}</span>
            </div>
          </div>
          <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Languages className="h-4 w-4 mr-2" />
                {t("changeLanguage")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("languageSettings")}</DialogTitle>
                <DialogDescription>Select your preferred language</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-2 py-4">
                {languages.map((language) => (
                  <Button
                    key={language.code}
                    variant="outline"
                    className={`justify-start h-auto py-3 ${currentLanguage === language.code ? "border-primary" : ""}`}
                    onClick={() => handleLanguageChange(language.code)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{language.flag}</span>
                      <span>{language.name}</span>
                    </div>
                    {currentLanguage === language.code && <Check className="h-4 w-4 ml-auto text-primary" />}
                  </Button>
                ))}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowLanguageDialog(false)}>
                  {t("cancel")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{t("regionalSettings")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {dateFormat === "mm/dd/yyyy" ? "MM/DD/YYYY" : "DD/MM/YYYY"},{" "}
              {measurementUnit === "imperial" ? "Imperial" : "Metric"}
            </p>
          </div>
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("regionalSettings")}</DialogTitle>
                <DialogDescription>Customize your regional preferences</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t("autoTranslate")}</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically translate meal descriptions to your language
                    </p>
                  </div>
                  <Switch checked={autoTranslate} onCheckedChange={setAutoTranslate} />
                </div>

                <div className="space-y-2">
                  <Label>{t("dateFormat")}</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("measurementUnit")}</Label>
                  <Select value={measurementUnit} onValueChange={setMeasurementUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="imperial">{t("imperial")}</SelectItem>
                      <SelectItem value="metric">{t("metric")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleSaveSettings}>{t("save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="meals">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="meals">Meal Translations</TabsTrigger>
            <TabsTrigger value="interface">Interface Language</TabsTrigger>
          </TabsList>
          <TabsContent value="meals" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Sample Meal Translation</h3>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Mediterranean Bowl</h4>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Translate className="h-3 w-3" />
                      {currentLanguage.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentLanguage === "en" &&
                      "Fresh falafel, hummus, tabbouleh, and roasted vegetables on a bed of quinoa."}
                    {currentLanguage === "es" &&
                      "Falafel fresco, hummus, tabulé y verduras asadas sobre una base de quinoa."}
                    {currentLanguage === "fr" &&
                      "Falafel frais, houmous, taboulé et légumes rôtis sur un lit de quinoa."}
                    {currentLanguage !== "en" &&
                      currentLanguage !== "es" &&
                      currentLanguage !== "fr" &&
                      "Fresh falafel, hummus, tabbouleh, and roasted vegetables on a bed of quinoa."}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-md border p-4">
              <div className="flex items-center gap-2 text-sm">
                <Translate className="h-4 w-4 text-primary" />
                <span>
                  {autoTranslate
                    ? "Meal descriptions are automatically translated to your selected language"
                    : "Automatic translation is disabled"}
                </span>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="interface" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Interface Elements</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground mb-1">Button</div>
                  <Button size="sm" className="w-full">
                    {t("save")}
                  </Button>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground mb-1">Dialog Title</div>
                  <h4 className="text-sm font-medium">{t("languageSettings")}</h4>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground mb-1">Label</div>
                  <Label>{t("dateFormat")}</Label>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground mb-1">Toast</div>
                  <div className="text-sm font-medium">{t("settingsUpdated")}</div>
                </div>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-primary" />
                <span>
                  {currentLanguage === "en"
                    ? "The interface is currently displayed in English"
                    : `The interface is currently displayed in ${getCurrentLanguageInfo().name}`}
                </span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {currentLanguage === "en"
            ? "Language preferences are saved to your account"
            : translations[currentLanguage]?.settingsUpdatedDesc || "Language preferences are saved to your account"}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Globe className="h-4 w-4 mr-2" />
              Quick Switch
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Select Language</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {languages.slice(0, 6).map((language) => (
              <DropdownMenuItem
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className="flex items-center gap-2"
              >
                <span className="text-base">{language.flag}</span>
                <span>{language.name}</span>
                {currentLanguage === language.code && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowLanguageDialog(true)}>View All Languages</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  )
}

