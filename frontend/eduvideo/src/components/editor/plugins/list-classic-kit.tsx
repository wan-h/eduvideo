"use client"

import {
  BulletedListPlugin,
  ListItemContentPlugin,
  ListItemPlugin,
  ListPlugin,
  NumberedListPlugin,
} from "@platejs/list-classic/react"

import {
  BulletedListElement,
  ListItemContentElement,
  ListItemElement,
  NumberedListElement,
} from "@/components/ui/list-classic-node"

export const ListClassicKit = [
  ListPlugin,
  BulletedListPlugin.configure({
    node: { component: BulletedListElement },
  }),
  NumberedListPlugin.configure({
    node: { component: NumberedListElement },
  }),
  ListItemPlugin.withComponent(ListItemElement),
  ListItemContentPlugin.withComponent(ListItemContentElement),
]
