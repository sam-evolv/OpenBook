/**
 * Home pins — businesses a customer has chosen to keep on their home
 * screen. See supabase/migrations/pins_01_home_pins_table.sql.
 *
 * Explore is the catalog; home is curated. The home screen renders pins
 * ordered by pinned_at DESC. Auto-pin fires silently from successful
 * bookings (see /api/booking and /api/open-spots/[saleId]/claim).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Business } from './supabase';

export type HomePin = {
  business_id: string;
  pinned_at: string;
  notifications_enabled: boolean;
};

/**
 * Hydrated form returned by GET /api/home-pins and used to render the
 * home screen — includes enough of the business row to draw the tile
 * without a second fetch.
 */
export type HomePinWithBusiness = HomePin & {
  business: Pick<
    Business,
    | 'id'
    | 'slug'
    | 'name'
    | 'category'
    | 'primary_colour'
    | 'logo_url'
    | 'processed_icon_url'
    | 'is_live'
  >;
};

/**
 * Server-side fetch used by the home page render. Returns pins sorted by
 * pinned_at DESC. Filters out pins whose business is no longer live so
 * the home screen never shows a dead tile.
 */
export async function fetchHomePins(
  sb: SupabaseClient,
  customerId: string,
): Promise<HomePinWithBusiness[]> {
  const { data, error } = await sb
    .from('home_pins')
    .select(
      `
      business_id,
      pinned_at,
      notifications_enabled,
      business:businesses!inner (
        id,
        slug,
        name,
        category,
        primary_colour,
        logo_url,
        processed_icon_url,
        is_live
      )
      `,
    )
    .eq('customer_id', customerId)
    .order('pinned_at', { ascending: false });

  if (error || !data) return [];

  return data
    .map((row) => {
      const businessJoin = (row as { business: unknown }).business;
      const business = (Array.isArray(businessJoin)
        ? businessJoin[0]
        : businessJoin) as HomePinWithBusiness['business'] | null;
      if (!business) return null;
      return {
        business_id: row.business_id as string,
        pinned_at: row.pinned_at as string,
        notifications_enabled: row.notifications_enabled as boolean,
        business,
      };
    })
    .filter(
      (pin): pin is HomePinWithBusiness =>
        pin !== null && pin.business.is_live === true,
    );
}

/**
 * Best-effort auto-pin after a successful booking. Idempotent — uses
 * upsert with ignoreDuplicates so re-pinning the same business is a
 * no-op. NEVER throws: a network blip on this insert must not fail the
 * booking, which is the critical path.
 *
 * Call from /api/booking and /api/open-spots/[saleId]/claim after the
 * booking row is committed.
 */
export async function autoPinAfterBooking(
  sb: SupabaseClient,
  args: { customerId: string; businessId: string },
): Promise<void> {
  try {
    const { error } = await sb.from('home_pins').upsert(
      {
        customer_id: args.customerId,
        business_id: args.businessId,
      },
      {
        onConflict: 'customer_id,business_id',
        ignoreDuplicates: true,
      },
    );
    if (error) {
      console.warn('[auto-pin] upsert failed (booking continues):', {
        customerId: args.customerId,
        businessId: args.businessId,
        message: error.message,
      });
    }
  } catch (err) {
    console.warn('[auto-pin] threw (booking continues):', err);
  }
}
