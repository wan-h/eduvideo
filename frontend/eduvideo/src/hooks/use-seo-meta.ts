import { useEffect } from "react"

type MetaTag = {
  key: string
  attr: "name" | "property"
  value: string
}

type SeoConfig = {
  title?: string
  meta?: MetaTag[]
  structuredData?: readonly Record<string, unknown>[]
  canonicalUrl?: string
}

function upsertMetaTag({ key, attr, value }: MetaTag) {
  const selector = `meta[${attr}="${key}"]`
  let meta = document.head.querySelector<HTMLMetaElement>(selector)

  if (!meta) {
    meta = document.createElement("meta")
    meta.setAttribute(attr, key)
    document.head.appendChild(meta)
  }

  meta.setAttribute("content", value)
}

export function useSeoMeta(config: SeoConfig) {
  useEffect(() => {
    if (config.title === undefined) return

    const previousTitle = document.title
    document.title = config.title

    return () => {
      document.title = previousTitle
    }
  }, [config.title])

  useEffect(() => {
    if (!config.meta) return

    const previous: Array<{
      key: string
      attr: "name" | "property"
      value: string | null
    }> = []

    config.meta.forEach(({ key, attr, value }) => {
      const selector = `meta[${attr}="${key}"]`
      const existing = document.head.querySelector<HTMLMetaElement>(selector)
      previous.push({
        key,
        attr,
        value: existing?.getAttribute("content") ?? null,
      })
      upsertMetaTag({ key, attr, value })
    })

    return () => {
      previous.forEach(({ key, attr, value }) => {
        if (value === null) {
          document.head
            .querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
            ?.remove()
        } else {
          upsertMetaTag({ key, attr, value })
        }
      })
    }
  }, [config.meta])

  useEffect(() => {
    if (!config.structuredData) return

    const scripts: HTMLScriptElement[] = []

    config.structuredData.forEach((data) => {
      const script = document.createElement("script")
      script.type = "application/ld+json"
      script.text = JSON.stringify(data)
      document.head.appendChild(script)
      scripts.push(script)
    })

    return () => {
      scripts.forEach((script) => script.remove())
    }
  }, [config.structuredData])

  useEffect(() => {
    if (config.canonicalUrl === undefined) return

    const selector = 'link[rel="canonical"]'
    const existing = document.head.querySelector<HTMLLinkElement>(selector)
    const previousHref = existing?.getAttribute("href") ?? null

    let link = existing
    if (!link) {
      link = document.createElement("link")
      link.setAttribute("rel", "canonical")
      document.head.appendChild(link)
    }

    link.setAttribute("href", config.canonicalUrl)

    return () => {
      if (previousHref === null) {
        document.head.querySelector<HTMLLinkElement>(selector)?.remove()
      } else {
        const restored = document.head.querySelector<HTMLLinkElement>(selector)
        if (restored) restored.setAttribute("href", previousHref)
      }
    }
  }, [config.canonicalUrl])
}
