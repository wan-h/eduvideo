import { isEmpty } from "lodash-es"
import { useMemo } from "react"

import { useResolutionScale } from "../hooks/use-resolution-scale"
import { MdRenderer } from "../markdown/md-renderer"
import { THEME } from "../styles/theme"

export interface SolutionProps {
  title: string
  content: string
}

export function Solution({ title, content }: SolutionProps) {
  const scale = useResolutionScale()

  const { images, cleanContent } = useMemo(() => {
    const imgs: { alt: string; src: string }[] = []
    const imgRegex = /!\[(.*?)\]\((.*?)\)/g
    let match
    let textContent = content || ""
    while ((match = imgRegex.exec(textContent)) !== null) {
      imgs.push({ alt: match[1], src: match[2] })
    }
    textContent = textContent.replace(imgRegex, "").trim()

    const htmlImgRegex = /<img\s+[^>]*src="([^"]*)"[^>]*>/gi
    let htmlMatch
    while ((htmlMatch = htmlImgRegex.exec(textContent)) !== null) {
      const altMatch = htmlMatch[0].match(/alt="([^"]*)"/i)
      imgs.push({ alt: altMatch ? altMatch[1] : "", src: htmlMatch[1] })
    }
    textContent = textContent.replace(htmlImgRegex, "").trim()

    return { images: imgs, cleanContent: textContent }
  }, [content])

  const hasImage = images.length > 0

  if (hasImage) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: "100%",
          gap: `${40 * scale}px`,
          alignItems: "center",
        }}
      >
        {/* Left Side: Title and Text */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: `${16 * scale}px`,
          }}
        >
          {!isEmpty(title) && (
            <div
              style={{
                fontSize: 28 * scale,
                fontWeight: 700,
                color: THEME.colors.chalkYellow,
                textShadow: THEME.textShadow.chalk,
                letterSpacing: THEME.letterSpacing,
              }}
            >
              {title}
            </div>
          )}
          {!isEmpty(cleanContent) && (
            <MdRenderer
              content={cleanContent}
              fontSize={28 * scale}
              lineHeight={1.7}
              color={THEME.colors.chalkWhite}
            />
          )}
        </div>

        {/* Right Side: Images */}
        <div
          style={{
            width: "45%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: `${16 * scale}px`,
            maxHeight: "100%",
          }}
        >
          {images.map((img, idx) => (
            <img
              key={idx}
              src={img.src}
              alt={img.alt}
              style={{
                maxWidth: "100%",
                maxHeight:
                  images.length > 1 ? `${300 * scale}px` : `${500 * scale}px`,
                objectFit: "contain",
                borderRadius: `${8 * scale}px`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        gap: `${16 * scale}px`,
      }}
    >
      {!isEmpty(title) && (
        <div
          style={{
            fontSize: 28 * scale,
            fontWeight: 700,
            color: THEME.colors.chalkYellow,
            textShadow: THEME.textShadow.chalk,
            letterSpacing: THEME.letterSpacing,
          }}
        >
          {title}
        </div>
      )}
      {!isEmpty(content) && (
        <MdRenderer
          content={content}
          fontSize={28 * scale}
          lineHeight={1.7}
          color={THEME.colors.chalkWhite}
        />
      )}
    </div>
  )
}
