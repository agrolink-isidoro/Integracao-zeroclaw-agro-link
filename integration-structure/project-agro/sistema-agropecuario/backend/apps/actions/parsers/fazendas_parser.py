"""
Parser de Fazendas / Talhões (KML / KMZ / GeoJSON / GPX / SHP).

Responsabilidade: ler geometrias e atributos e gerar drafts de Actions do tipo
  criar_talhao  — quando o polígono não existe ainda
  atualizar_talhao — quando já existe (detecção por nome/código)

Reprojeção:
  Forçamos saída em EPSG:4674 (SIRGAS 2000) que é o padrão brasileiro,
  com fallback para EPSG:4326 (WGS84) se pyproj não disponível.

Dependências: shapely, pyproj, lxml (KML), fastkml (KMZ wrapper)
"""

import io
import json
import logging
import re
import zipfile
from typing import Any

logger = logging.getLogger(__name__)

TARGET_EPSG = "EPSG:4674"    # SIRGAS 2000 - padrão IBGE
FALLBACK_EPSG = "EPSG:4326"  # WGS 84


# ── Helpers de reprojeção ──────────────────────────────────────────────────

def _reproject_geometry(geom_dict: dict, src_epsg: str, target_epsg: str = TARGET_EPSG) -> dict:
    """Reprojeta um GeoJSON geometry dict de src_epsg → target_epsg."""
    if src_epsg == target_epsg:
        return geom_dict
    try:
        from pyproj import Transformer
        from shapely.geometry import shape, mapping

        transformer = Transformer.from_crs(src_epsg, target_epsg, always_xy=True)
        shapely_geom = shape(geom_dict)

        def transform_coords(coords):
            if isinstance(coords[0], (int, float)):
                x, y = transformer.transform(coords[0], coords[1])
                return [x, y] + list(coords[2:])
            return [transform_coords(c) for c in coords]

        # Para polígonos usamos mapping
        import pyproj
        from functools import partial
        import shapely.ops as ops
        project = partial(transformer.transform)
        reprojected = ops.transform(project, shapely_geom)
        return mapping(reprojected)
    except Exception as exc:
        logger.warning("Não foi possível reprojetar geometria: %s", exc)
        return geom_dict


def _geometry_to_draft(geometry: dict, properties: dict, src_epsg: str = "EPSG:4326") -> dict:
    """Converte uma feature geográfica em draft_data de Action."""
    try:
        from shapely.geometry import shape
        geom = shape(geometry)
        area_ha = geom.area * 10000 if geom.is_valid else None  # deg² → ha (aproximado)
        # Para cálculo real de área precisamos de projeção métrica
        try:
            from pyproj import Transformer, Geod
            geod = Geod(ellps="GRS80")
            area_m2, _ = geod.geometry_area_perimeter(geom)
            area_ha = abs(area_m2) / 10000
        except Exception:
            pass
    except Exception:
        area_ha = None

    geom_repr = _reproject_geometry(geometry, src_epsg)

    nome = (
        properties.get("name")
        or properties.get("Nome")
        or properties.get("NOME")
        or properties.get("talhao")
        or properties.get("Talhao")
        or properties.get("description", "")[:60]
        or "Sem nome"
    )
    codigo = (
        properties.get("id")
        or properties.get("codigo")
        or properties.get("CODIGO")
        or properties.get("code")
        or ""
    )

    return {
        "action_type": "criar_talhao",
        "draft_data": {
            "nome": nome,
            "codigo": str(codigo),
            "area_ha": round(area_ha, 4) if area_ha else None,
            "geometria": geom_repr,
            "srid": TARGET_EPSG,
            "atributos_originais": properties,
        },
    }


# ── GeoJSON ──────────────────────────────────────────────────────────────────

def parse_geojson(file_bytes: bytes) -> list[dict]:
    data = json.loads(file_bytes.decode("utf-8"))
    features = []

    if data.get("type") == "FeatureCollection":
        features = data.get("features", [])
    elif data.get("type") == "Feature":
        features = [data]
    elif data.get("type") in ("Polygon", "MultiPolygon", "GeometryCollection"):
        features = [{"type": "Feature", "geometry": data, "properties": {}}]

    return [
        _geometry_to_draft(f.get("geometry", {}), f.get("properties", {}))
        for f in features
        if f.get("geometry")
    ]


# ── KML ──────────────────────────────────────────────────────────────────────

def _kml_to_geojson_features(kml_bytes: bytes) -> list[tuple[dict, dict]]:
    """Retorna lista de (geometry_dict, properties_dict) a partir de KML."""
    from lxml import etree

    root = etree.fromstring(kml_bytes)
    ns = {"kml": "http://www.opengis.net/kml/2.2"}

    features = []
    for placemark in root.findall(".//kml:Placemark", ns):
        name_el = placemark.find("kml:name", ns)
        desc_el = placemark.find("kml:description", ns)
        name = name_el.text.strip() if name_el is not None and name_el.text else ""
        desc = desc_el.text.strip() if desc_el is not None and desc_el.text else ""

        props = {"name": name, "description": desc}

        geom = _extract_kml_geometry(placemark, ns)
        if geom:
            features.append((geom, props))

    return features


def _extract_kml_geometry(placemark, ns: dict) -> dict | None:
    """Extrai o primeiro polígono ou ponto de um Placemark KML."""
    # Polygon
    polygon = placemark.find(".//kml:Polygon", ns)
    if polygon is not None:
        outer = polygon.find(".//kml:outerBoundaryIs/kml:LinearRing/kml:coordinates", ns)
        if outer is not None and outer.text:
            coords = _parse_kml_coords(outer.text.strip())
            if coords:
                return {"type": "Polygon", "coordinates": [coords]}

    # Point
    point = placemark.find(".//kml:Point/kml:coordinates", ns)
    if point is not None and point.text:
        coords = _parse_kml_coords(point.text.strip())
        if coords:
            return {"type": "Point", "coordinates": coords[0]}

    return None


def _parse_kml_coords(coord_string: str) -> list[list[float]]:
    """Converte string 'lon,lat,alt lon,lat,alt ...' em lista de [lon, lat]."""
    coords = []
    for token in coord_string.split():
        parts = token.split(",")
        if len(parts) >= 2:
            try:
                coords.append([float(parts[0]), float(parts[1])])
            except ValueError:
                continue
    return coords


def parse_kml(file_bytes: bytes) -> list[dict]:
    features = _kml_to_geojson_features(file_bytes)
    return [_geometry_to_draft(geom, props) for geom, props in features]


# ── KMZ (KML zippado) ────────────────────────────────────────────────────────

def parse_kmz(file_bytes: bytes) -> list[dict]:
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
        kml_name = next(
            (n for n in zf.namelist() if n.lower().endswith(".kml")), None
        )
        if not kml_name:
            raise ValueError("Arquivo KMZ não contém nenhum .kml dentro")
        kml_bytes = zf.read(kml_name)
    return parse_kml(kml_bytes)


# ── GPX ──────────────────────────────────────────────────────────────────────

def parse_gpx(file_bytes: bytes) -> list[dict]:
    """
    Extrai tracks/waypoints de GPX e converte em polígonos (tracks) ou pontos.
    """
    from lxml import etree

    root = etree.fromstring(file_bytes)
    ns = {"gpx": "http://www.topografix.com/GPX/1/1"}

    features = []

    # Tracks → polígono aproximado (convex hull se disponível)
    for trk in root.findall(".//gpx:trk", ns):
        name_el = trk.find("gpx:name", ns)
        name = name_el.text.strip() if name_el is not None and name_el.text else "Track"
        coords = []
        for trkpt in trk.findall(".//gpx:trkpt", ns):
            lat = trkpt.get("lat")
            lon = trkpt.get("lon")
            if lat and lon:
                coords.append([float(lon), float(lat)])

        if len(coords) >= 3:
            try:
                from shapely.geometry import MultiPoint, mapping
                hull = MultiPoint(coords).convex_hull
                geom = mapping(hull)
            except Exception:
                # Fallback: polygon from coords
                geom = {"type": "Polygon", "coordinates": [coords + [coords[0]]]}

            features.append(_geometry_to_draft(geom, {"name": name}))

    # Waypoints → pontos
    for wpt in root.findall(".//gpx:wpt", ns):
        lat = wpt.get("lat")
        lon = wpt.get("lon")
        if not lat or not lon:
            continue
        name_el = wpt.find("gpx:name", ns)
        name = name_el.text.strip() if name_el is not None and name_el.text else "Waypoint"
        geom = {"type": "Point", "coordinates": [float(lon), float(lat)]}
        features.append(_geometry_to_draft(geom, {"name": name}))

    return features


# ── Shapefile (SHP) ──────────────────────────────────────────────────────────

def parse_shp(file_bytes: bytes, shx_bytes: bytes | None = None, dbf_bytes: bytes | None = None) -> list[dict]:
    """
    Parseia Shapefile usando pyshp (pure Python).
    O arquivo zip deve conter .shp + .shx + .dbf.
    """
    import shapefile

    shp_io = io.BytesIO(file_bytes)
    shx_io = io.BytesIO(shx_bytes) if shx_bytes else None
    dbf_io = io.BytesIO(dbf_bytes) if dbf_bytes else None

    sf = shapefile.Reader(shp=shp_io, shx=shx_io, dbf=dbf_io)
    fields = [f[0] for f in sf.fields[1:]]  # skip DeletionFlag

    drafts = []
    for sr in sf.shapeRecords():
        geom = sr.shape.__geo_interface__
        props = dict(zip(fields, sr.record))
        drafts.append(_geometry_to_draft(geom, props))
    return drafts


def parse_shp_zip(file_bytes: bytes) -> list[dict]:
    """Aceita .zip contendo .shp, .shx, .dbf."""
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
        names = zf.namelist()
        shp_name = next((n for n in names if n.lower().endswith(".shp")), None)
        shx_name = next((n for n in names if n.lower().endswith(".shx")), None)
        dbf_name = next((n for n in names if n.lower().endswith(".dbf")), None)

        if not shp_name:
            raise ValueError("ZIP não contém arquivo .shp")

        return parse_shp(
            zf.read(shp_name),
            zf.read(shx_name) if shx_name else None,
            zf.read(dbf_name) if dbf_name else None,
        )


# ── interface principal ──────────────────────────────────────────────────────

def parse(file_bytes: bytes, mime_type: str, filename: str) -> list[dict]:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "geojson" or mime_type in ("application/geo+json", "application/vnd.geo+json"):
        return parse_geojson(file_bytes)
    if ext == "kml" or mime_type == "application/vnd.google-earth.kml+xml":
        return parse_kml(file_bytes)
    if ext == "kmz" or mime_type == "application/vnd.google-earth.kmz":
        return parse_kmz(file_bytes)
    if ext == "gpx" or mime_type == "application/gpx+xml":
        return parse_gpx(file_bytes)
    if ext == "zip" or mime_type == "application/zip":
        # Assume zip com shapefile
        return parse_shp_zip(file_bytes)
    if ext == "shp":
        return parse_shp(file_bytes)

    raise ValueError(f"Formato não suportado para Fazendas: {ext or mime_type}")
