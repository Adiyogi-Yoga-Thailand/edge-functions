import { Context } from "netlify:edge"

import { Base64 } from "https://deno.land/x/bb64@1.1.0/mod.ts"
import * as FaunaDB from "https://deno.land/x/fauna@5.0.0-deno-alpha9/mod.ts"

import Register from "./messages/register.ts"

export default async (request: Request, context: Context) => {
  if (request.method !== "POST") {
    return new Response("This API accepets only POST request.", {
      status: 400,
    })
  }

  const env = Deno.env.toObject()
  const basicAuth = `${env.AUTH_USERNAME}:${env.AUTH_PASSWORD}`
  const auth64 = `Basic ${Base64.fromString(basicAuth).toString()}`
  const header = new Headers(request.headers)
  if (header.get("authorization") !== auth64) {
    return new Response("Unauthorized.", { status: 403 })
  }

  try {
    const json = await request.json()
    const message = await handleFulfillment(json) || []
    return new Response(JSON.stringify({ fulfillmentMessages: message }))
  } catch (e) {
    return new Response(e.message, { status: 500 })
  }
}

async function handleFulfillment(json: any): Promise<any> {
  if (json.queryResult.action === "Register.Start") {
    return [
      {
        payload: {
          line: {
            type: "text",
            text: Register.start[0],
          },
        },
      },
      {
        payload: {
          line: {
            type: "text",
            text: Register.start[1],
          },
        },
      },
    ]
  } else if (json.queryResult.action === "Register.SlotFilling") {
    const params = json.queryResult.parameters
    const q = FaunaDB.query
    const client = new FaunaDB.Client({
      secret: `${Deno.env.get("FAUNADB_SERVER_SECRET")}`,
    })
    const doc = await client.query(
      q.Create(q.Collection("users"), {
        data: {
          firstname: params.firstname,
          lastname: params.lastname,
          nickname: params.nickname,
          telno: params.telno,
          address: params.address,
        },
      })
    )
    return [
      {
        payload: {
          line: {
            type: "text",
            text: Register.slotFilling[0](
              params.firstname,
              params.lastname,
              params.nickname,
              params.telno,
              params.address
            ),
          },
        },
      },
      {
        payload: {
          line: {
            type: "text",
            text: Register.slotFilling[1],
          },
        },
      },
    ]
  }
}
