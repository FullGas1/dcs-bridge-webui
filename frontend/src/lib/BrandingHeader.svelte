<!--
  Generic, hand-drawn artwork only (an abstract rotary-wing silhouette + a "bridge/link" icon) -
  no official DCS World / Eagle Dynamics logos or assets (grill-with-docs decision, trademark risk).
-->
<div class="branding-header" role="img" aria-label="dcs-bridge-webui: a helicopter linked to a bridge server">
  <svg viewBox="0 0 640 120" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <!-- abstract rotary-wing silhouette -->
    <g class="aircraft">
      <line x1="40" y1="30" x2="140" y2="30" stroke-width="4" stroke-linecap="round" />
      <circle cx="90" cy="30" r="5" />
      <line x1="90" y1="30" x2="90" y2="46" stroke-width="4" />
      <ellipse cx="90" cy="66" rx="46" ry="18" />
      <path d="M 132 66 L 168 60 L 168 72 Z" />
      <line x1="70" y1="86" x2="70" y2="96" stroke-width="4" stroke-linecap="round" />
      <line x1="110" y1="86" x2="110" y2="96" stroke-width="4" stroke-linecap="round" />
      <line x1="58" y1="98" x2="122" y2="98" stroke-width="4" stroke-linecap="round" />
    </g>

    <!-- link / bridge motif -->
    <g class="link">
      <line x1="220" y1="70" x2="420" y2="70" stroke-width="3" stroke-dasharray="10 8" stroke-linecap="round" />
      <path d="M 400 60 L 420 70 L 400 80" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- dcs-serve node -->
    <g class="server">
      <rect x="460" y="40" width="80" height="60" rx="8" stroke-width="3" fill="none" />
      <line x1="472" y1="58" x2="528" y2="58" stroke-width="3" stroke-linecap="round" />
      <line x1="472" y1="72" x2="528" y2="72" stroke-width="3" stroke-linecap="round" />
      <circle cx="500" cy="86" r="4" class="pulse" />
    </g>
  </svg>
</div>

<style>
  .branding-header {
    display: flex;
    justify-content: center;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
  }

  svg {
    width: 100%;
    max-width: 420px;
    height: auto;
  }

  .aircraft,
  .link,
  .server {
    fill: var(--text-h);
    stroke: var(--text-h);
  }

  .pulse {
    fill: var(--accent);
    stroke: none;
  }
</style>
