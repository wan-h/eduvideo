"use client"

import { insertInlineEquation } from "@platejs/math"
import { Sigma } from "lucide-react"
import { KEYS } from "platejs"
import { useEditorRef } from "platejs/react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { equationGroups } from "@/components/ui/equation-templates"
import { ToolbarButton } from "@/components/ui/toolbar"

export function EquationToolbarButton() {
  const editor = useEditorRef()

  const insertBlockFormula = (formula: string) => {
    editor.tf.insertNodes([
      {
        type: KEYS.equation,
        texExpression: formula,
        children: [{ text: "" }],
      },
      {
        type: KEYS.p,
        children: [{ text: "" }],
      },
    ])
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarButton tooltip="公式">
          <Sigma className="size-4" />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[60vh] w-56 overflow-y-auto">
        <DropdownMenuItem
          onClick={() =>
            editor.tf.insertNodes([
              {
                type: KEYS.equation,
                texExpression: "",
                children: [{ text: "" }],
              },
              {
                type: KEYS.p,
                children: [{ text: "" }],
              },
            ])
          }
        >
          块级公式
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => insertInlineEquation(editor, "", { select: true })}
        >
          行内公式
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {equationGroups.map((group) => (
          <DropdownMenuSub key={group.name}>
            <DropdownMenuSubTrigger>{group.name}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[60vh] w-56 overflow-y-auto">
              {group.categories.map((cat) => (
                <DropdownMenuGroup key={cat.category}>
                  <DropdownMenuLabel className="text-[10px] text-muted-foreground">
                    {cat.category}
                  </DropdownMenuLabel>
                  {cat.formulas.map((tpl) => (
                    <DropdownMenuItem
                      key={tpl.name}
                      className="flex flex-col items-start gap-0.5 py-1.5"
                      onClick={() => insertBlockFormula(tpl.formula)}
                    >
                      <span className="text-xs font-medium">{tpl.name}</span>
                      <span className="w-full truncate font-mono text-[10px] text-muted-foreground">
                        {tpl.formula}
                      </span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </DropdownMenuGroup>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
