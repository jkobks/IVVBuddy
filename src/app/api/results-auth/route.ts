import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const password = formData.get('password')

  const expected = process.env.RESULTS_PASSWORT
  const url = new URL('/results', request.url)

  if (!expected || password !== expected) {
    url.searchParams.set('error', '1')
    return NextResponse.redirect(url)
  }

  const response = NextResponse.redirect(url)
  response.cookies.set('results_auth', expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12h
  })
  return response
}
