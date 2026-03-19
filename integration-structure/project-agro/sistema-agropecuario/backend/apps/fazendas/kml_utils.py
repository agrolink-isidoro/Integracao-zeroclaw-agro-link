"""
Shared KML processing utilities for Area and Talhao serializers.

Extracts polygon geometries from KML files and combines multiple
Placemarks into a single MULTIPOLYGON WKT using GEOSGeometry
for robust parsing (instead of brittle string manipulation).
"""
import logging
import math
import os
import tempfile

from django.contrib.gis.gdal import DataSource
from django.contrib.gis.geos import GEOSGeometry
from rest_framework import serializers

logger = logging.getLogger(__name__)


def process_kml_file(kml_file, entity_label="entidade"):
    """
    Process a KML upload and return a WKT geometry string.

    Supports single and multi-Placemark KML files.  When multiple
    polygon geometries are found they are merged into a single
    MULTIPOLYGON using GEOSGeometry.union().

    Args:
        kml_file: Django UploadedFile (or file-like with .chunks()).
        entity_label: Label used in log messages (e.g. "Área", "Talhão").

    Returns:
        str: WKT geometry string.

    Raises:
        serializers.ValidationError on missing/invalid geometry.
    """
    if hasattr(kml_file, 'seek'):
        kml_file.seek(0)

    with tempfile.NamedTemporaryFile(delete=False, suffix='.kml', mode='wb') as tmp:
        for chunk in kml_file.chunks():
            tmp.write(chunk)
        tmp_path = tmp.name

    try:
        logger.info("Processando KML de %s: %s", entity_label, tmp_path)
        ds = DataSource(tmp_path)

        # Collect all geometries from the KML
        geos_geoms = []
        for layer in ds:
            for feature in layer:
                try:
                    geom = feature.geom
                except Exception:
                    # GDALException for features without geometry
                    continue
                if geom:
                    geom_type = geom.geom_type
                    logger.info("Geometria extraída: %s", geom_type)
                    try:
                        geos_obj = GEOSGeometry(geom.wkt, srid=4326)
                    except Exception as exc:
                        logger.warning(
                            "Ignorando geometria inválida (%s): %s", geom_type, exc
                        )
                        continue
                    # Keep only polygon-like geometries
                    if geos_obj.geom_type in ('Polygon', 'MultiPolygon'):
                        geos_geoms.append(geos_obj)

        if not geos_geoms:
            raise serializers.ValidationError(
                "Nenhuma geometria poligonal encontrada no arquivo KML"
            )

        # Single geometry — return as-is (backwards compat)
        if len(geos_geoms) == 1:
            return geos_geoms[0].wkt

        # Multiple geometries — union into a single MULTIPOLYGON
        combined = geos_geoms[0]
        for g in geos_geoms[1:]:
            combined = combined.union(g)

        # Ensure result is MultiPolygon
        if combined.geom_type == 'Polygon':
            from django.contrib.gis.geos import MultiPolygon
            combined = MultiPolygon(combined)

        logger.info(
            "Múltiplas geometrias combinadas em %s (%d features)",
            combined.geom_type, len(geos_geoms),
        )
        return combined.wkt
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def create_approximate_geometry_from_hectares(hectares):
    """
    Build an approximate square POLYGON WKT from a hectare value.

    The polygon is centred at (0, 0) — intended as a placeholder
    that the user can later adjust.
    """
    area_m2 = float(hectares) * 10000
    lado_m = math.sqrt(area_m2)
    lado_graus = lado_m / 111320  # rough metres→degrees at equator

    x_min, y_min = -lado_graus / 2, -lado_graus / 2
    x_max, y_max = lado_graus / 2, lado_graus / 2

    return (
        f"POLYGON(({x_min} {y_min}, {x_max} {y_min}, "
        f"{x_max} {y_max}, {x_min} {y_max}, {x_min} {y_min}))"
    )
