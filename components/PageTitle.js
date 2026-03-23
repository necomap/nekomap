export default function PageTitle({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{
        display: "flex", alignItems: "center", gap: 10,
        color: "#3d3230", fontSize: 24, fontWeight: 700, margin: 0,
      }}>
        {icon && (
          <span style={{
            width: 40, height: 40, borderRadius: 12,
            background: "#fff0e8", display: "flex",
            alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {icon}
          </span>
        )}
        {title}
      </h1>
      {subtitle && (
        <p style={{ margin: "8px 0 0", color: "#9e7b6e", fontSize: 14 }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}