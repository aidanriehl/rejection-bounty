/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

const LOGO_URL = 'https://uxjjfbxpednwxggeicld.supabase.co/storage/v1/object/public/email-assets/logo.png'

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  token,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Rejection Bounty code{token ? `: ${token}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Rejection Bounty" width="48" height="48" style={logo} />
        <Heading style={h1}>Welcome aboard</Heading>
        <Text style={text}>
          Enter this code to confirm your email and get started with Rejection Bounty.
        </Text>
        {token ? (
          <Text style={codeStyle}>{token}</Text>
        ) : (
          <Text style={errorText}>Code unavailable — please request a new one.</Text>
        )}
        <Text style={footer}>
          Didn't sign up? Just ignore this email, no worries.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { marginBottom: '24px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#171717',
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: '#737373',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const codeStyle = {
  fontFamily: "'SF Mono', Courier, monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: 'hsl(164, 72%, 40%)',
  letterSpacing: '4px',
  margin: '0 0 28px',
}
const errorText = {
  fontSize: '14px',
  color: '#ef4444',
  fontWeight: 'bold' as const,
  margin: '0 0 24px',
}
const footer = { fontSize: '12px', color: '#a3a3a3', margin: '28px 0 0' }
