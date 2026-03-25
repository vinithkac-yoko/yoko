from .model import Pattern, Point, Line, Curve


class CommandError(Exception):
    pass


def execute_command(pattern: Pattern, cmd: dict) -> None:
    action = cmd.get("action")

    if action == "add_point":
        name = cmd["name"]
        pattern.points[name] = Point(float(cmd["x"]), float(cmd["y"]))

    elif action == "move_point":
        name = cmd["name"]
        if name not in pattern.points:
            raise CommandError(f"Point '{name}' not found")
        pattern.points[name].x = float(cmd["x"])
        pattern.points[name].y = float(cmd["y"])

    elif action == "add_line":
        fp = cmd["from_point"]
        tp = cmd["to_point"]
        if fp not in pattern.points:
            raise CommandError(f"Point '{fp}' not found")
        if tp not in pattern.points:
            raise CommandError(f"Point '{tp}' not found")
        pattern.lines.append(Line(fp, tp, cmd.get("style", "solid")))

    elif action == "add_curve":
        fp = cmd["from_point"]
        tp = cmd["to_point"]
        if fp not in pattern.points:
            raise CommandError(f"Point '{fp}' not found")
        if tp not in pattern.points:
            raise CommandError(f"Point '{tp}' not found")
        pattern.curves.append(Curve(
            fp, tp,
            float(cmd["c1x"]), float(cmd["c1y"]),
            float(cmd["c2x"]), float(cmd["c2y"]),
        ))

    elif action == "set_measurement":
        pattern.measurements[cmd["name"]] = float(cmd["value"])

    elif action == "delete_point":
        name = cmd["name"]
        if name not in pattern.points:
            raise CommandError(f"Point '{name}' not found")
        del pattern.points[name]
        pattern.lines = [
            ln for ln in pattern.lines
            if ln.from_point != name and ln.to_point != name
        ]
        pattern.curves = [
            cv for cv in pattern.curves
            if cv.from_point != name and cv.to_point != name
        ]

    elif action == "reset":
        _reset_to_default(pattern)

    else:
        raise CommandError(f"Unknown action: '{action}'")


def _reset_to_default(pattern: Pattern) -> None:
    pattern.measurements.clear()
    pattern.measurements.update({"bust": 92, "waist": 68, "hips": 96, "height": 168})
    pattern.points.clear()
    pattern.points.update({
        "A": Point(0, 0),
        "B": Point(200, 0),
        "C": Point(200, 300),
        "D": Point(0, 300),
    })
    pattern.lines.clear()
    pattern.lines.extend([
        Line("A", "B"),
        Line("B", "C"),
        Line("C", "D"),
        Line("D", "A"),
    ])
    pattern.curves.clear()


def make_default_pattern() -> Pattern:
    p = Pattern()
    _reset_to_default(p)
    return p
