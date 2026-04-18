type Props = { params: { serviceId: string } };

export default function BookingSlotPage({ params }: Props) {
  return (
    <div style={{ padding: 24, color: '#888' }}>
      <h1 style={{ color: '#f0f0f0', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Pick a time
      </h1>
      <p>Service {params.serviceId} — coming soon</p>
    </div>
  );
}
