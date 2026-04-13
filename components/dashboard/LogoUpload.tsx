'use client'

import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_BYTES      = 5 * 1024 * 1024 // 5 MB

interface LogoUploadProps {
  /** Current logo URL — shown as preview on mount */
  currentLogoUrl?: string | null
  /** Pass businessId when editing an existing business (settings) */
  businessId?:     string
  /** Pass userId during onboarding before businessId exists */
  userId?:         string
  /** Called with the processed logo URL after a successful upload */
  onUploaded:      (url: string) => void
}

export function LogoUpload({
  currentLogoUrl,
  businessId,
  userId,
  onUploaded,
}: LogoUploadProps) {
  const [preview,   setPreview]   = useState<string | null>(currentLogoUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please upload a JPG, PNG, WebP or SVG — up to 5 MB.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('File is too large. Maximum size is 5 MB.')
      return
    }

    setError(null)
    setUploading(true)

    // Show raw local preview immediately for responsiveness
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    try {
      const fd = new FormData()
      fd.append('file', file)
      if (businessId) fd.append('businessId', businessId)
      if (userId)     fd.append('userId',     userId)

      const res = await fetch('/api/logo/process', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error ?? 'Upload failed')

      // Replace local blob URL with the permanent processed URL
      URL.revokeObjectURL(localUrl)
      setPreview(json.logoUrl)
      onUploaded(json.logoUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      // Revert preview on failure
      URL.revokeObjectURL(localUrl)
      setPreview(currentLogoUrl ?? null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {/* Upload zone */}
      <button
        type="button"
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          width:          120,
          height:         120,
          borderRadius:   18,
          border:         preview
            ? '1.5px solid rgba(255,255,255,0.18)'
            : '1.5px dashed rgba(255,255,255,0.22)',
          background:     preview ? 'transparent' : 'rgba(255,255,255,0.04)',
          position:       'relative',
          overflow:       'hidden',
          cursor:         uploading ? 'wait' : 'pointer',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            6,
          padding:        0,
          flexShrink:     0,
        }}
        aria-label="Upload logo"
      >
        {preview ? (
          <>
            {/* Logo image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Logo preview"
              style={{
                position:   'absolute',
                inset:      0,
                width:      '100%',
                height:     '100%',
                objectFit:  'cover',
                display:    'block',
              }}
            />
            {/* Specular highlight over the preview so it looks like the icon */}
            <div
              style={{
                position:     'absolute',
                top:          0,
                left:         0,
                right:        0,
                height:       '45%',
                background:   'linear-gradient(to bottom, rgba(255,255,255,0.24) 0%, transparent 100%)',
                borderRadius: '16px 16px 60% 60% / 16px 16px 36px 36px',
                pointerEvents: 'none',
              }}
            />
            {/* Hover overlay to hint at replaceability */}
            <div
              style={{
                position:       'absolute',
                inset:          0,
                background:     'rgba(0,0,0,0)',
                transition:     'background 0.15s',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
              }}
              className="logo-hover-overlay"
            />
          </>
        ) : (
          <>
            <Upload size={20} style={{ color: 'rgba(255,255,255,0.38)' }} />
            <span
              style={{
                fontSize:   11,
                fontWeight: 600,
                color:      'rgba(255,255,255,0.38)',
              }}
            >
              Upload logo
            </span>
          </>
        )}

        {/* Uploading spinner */}
        {uploading && (
          <div
            style={{
              position:       'absolute',
              inset:          0,
              background:     'rgba(0,0,0,0.55)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              borderRadius:   'inherit',
            }}
          >
            <div
              className="animate-spin"
              style={{
                width:       22,
                height:      22,
                borderRadius: 11,
                border:      '2.5px solid #D4AF37',
                borderTopColor: 'transparent',
              }}
            />
          </div>
        )}
      </button>

      {/* Remove / hint text */}
      {preview && !uploading && (
        <button
          type="button"
          onClick={() => {
            setPreview(null)
            setError(null)
          }}
          style={{
            background:    'none',
            border:        'none',
            cursor:        'pointer',
            fontSize:      11,
            color:         'rgba(255,255,255,0.32)',
            padding:       0,
            textDecoration: 'underline',
          }}
        >
          Remove
        </button>
      )}
      {!preview && !uploading && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', margin: 0 }}>
          JPG, PNG, WebP or SVG · max 5 MB
        </p>
      )}

      {/* Error message */}
      {error && (
        <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = '' // allow re-selecting same file
        }}
      />
    </div>
  )
}
