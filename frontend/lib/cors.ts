import { NextResponse } from "next/server"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export function withCors(response: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

export function corsPreflightResponse() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export function corsJson(data: unknown, init?: ResponseInit) {
  return withCors(NextResponse.json(data, init))
}
