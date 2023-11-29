import { FastifyInstance } from "fastify"
import { Components } from "./types.js"



export const registerComponents = (fastify: FastifyInstance, components?: Components) => {
  
  if (!components)
  {
    return;
  }
  
  for(const [key, value] of Object.entries(components.schemas))
  {    
    fastify.addSchema({
      $id: `#/components/schemas/${key}`,
      //$schema: "https://json-schema.org/draft/2020-12/schema",
      ...value
    })
  }
}