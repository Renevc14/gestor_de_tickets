/**
 * TicketFlow Logo — SVG component reutilizable
 * Ticket shape con notches laterales + rayo centrado
 */

const TicketFlowLogo = ({ size = 32, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Fondo dorado con esquinas redondeadas */}
    <rect width="32" height="32" rx="7" fill="#F0B90B" />

    {/*
      Forma de ticket con notches semicirculares en los lados:
      - Notch derecho: arco CW desde (28,13) hasta (28,19) → curva hacia adentro
      - Notch izquierdo: arco CCW desde (4,19) hasta (4,13) → curva hacia adentro
    */}
    <path
      d="M4 9H28V13A2.5 2.5 0 0 0 28 19V23H4V19A2.5 2.5 0 0 1 4 13Z"
      fill="#0B0E11"
    />

    {/* Línea de perforación vertical punteada */}
    <line x1="12.5" y1="9" x2="12.5" y2="23" stroke="#F0B90B" strokeWidth="0.8" strokeDasharray="2 1.8" />

    {/* Rayo (zona derecha del ticket = stub principal) */}
    <path
      d="M20 12.5H17L15 17H17.5L15 21.5L22 16H18.5L20 12.5Z"
      fill="#F0B90B"
    />
  </svg>
);

export default TicketFlowLogo;
