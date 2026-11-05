import { zhToEn } from "@/i18n/translations"
import * as React from "react"

export type AppLanguage = "zh-CN" | "en"

type LanguageContextValue = {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
  toggleLanguage: () => void
  translate: (source: string) => string
}

const STORAGE_KEY = "app-language"
const CHINESE_PATTERN = /[\u3400-\u9fff]/
const TRANSLATABLE_ATTRIBUTES = ["aria-label", "placeholder", "title"] as const
const SKIP_ELEMENT_SELECTOR =
  "[data-no-translate], [translate='no'], script, style, code, pre, [contenteditable='true']"
const SKIP_TEXT_SELECTOR = `${SKIP_ELEMENT_SELECTOR}, textarea`

const LanguageContext = React.createContext<LanguageContextValue | undefined>(
  undefined
)

function getInitialLanguage(): AppLanguage {
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "zh-CN"
}

export function translateChinese(source: string): string {
  if (!CHINESE_PATTERN.test(source)) return source

  const leading = source.match(/^\s*/)?.[0] ?? ""
  const trailing = source.match(/\s*$/)?.[0] ?? ""
  const content = source.slice(leading.length, source.length - trailing.length)
  const exact = zhToEn[content as keyof typeof zhToEn]
  if (exact) return `${leading}${exact}${trailing}`

  let translated = content
  const entries = Object.entries(zhToEn).sort(
    ([left], [right]) => right.length - left.length
  )
  for (const [chinese, english] of entries) {
    translated = translated.replaceAll(chinese, english)
  }
  return CHINESE_PATTERN.test(translated)
    ? source
    : `${leading}${translated}${trailing}`
}

function canTranslateText(node: Text): boolean {
  return !node.parentElement?.closest(SKIP_TEXT_SELECTOR)
}

function canTranslateElement(element: Element): boolean {
  return !element.closest(SKIP_ELEMENT_SELECTOR)
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState(getInitialLanguage)
  const textRecords = React.useRef(
    new Map<Text, { source: string; translated: string }>()
  )
  const attributeRecords = React.useRef(
    new Map<Element, Map<string, { source: string; translated: string }>>()
  )

  const setLanguage = React.useCallback((nextLanguage: AppLanguage) => {
    window.localStorage.setItem(STORAGE_KEY, nextLanguage)
    setLanguageState(nextLanguage)
  }, [])

  const toggleLanguage = React.useCallback(() => {
    setLanguage(language === "zh-CN" ? "en" : "zh-CN")
  }, [language, setLanguage])

  React.useEffect(() => {
    document.documentElement.lang = language

    const translateTextNode = (node: Text) => {
      if (!canTranslateText(node) || !node.nodeValue) return
      const existing = textRecords.current.get(node)
      const source =
        existing && node.nodeValue === existing.translated
          ? existing.source
          : node.nodeValue
      const translated = translateChinese(source)
      textRecords.current.set(node, { source, translated })
      if (node.nodeValue !== translated) node.nodeValue = translated
    }

    const translateElement = (element: Element) => {
      if (!canTranslateElement(element)) return
      const records = attributeRecords.current.get(element) ?? new Map()
      for (const attribute of TRANSLATABLE_ATTRIBUTES) {
        const value = element.getAttribute(attribute)
        if (!value) continue
        const existing = records.get(attribute)
        const source =
          existing && value === existing.translated ? existing.source : value
        const translated = translateChinese(source)
        records.set(attribute, { source, translated })
        if (value !== translated) element.setAttribute(attribute, translated)
      }
      if (records.size) attributeRecords.current.set(element, records)
    }

    const translateTree = (root: Node) => {
      if (
        root.nodeType === Node.ELEMENT_NODE &&
        !canTranslateElement(root as Element)
      )
        return
      if (root.nodeType === Node.TEXT_NODE) translateTextNode(root as Text)
      if (root.nodeType === Node.ELEMENT_NODE) translateElement(root as Element)

      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
      )
      let current = walker.nextNode()
      while (current) {
        if (current.nodeType === Node.TEXT_NODE)
          translateTextNode(current as Text)
        else translateElement(current as Element)
        current = walker.nextNode()
      }
    }

    const restoreChinese = () => {
      for (const [node, record] of textRecords.current) {
        if (node.isConnected && node.nodeValue === record.translated)
          node.nodeValue = record.source
      }
      for (const [element, records] of attributeRecords.current) {
        if (!element.isConnected) continue
        for (const [attribute, record] of records) {
          if (element.getAttribute(attribute) === record.translated)
            element.setAttribute(attribute, record.source)
        }
      }
    }

    if (language === "zh-CN") {
      restoreChinese()
      return undefined
    }

    translateTree(document.body)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text)
          continue
        }
        if (mutation.type === "attributes") {
          translateElement(mutation.target as Element)
          continue
        }
        mutation.addedNodes.forEach(translateTree)
      }
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    })

    return () => observer.disconnect()
  }, [language])

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      setLanguageState(event.newValue === "en" ? "en" : "zh-CN")
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const value = React.useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      translate:
        language === "en" ? translateChinese : (source: string) => source,
    }),
    [language, setLanguage, toggleLanguage]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = React.useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
