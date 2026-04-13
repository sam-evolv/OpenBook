'use client'

import { useState } from 'react'
import { tokens } from '@/lib/types'
import { LogoUpload } from '@/components/dashboard/LogoUpload'
import LiquidGlassIcon from '@/components/consumer/LiquidGlassIcon'

interface Props {
  businessId:     string
  businessName:   string
  currentLogoUrl: string | null
  primaryColour:  string
}

export function BrandSettingsClient({
  businessId,
  businessName,
  currentLogoUrl,
  primaryColour,
}: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl)
  const [saved,   setSaved]   = useState(false)

  const initials = businessName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  function handleUploaded(url: string) {
    setLogoUrl(url)
    setSaved(true)
    // Auto-dismiss "saved" indicator
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div
      className="rounded-2xl p-6 space-y-6"
      style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
    >
      <div className="flex items-start gap-8 flex-wrap">
        {/* Upload zone */}
        <div>
          <p className="text-xs font-medium mb-3" style={{ color: tokens.text2 }}>
            Logo
          </p>
          <LogoUpload
            currentLogoUrl={logoUrl}
            businessId={businessId}
            onUploaded={handleUploaded}
          />
        </div>

        {/* Live icon preview */}
        <div>
          <p className="text-xs font-medium mb-3" style={{ color: tokens.text2 }}>
            Home screen preview
          </p>
          <LiquidGlassIcon
            initials={initials}
            primaryColour={primaryColour}
            label={businessName}
            logoUrl={logoUrl}
          />
        </div>
      </div>

      {/* How it works hint */}
      <div
        className="rounded-xl p-4"
        style={{ background: tokens.surface2, border: `1px solid ${tokens.border}` }}
      >
        <p className="text-xs" style={{ color: tokens.text2 }}>
          <span className="font-semibold text-white">How it works:</span>{' '}
          Your logo is cropped to a 512×512 square with rounded corners and a liquid glass
          specular highlight. It replaces initials on the OpenBook consumer home screen for
          everyone who has saved your business.
        </p>
      </div>

      {saved && (
        <p className="text-xs font-semibold" style={{ color: '#22c55e' }}>
          ✓ Logo updated and saved
        </p>
      )}
    </div>
  )
}
