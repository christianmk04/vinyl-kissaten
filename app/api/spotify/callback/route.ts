import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/?spotify_error=' + error, req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?spotify_error=no_code', req.url))
  }

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(
      new URL('/?spotify_error=missing_config', req.url),
    )
  }

  // The code_verifier is stored client-side in sessionStorage.
  // With PKCE, the token exchange must happen client-side since we have the verifier there.
  // We redirect back with the code so the client can complete the exchange.
  const redirectUrl = new URL('/', req.url)
  redirectUrl.searchParams.set('spotify_code', code)

  return NextResponse.redirect(redirectUrl)
}
