-- Script roda auto na init DB via volume mount
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Tabela de teste para seed
CREATE TABLE IF NOT EXISTS test_gis (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    geom GEOMETRY(POINT, 4326)
);

-- Insert ponto teste (ex.: localização fazenda São Paulo)
INSERT INTO test_gis (name, geom) VALUES ('Fazenda Teste', ST_Point(-46.6333, -23.5505)) ON CONFLICT DO NOTHING;

-- Query teste (não roda aqui, mas confirma)
SELECT name, ST_AsText(geom) FROM test_gis;