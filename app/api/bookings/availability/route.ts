import { NextRequest, NextResponse } from 'next/server'
import { getAvailability } from '@/lib/availability'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const businessId = searchParams.get('business_id')
  const serviceId = searchParams.get('service_id')
  const date = searchParams.get('date')

  if (!businessId || !serviceId || !date) {
    return NextResponse.json(
      { error: 'Missing required params: business_id, service_id, date' },
      { status: 400 }
    )
  }

  const result = await getAvailability(businessId, serviceId, date)
  return NextResponse.json(result)
}
