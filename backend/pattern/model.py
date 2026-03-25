from dataclasses import dataclass, field


@dataclass
class Point:
    x: float
    y: float


@dataclass
class Line:
    from_point: str
    to_point: str
    style: str = "solid"


@dataclass
class Curve:
    from_point: str
    to_point: str
    c1x: float
    c1y: float
    c2x: float
    c2y: float


@dataclass
class Pattern:
    measurements: dict = field(default_factory=dict)
    points: dict = field(default_factory=dict)
    lines: list = field(default_factory=list)
    curves: list = field(default_factory=list)
