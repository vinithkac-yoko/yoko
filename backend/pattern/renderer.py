from .model import Pattern

SCALE = 4          # px per mm
PADDING = 60       # px padding around pattern
VIEWPORT_W = 800
VIEWPORT_H = 900
GRID_STEP = 10     # mm


def render(pattern: Pattern) -> str:
    pts = pattern.points

    if pts:
        min_x = min(p.x for p in pts.values())
        min_y = min(p.y for p in pts.values())
        max_x = max(p.x for p in pts.values())
        max_y = max(p.y for p in pts.values())
    else:
        min_x = min_y = 0
        max_x = max_y = 100

    # offset so pattern starts at (PADDING, PADDING)
    ox = PADDING - min_x * SCALE
    oy = PADDING - min_y * SCALE

    def tx(x):
        return ox + x * SCALE

    def ty(y):
        return oy + y * SCALE

    lines_svg = []

    # --- grid ---
    grid_x0 = int(min_x // GRID_STEP) * GRID_STEP - GRID_STEP
    grid_y0 = int(min_y // GRID_STEP) * GRID_STEP - GRID_STEP
    grid_x1 = int(max_x // GRID_STEP) * GRID_STEP + GRID_STEP * 2
    grid_y1 = int(max_y // GRID_STEP) * GRID_STEP + GRID_STEP * 2

    gx = grid_x0
    while gx <= grid_x1:
        lines_svg.append(
            f'<line x1="{tx(gx):.1f}" y1="{ty(grid_y0):.1f}" '
            f'x2="{tx(gx):.1f}" y2="{ty(grid_y1):.1f}" '
            f'stroke="#e0e0e0" stroke-width="1"/>'
        )
        gx += GRID_STEP

    gy = grid_y0
    while gy <= grid_y1:
        lines_svg.append(
            f'<line x1="{tx(grid_x0):.1f}" y1="{ty(gy):.1f}" '
            f'x2="{tx(grid_x1):.1f}" y2="{ty(gy):.1f}" '
            f'stroke="#e0e0e0" stroke-width="1"/>'
        )
        gy += GRID_STEP

    # --- lines ---
    for ln in pattern.lines:
        if ln.from_point in pts and ln.to_point in pts:
            p1 = pts[ln.from_point]
            p2 = pts[ln.to_point]
            dash = 'stroke-dasharray="6,3"' if ln.style == "dashed" else ""
            lines_svg.append(
                f'<line x1="{tx(p1.x):.1f}" y1="{ty(p1.y):.1f}" '
                f'x2="{tx(p2.x):.1f}" y2="{ty(p2.y):.1f}" '
                f'stroke="#1a1a2e" stroke-width="2" {dash}/>'
            )

    # --- curves ---
    for cv in pattern.curves:
        if cv.from_point in pts and cv.to_point in pts:
            p1 = pts[cv.from_point]
            p2 = pts[cv.to_point]
            lines_svg.append(
                f'<path d="M {tx(p1.x):.1f} {ty(p1.y):.1f} '
                f'C {tx(cv.c1x):.1f} {ty(cv.c1y):.1f}, '
                f'{tx(cv.c2x):.1f} {ty(cv.c2y):.1f}, '
                f'{tx(p2.x):.1f} {ty(p2.y):.1f}" '
                f'fill="none" stroke="#1a1a2e" stroke-width="2"/>'
            )

    # --- points ---
    for name, pt in pts.items():
        lines_svg.append(
            f'<circle cx="{tx(pt.x):.1f}" cy="{ty(pt.y):.1f}" r="4" '
            f'fill="#16213e" stroke="white" stroke-width="1.5"/>'
        )
        lines_svg.append(
            f'<text x="{tx(pt.x) + 7:.1f}" y="{ty(pt.y) - 7:.1f}" '
            f'font-family="monospace" font-size="12" fill="#16213e">{name}</text>'
        )

    # --- measurements legend ---
    if pattern.measurements:
        legend = ['<g transform="translate(10, 10)">',
                  '<rect width="160" height="' + str(len(pattern.measurements) * 18 + 10) + '" '
                  'fill="white" fill-opacity="0.85" rx="4"/>']
        for i, (k, v) in enumerate(pattern.measurements.items()):
            legend.append(
                f'<text x="8" y="{16 + i * 18}" font-family="monospace" '
                f'font-size="11" fill="#333">{k}: {v}</text>'
            )
        legend.append('</g>')
        lines_svg.extend(legend)

    inner = "\n  ".join(lines_svg)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{VIEWPORT_W}" height="{VIEWPORT_H}" '
        f'style="background:#fafafa">\n  {inner}\n</svg>'
    )
