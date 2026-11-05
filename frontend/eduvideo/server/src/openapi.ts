import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi"
import type { OpenAPIObject } from "openapi3-ts/oas30"

export const registry = new OpenAPIRegistry()

export function generateOpenAPIDoc(): OpenAPIObject {
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Ask2Vid Render API",
    },
    servers: [{ url: "/api" }],
  })
}
